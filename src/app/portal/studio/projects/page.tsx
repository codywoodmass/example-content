'use client'
import StudioSidebar from '../StudioSidebar'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { xeroAuthedFetch } from '@/lib/xeroClient'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'
import { formatTime12 } from '@/lib/time'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('en-NZ', { weekday: 'long' })
  const date = d.getDate()
  const suffix = date === 1 || date === 21 || date === 31 ? 'st' : date === 2 || date === 22 ? 'nd' : date === 3 || date === 23 ? 'rd' : 'th'
  const month = d.toLocaleDateString('en-NZ', { month: 'long' })
  const year = d.getFullYear()
  return `${day} ${date}${suffix} ${month} ${year}`
}

type ShootDate = { id: string; date: string; start_time: string; end_time: string; notes: string }

function briefTemplate(title: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const section = (heading: string, tag: 'p' | 'li', hint: string) =>
    `<h2>${heading}</h2><${tag === 'p' ? 'p' : 'ul><li'} data-placeholder="${esc(hint)}"></${tag === 'p' ? 'p' : 'li></ul'}><hr/>`
  return (
    `<h1>${esc(title)}</h1>` +
    section('Project Overview', 'p', "What's the story behind this shoot, and what outcome are we aiming for?") +
    section('Creative Direction', 'p', 'Describe the visual style, mood, pacing and tone we’re going for...') +
    section('Key Messages', 'li', "What's the single most important thing viewers should take away?") +
    section('Target Audience', 'p', 'Who is this content for, and what do they care about?') +
    section('Audio / Music', 'p', 'Voiceover, music style or reference tracks, or silence?') +
    section('Deliverables', 'li', 'List each deliverable with its format and length...') +
    `<h2>Additional Notes</h2><p data-placeholder="Anything else the team needs to know..."></p>`
  )
}

const STAGES =['Enquiry', 'Pre-Production', 'Shooting', 'Post-Production', 'Revisions', 'Awaiting Confirmation']

// Mirrors the client-facing property packages in portal/client/page.tsx so a manually
// added property job records the same package name + price the client would pick.
const PROPERTY_PACKAGES = [
  { name: 'Content Campaign Package', price: 890 },
  { name: 'The Walkthrough Package', price: 890 },
  { name: 'Lifestyle and Living Package', price: 1280 },
  { name: 'Media Release Package', price: 2480 },
]

const STAGE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'Enquiry': { color: 'rgba(200,194,187,0.55)', bg: 'rgba(200,194,187,0.06)', border: 'rgba(200,194,187,0.15)' },
  'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)', border: 'rgba(100,150,220,0.25)' },
  'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)', border: 'rgba(210,175,80,0.25)' },
  'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)', border: 'rgba(160,100,220,0.25)' },
  'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)', border: 'rgba(220,120,60,0.25)' },
  'Awaiting Confirmation': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)', border: 'rgba(100,200,130,0.25)' },
}

type Project = {
  id: string
  created_at: string
  title: string
  client: string
  contact: string
  email: string
  category: string
  address: string
  stage: string
  shoot_date: string
  shoot_dates: ShootDate[]
  draft_due: string
  brief_due: string
  delivery_due: string
  drive_url: string
  progress: number
  from_booking: boolean
  general_notes: string
  studio_brief: string
  editor_notes: string
  archived: boolean
  deliverables: string
  reference_url: string
  supplied_info: string
  shoot_window_start: string
  shoot_window_end: string
  form_booking: boolean
  calendar_event_id: string
  notes: string
  client_confirmed: boolean
  confirmed_at: string | null
  amount: number | null
  invoice_id: string | null
  attachment_urls: { name: string; url: string; size: number }[]
  archived_at: string | null
}

function attachmentIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return '🖼️'
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return '🎬'
  if (ext === 'pdf') return '📄'
  if (['doc', 'docx'].includes(ext)) return '📝'
  return '📎'
}

function ProjectsPageInner() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showNewModal, setShowNewModal] = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [dragId, setDragId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [modalProject, setModalProject] = useState<Project | null>(null)
  const [modalEditing, setModalEditing] = useState(false)
  const [modalTab, setModalTab] = useState<'overview' | 'notes' | 'brief'>('overview')
  useEffect(() => { setModalTab('overview') }, [modalProject?.id])
  const [modalSaving, setModalSaving] = useState(false)
  const [modalSaved, setModalSaved] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState<any>(null)
  const [calendarSyncTimer, setCalendarSyncTimer] = useState<any>(null)

  // Keeps the Google Calendar event in step whenever the shoot date or time is
  // edited — only once a project actually has a synced event, or is past Enquiry
  // (see createCalendarEventForProject), so this stays quiet for tentative enquiries.
  function triggerCalendarSync(updatedProject: Project) {
    if (calendarSyncTimer) clearTimeout(calendarSyncTimer)
    const timer = setTimeout(() => {
      if (!updatedProject.shoot_date || !updatedProject.shoot_window_start || !updatedProject.shoot_window_end) return
      if (updatedProject.stage === 'Enquiry' && !updatedProject.calendar_event_id) return
      createCalendarEventForProject(updatedProject)
    }, 1000)
    setCalendarSyncTimer(timer)
  }

  function triggerAutoSave(updatedProject: any) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    const timer = setTimeout(async () => {
      if (!updatedProject) return
      await supabase.from('projects1').update({
        title: updatedProject.title, client: updatedProject.client, email: updatedProject.email,
        category: updatedProject.category, address: updatedProject.address, stage: updatedProject.stage,
        shoot_date: updatedProject.shoot_date || null, draft_due: updatedProject.draft_due || null,
        delivery_due: updatedProject.delivery_due || null, drive_url: updatedProject.drive_url,
        shoot_window_start: updatedProject.shoot_window_start || null, shoot_window_end: updatedProject.shoot_window_end || null,
        progress: updatedProject.progress, editor_notes: updatedProject.editor_notes,
        amount: updatedProject.amount === '' ? null : updatedProject.amount,
      }).eq('id', updatedProject.id)
      setProjects(p => p.map(proj => proj.id === updatedProject.id ? { ...proj, ...updatedProject } : proj))
      setModalSaved(true)
      setTimeout(() => setModalSaved(false), 2000)
    }, 1000)
    setAutoSaveTimer(timer)
  }

  // Additional shoot dates — for the uncommon project shot across multiple days/months.
  // The single `shoot_date` field stays the primary/first date; these are extras.
  async function persistShootDates(projectId: string, dates: ShootDate[]) {
    const { error } = await supabase.from('projects1').update({ shoot_dates: dates }).eq('id', projectId)
    if (error) { notify('Error saving shoot date: ' + error.message, 'error'); return }
    setProjects(p => p.map(proj => proj.id === projectId ? { ...proj, shoot_dates: dates } : proj))
  }
  function addShootDate() {
    setModalProject(p => {
      if (!p) return p
      const dates = [...(p.shoot_dates || []), { id: Date.now().toString(), date: '', start_time: '', end_time: '', notes: '' }]
      const u = { ...p, shoot_dates: dates }
      persistShootDates(p.id, dates)
      return u
    })
  }
  function updateShootDate(id: string, field: keyof ShootDate, value: string) {
    setModalProject(p => {
      if (!p) return p
      const dates = (p.shoot_dates || []).map(d => d.id === id ? { ...d, [field]: value } : d)
      const u = { ...p, shoot_dates: dates }
      persistShootDates(p.id, dates)
      return u
    })
  }
  function removeShootDate(id: string) {
    setModalProject(p => {
      if (!p) return p
      const dates = (p.shoot_dates || []).filter(d => d.id !== id)
      const u = { ...p, shoot_dates: dates }
      persistShootDates(p.id, dates)
      return u
    })
  }

  const [modalFullscreen, setModalFullscreen] = useState(false)
  const [projectFeedback, setProjectFeedback] = useState<any[]>([])

  useEffect(() => {
    if (!modalProject?.id) { setProjectFeedback([]); return }
    supabase.from('video_feedback').select('*').eq('project_id', modalProject.id).order('created_at', { ascending: false })
      .then(({ data }) => setProjectFeedback(data || []))
  }, [modalProject?.id])

  async function resolveFeedback(id: string) {
    await supabase.from('video_feedback').update({ status: 'resolved' }).eq('id', id)
    setProjectFeedback(p => p.map(f => f.id === id ? { ...f, status: 'resolved' } : f))
  }

  function formatFeedbackTimestamp(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }
  const [creatingFolder, setCreatingFolder] = useState(false)

  async function createProjectFolder(proj: Project) {
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/drive/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: proj.category, client: proj.client, projectTitle: proj.title }),
      })
      const data = await res.json()
      if (data.url) {
        await supabase.from('projects1').update({ drive_url: data.url }).eq('id', proj.id)
        setModalProject(p => p ? { ...p, drive_url: data.url } : p)
        setProjects(p => p.map(pr => pr.id === proj.id ? { ...pr, drive_url: data.url } : pr))
      } else if (data.error === 'Not authenticated') {
        const authRes = await fetch('/api/calendar?action=auth_url')
        const { url } = await authRes.json()
        window.open(url, '_blank', 'width=500,height=600')
        function onFocus() {
          window.removeEventListener('focus', onFocus)
          createProjectFolder(proj)
        }
        window.addEventListener('focus', onFocus)
      } else {
        notify('Drive error: ' + data.error, 'error')
      }
    } catch (e) {
      console.error(e)
    }
    setCreatingFolder(false)
  }

  const [briefDocContent, setBriefDocContent] = useState('')
  const briefEditorRef = useRef<HTMLDivElement>(null)
  const briefContentRef = useRef('') // always holds the latest edited HTML, for the flush-on-leave below (state/refs tied to the editor's DOM node go stale/null once the tab unmounts)
  const briefSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [briefSaving, setBriefSaving] = useState(false)
  const [briefSaved, setBriefSaved] = useState(false)

  function autoSaveBrief(html: string, projectId: string) {
    if (briefSaveTimerRef.current) clearTimeout(briefSaveTimerRef.current)
    setBriefSaving(true)
    briefSaveTimerRef.current = setTimeout(async () => {
      await supabase.from('projects1').update({ studio_brief: html }).eq('id', projectId)
      setModalProject(p => p ? { ...p, studio_brief: html } : p)
      setProjects(ps => ps.map(pr => pr.id === projectId ? { ...pr, studio_brief: html } : pr))
      briefSaveTimerRef.current = null
      setBriefSaving(false)
      setBriefSaved(true)
      setTimeout(() => setBriefSaved(false), 2000)
    }, 800)
  }

  // Loads the brief into the editor when its tab becomes active, and flushes
  // any not-yet-autosaved edit when leaving the tab or switching projects —
  // otherwise up to 800ms of typing could be lost on a fast tab switch.
  useEffect(() => {
    if (modalTab === 'brief' && modalProject && briefEditorRef.current) {
      const content = modalProject.studio_brief && modalProject.studio_brief.startsWith('<') ? modalProject.studio_brief : briefTemplate(modalProject.title)
      setBriefDocContent(content)
      briefContentRef.current = content
      briefEditorRef.current.innerHTML = content
      briefEditorRef.current.focus()
    }
    const projectId = modalProject?.id
    return () => {
      if (briefSaveTimerRef.current && projectId) {
        clearTimeout(briefSaveTimerRef.current)
        briefSaveTimerRef.current = null
        const html = briefContentRef.current
        supabase.from('projects1').update({ studio_brief: html }).eq('id', projectId)
        setProjects(ps => ps.map(pr => pr.id === projectId ? { ...pr, studio_brief: html } : pr))
      }
    }
  }, [modalTab, modalProject?.id])
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefGenerated, setBriefGenerated] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [hideUnconfirmed, setHideUnconfirmed] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [groupByStage, setGroupByStage] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingInvoice, setSendingInvoice] = useState(false)

  const [newForm, setNewForm] = useState({
    title: '', client: '', contact: '', email: '',
    category: 'Property', stage: 'Enquiry',
    brief_due: '', shoot_window_start: '', shoot_window_end: '',
    shoot_date: '', draft_due: '', delivery_due: '',
    address: '', reference_url: '', supplied_info: '', shoot_package: ''
  })

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    const { data, error } = await supabase.from('projects1').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      setProjects(data)
      const openId = searchParams.get('open')
      if (openId) {
        const proj = data.find((p: Project) => p.id === openId)
        if (proj) { setModalProject(proj); setModalEditing(false) }
      }
    }
    setLoading(false)
  }

  const STAGE_PROGRESS: Record<string, number> = {
    'Enquiry': 0,
    'Pre-Production': 10,
    'Shooting': 35,
    'Post-Production': 65,
    'Revisions': 85,
    'Awaiting Confirmation': 100,
  }

  function stageForProgress(val: number): string {
    return val >= 100 ? 'Awaiting Confirmation' : val >= 85 ? 'Revisions' : val >= 65 ? 'Post-Production' : val >= 35 ? 'Shooting' : val >= 10 ? 'Pre-Production' : 'Enquiry'
  }

  async function moveProject(id: string, stage: string) {
    const progress = STAGE_PROGRESS[stage]
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, stage, progress } : proj))
    setModalProject(mp => mp && mp.id === id ? { ...mp, stage, progress } : mp)
    await supabase.from('projects1').update({ stage, progress }).eq('id', id)
  }

  function startProgressDrag(e: React.MouseEvent<HTMLDivElement>, project: Project) {
    e.stopPropagation()
    e.preventDefault()
    const track = e.currentTarget
    let latestPct = project.progress
    function pctFromEvent(clientX: number) {
      const rect = track.getBoundingClientRect()
      return Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)))
    }
    function apply(pct: number) {
      latestPct = pct
      const stage = stageForProgress(pct)
      setProjects(p => p.map(pr => pr.id === project.id ? { ...pr, progress: pct, stage } : pr))
      setModalProject(mp => mp && mp.id === project.id ? { ...mp, progress: pct, stage } : mp)
    }
    apply(pctFromEvent(e.clientX))
    function onMove(ev: MouseEvent) { apply(pctFromEvent(ev.clientX)) }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      supabase.from('projects1').update({ progress: latestPct, stage: stageForProgress(latestPct) }).eq('id', project.id)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  async function saveModalProject() {
    if (!modalProject) return
    setModalSaving(true)
    const { error } = await supabase.from('projects1').update({
      title: modalProject.title,
      client: modalProject.client,
      email: modalProject.email,
      category: modalProject.category,
      address: modalProject.address,
      stage: modalProject.stage,
      shoot_date: modalProject.shoot_date || null,
      draft_due: modalProject.draft_due || null,
      delivery_due: modalProject.delivery_due || null,
      shoot_window_start: modalProject.shoot_window_start || null,
      shoot_window_end: modalProject.shoot_window_end || null,
      drive_url: modalProject.drive_url,
      progress: modalProject.progress,
      amount: modalProject.amount === null || (modalProject.amount as any) === '' ? null : modalProject.amount,
    }).eq('id', modalProject.id)
    if (!error) {
      setProjects(p => p.map(proj => proj.id === modalProject.id ? { ...proj, ...modalProject } : proj))
      setModalSaved(true)
      setTimeout(() => setModalSaved(false), 2000)
    }
    setModalSaving(false)
  }

  async function generateProjectBrief(project: Project) {
    if (!project.address) return
    setBriefLoading(true)
    setBriefGenerated(false)
    try {
      const res = await fetch('/api/property-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: project.address, propertyType: 'Luxury residential', shootDate: project.shoot_date }),
      })
      const data = await res.json()
      if (!data.error) {
        await supabase.from('property_briefs').insert([{
          project_id: project.id,
          address: project.address,
          property_data: data.property,
          weather: data.weather,
          mapbox_image_url: data.mapboxImageUrl,
          shoot_date: project.shoot_date,
        }])
        setBriefGenerated(true)
        setTimeout(() => setBriefGenerated(false), 3000)
      }
    } catch (e) { console.error(e) }
    setBriefLoading(false)
  }


  async function deliverProject(project: Project) {
    if (!project.drive_url) return
    if (!(await confirmDialog('Mark this project as delivered and notify the client?'))) return
    
    // Update project stage to Awaiting Confirmation and progress to 100
    await supabase.from('projects1').update({
      stage: 'Awaiting Confirmation',
      progress: 100,
    }).eq('id', project.id)

    // Notify the client — in-portal notification + email, both handled server-side
    try {
      await fetch('/api/notify-content-delivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectTitle: project.title || project.address,
          clientName: project.client,
          clientEmail: project.email,
        }),
      })
    } catch (e) { console.error('notify-content-delivered error:', e) }

    // A redelivery is the studio's own signal that requested changes have been
    // made — close out any pending revision requests for this project rather
    // than requiring a separate manual "mark resolved" per item first.
    await supabase.from('video_feedback').update({ status: 'resolved' }).eq('project_id', project.id).eq('status', 'pending')
    setProjectFeedback(p => p.map(f => f.status === 'pending' ? { ...f, status: 'resolved' } : f))

    // Update local state
    setModalProject(p => p ? { ...p, stage: 'Awaiting Confirmation', progress: 100 } : p)
    setProjects(p => p.map(proj => proj.id === project.id ? { ...proj, stage: 'Awaiting Confirmation', progress: 100 } : proj))
    setModalSaved(true)
    setTimeout(() => setModalSaved(false), 2000)

    // Auto-add this project to the client's open draft invoice (or start one) the
    // moment it's delivered, rather than waiting on a separate manual step — the
    // studio only needs to review and send the drafts at the end of the month.
    if (project.amount && !project.invoice_id) sendToInvoice(project)
  }

  async function deleteProject(project: Project) {
    const isFromBooking = project.from_booking
    const msg = isFromBooking
      ? 'This project was created from a client booking. Deleting it will remove it from your system but will NOT automatically remove any Google Calendar events. Are you sure you want to delete this project?'
      : 'Are you sure you want to permanently delete this project? This cannot be undone.'
    if (!(await confirmDialog(msg))) return
    await supabase.from('projects1').delete().eq('id', project.id)
    setProjects(p => p.filter(proj => proj.id !== project.id))
    setModalProject(null)
  }

  async function archiveProject(id: string, archived: boolean) {
    // archived_at drives the 30-day attachment cleanup — cleared on unarchive
    // so a project pulled back out of the archive isn't still on that clock.
    const archived_at = archived ? new Date().toISOString() : null
    await supabase.from('projects1').update({ archived, archived_at }).eq('id', id)
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, archived, archived_at } : proj))
    setModalProject(null)
  }

  async function markConfirmed(project: Project) {
    const confirmed_at = new Date().toISOString()
    const advancingFromEnquiry = project.stage === 'Enquiry'
    const update: Partial<Project> = { client_confirmed: true, confirmed_at }
    if (advancingFromEnquiry) { update.stage = 'Pre-Production'; update.progress = STAGE_PROGRESS['Pre-Production'] }
    await supabase.from('projects1').update(update).eq('id', project.id)
    setProjects(p => p.map(proj => proj.id === project.id ? { ...proj, ...update } : proj))
    setModalProject(p => p && p.id === project.id ? { ...p, ...update } : p)
    createCalendarEventForProject({ ...project, ...update })
  }

  // Puts a manually-added project's shoot on the studio's Google Calendar once it's
  // confirmed, mirroring the event created for confirmed client bookings.
  async function createCalendarEventForProject(project: Project) {
    if (!project.shoot_date || !project.shoot_window_start || !project.shoot_window_end) {
      notify('Add a shoot date and time to this project to also put it on Google Calendar.', 'info')
      return
    }
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Example Content — ${project.title || project.address || 'Shoot'}`,
          date: project.shoot_date,
          startTime: project.shoot_window_start,
          endTime: project.shoot_window_end,
          clientEmail: project.email,
          location: project.address || '',
          description: `Confirmed shoot for ${project.client || project.email}${project.deliverables ? '\n' + project.deliverables : ''}`,
          eventId: project.calendar_event_id || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        notify(project.calendar_event_id ? 'Google Calendar event updated' : 'Shoot added to Google Calendar', 'success')
        if (data.eventId && data.eventId !== project.calendar_event_id) {
          await supabase.from('projects1').update({ calendar_event_id: data.eventId }).eq('id', project.id)
          setProjects(p => p.map(proj => proj.id === project.id ? { ...proj, calendar_event_id: data.eventId } : proj))
          setModalProject(p => p && p.id === project.id ? { ...p, calendar_event_id: data.eventId } : p)
        }
      } else if (data.error === 'Not authenticated') {
        const authRes = await fetch('/api/calendar?action=auth_url')
        const { url } = await authRes.json()
        window.open(url, '_blank', 'width=500,height=600')
        function onFocus() {
          window.removeEventListener('focus', onFocus)
          createCalendarEventForProject(project)
        }
        window.addEventListener('focus', onFocus)
      } else {
        notify('Calendar error: ' + data.error, 'error')
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function sendToInvoice(project: Project) {
    if (!project.amount) { notify('Set an amount for this project before sending it to invoice.', 'error'); return }
    setSendingInvoice(true)
    try {
      let { data: invoice } = await supabase.from('invoices1').select('*').eq('client_email', project.email).eq('status', 'draft').maybeSingle()
      if (!invoice) {
        const { data: created, error: createError } = await supabase.from('invoices1').insert([{
          client_email: project.email, client_name: project.client, status: 'draft',
        }]).select().single()
        if (createError || !created) { notify('Invoice error: ' + (createError?.message || 'unknown'), 'error'); return }
        invoice = created
      }
      // Attach only this project as a new line — not every uninvoiced project this
      // client has ever had, just this one plus whatever the draft already holds
      // from earlier deliveries this cycle, so completing one project doesn't sweep
      // in unrelated older ones that were never invoiced for some other reason.
      await supabase.from('projects1').update({ invoice_id: invoice.id }).eq('id', project.id)
      const { data: existingLines } = await supabase.from('projects1').select('amount').eq('invoice_id', invoice.id)
      const subtotal = (existingLines || []).reduce((sum, r) => sum + (r.amount || 0), 0)
      const gst = Math.round(subtotal * 0.15 * 100) / 100
      const total = subtotal + gst
      await supabase.from('invoices1').update({ subtotal, gst, total }).eq('id', invoice.id)
      setProjects(p => p.map(proj => proj.id === project.id ? { ...proj, invoice_id: invoice.id } : proj))
      setModalProject(p => p && p.id === project.id ? { ...p, invoice_id: invoice.id } : p)
      try {
        const res = await xeroAuthedFetch('/api/xero/invoice', { method: 'POST', body: JSON.stringify({ invoiceId: invoice.id }) })
        const xeroData = await res.json()
        if (!res.ok && xeroData.error !== 'Xero is not connected') notify('Xero sync failed: ' + xeroData.error, 'error')
      } catch (e) { console.warn('Xero sync error:', e) }
    } finally {
      setSendingInvoice(false)
    }
  }

  async function addProject() {
    if (!newForm.title || !newForm.client) return
    setSaving(true)
    const { shoot_package, ...formRest } = newForm
    const selectedPackage = PROPERTY_PACKAGES.find(p => p.name === shoot_package)
    const { data, error } = await supabase.from('projects1').insert([{
      ...formRest,
      brief_due: null,
      shoot_window_start: newForm.shoot_window_start || null,
      shoot_window_end: newForm.shoot_window_end || null,
      shoot_date: newForm.shoot_date || null,
      draft_due: newForm.draft_due || null,
      delivery_due: newForm.delivery_due || null,
      progress: 0,
      from_booking: false,
      general_notes: newForm.brief_due === 'required' ? 'Property brief required\n\n' + (newForm.supplied_info || '') : (newForm.supplied_info || ''),
      editor_notes: '',
      amount: selectedPackage?.price ?? null,
      deliverables: shoot_package ? 'PACKAGE: ' + shoot_package : '',
    }]).select().single()
    if (error) {
      console.error('Insert error:', error)
      notify('Error saving: ' + error.message, 'error')
    }
    if (!error && data) {
      if (newForm.email) {
        await supabase.from('clients1').upsert([{
          email: newForm.email,
          name: newForm.client,
          category: newForm.category,
        }], { onConflict: 'email', ignoreDuplicates: false })
      }
      setProjects(p => [data, ...p])
      setShowNewModal(false)
      setNewForm({ title: '', client: '', contact: '', email: '', category: 'Property', stage: 'Enquiry', brief_due: '', shoot_window_start: '', shoot_window_end: '', shoot_date: '', draft_due: '', delivery_due: '', address: '', reference_url: '', supplied_info: '', shoot_package: '' })
      // A project created directly at a stage past Enquiry is already a confirmed job
      // (no separate "Mark confirmed" step applies to it), so sync its shoot to the
      // calendar immediately rather than waiting on a confirmation that'll never happen.
      if (data.stage !== 'Enquiry' && data.shoot_date && data.shoot_window_start && data.shoot_window_end) createCalendarEventForProject(data)
      router.push(`/portal/studio/projects/${data.id}`)
    }
    setSaving(false)
  }

  const filtered = projects.filter(p => {
    const matchesCat = filterCat === 'All' || p.category === filterCat
    const matchesArchived = showArchived ? p.archived === true : !p.archived
    const matchesConfirmed = hideUnconfirmed ? p.stage !== 'Enquiry' : true
    return matchesCat && matchesArchived && matchesConfirmed
  }).sort((a, b) => {
    if (sortBy === 'shoot_date') return (a.shoot_date || '9999') < (b.shoot_date || '9999') ? -1 : 1
    if (sortBy === 'delivery_due') return (a.delivery_due || '9999') < (b.delivery_due || '9999') ? -1 : 1
    if (sortBy === 'client') return (a.client || '').localeCompare(b.client || '')
    if (sortBy === 'progress') return b.progress - a.progress
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  function StagePill({ stage }: { stage: string }) {
    const c = STAGE_COLORS[stage] || { color: '#C8C2BB', bg: 'rgba(200,194,187,0.1)', border: 'rgba(200,194,187,0.2)' }
    return <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, whiteSpace: 'nowrap' }}>{stage}</span>
  }

  function ProjectsTable({ list }: { list: Project[] }) {
    return (
      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Project', 'Client', 'Category', 'Stage', 'Shoot date', 'Draft due', 'Delivery', 'Progress'].map(h => (
              <th key={h} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', padding: '10px 16px', textAlign: 'left', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontWeight: 400 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {list.map((project, i) => (
              <tr key={project.id} onClick={() => { setModalProject(project); setModalEditing(false) }} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{project.title}</div>
                  {project.from_booking && <span style={{ fontSize: 9, color: 'rgba(100,150,220,0.7)' }}>From booking</span>}
                </td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}>{project.client}</td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}><span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.5)', border: '0.5px solid rgba(200,194,187,0.1)' }}>{project.category}</span></td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}><StagePill stage={project.stage} /></td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.shoot_date)}</td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.draft_due)}</td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.delivery_due)}</td>
                <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div draggable={false} onMouseDown={e => startProgressDrag(e, project)} onClick={e => e.stopPropagation()} style={{ flex: 1, height: 6, background: 'rgba(200,194,187,0.07)', borderRadius: 2, cursor: 'ew-resize' }}>
                      <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2, pointerEvents: 'none' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No projects yet — create one above</td></tr>
            )}
          </tbody>
        </table>
      </div>
    )
  }

  function startCardDrag(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    let dragging = false
    function onMove(ev: MouseEvent) {
      if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) > 6) {
        dragging = true
        setDragId(project.id)
      }
      if (dragging) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
        const col = el?.closest('[data-stage]') as HTMLElement | null
        setDragOverStage(col?.dataset.stage || null)
      }
    }
    function onUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (dragging) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
        const col = el?.closest('[data-stage]') as HTMLElement | null
        const targetStage = col?.dataset.stage
        setDragId(null)
        setDragOverStage(null)
        if (targetStage) moveProject(project.id, targetStage)
      } else {
        setModalProject(project)
        setModalEditing(false)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function ProjectCard({ project }: { project: Project }) {
    return (
      <div
        onMouseDown={e => startCardDrag(e, project)}
        style={{ background: '#1A1F28', border: `0.5px solid ${dragId === project.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '14px 16px', cursor: 'pointer', opacity: dragId === project.id ? 0.5 : 1, transition: 'all 0.15s', userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{project.title}</div>
          {project.from_booking && <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(100,150,220,0.15)', color: 'rgba(100,150,220,0.8)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 2, flexShrink: 0 }}>Booking</span>}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>{project.client}</div>
        <div draggable={false} onMouseDown={e => startProgressDrag(e, project)} onClick={e => e.stopPropagation()} style={{ height: 6, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginBottom: 10, cursor: 'ew-resize' }}>
          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2, pointerEvents: 'none' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)' }}>{project.shoot_date ? formatDate(project.shoot_date) : 'No shoot date'}</span>
          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.4)', border: '0.5px solid rgba(200,194,187,0.1)' }}>{project.category}</span>
        </div>
      </div>
    )
  }
  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading projects...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="projects" />
      <div className="ec-studio-main" style={{ flex: 1, overflowX: 'hidden', minWidth: 0 }}>

      {/* TOPBAR */}
      <div className="ec-toolbar-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Projects</div>
          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{projects.length} projects · {projects.filter(p => p.stage === 'Awaiting Confirmation').length} invoicing</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 12px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
              {['All', 'Property', 'Commercial', 'Events', 'Socials'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button onClick={() => setShowArchived(!showArchived)} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${showArchived ? 'rgba(210,175,80,0.4)' : 'rgba(200,194,187,0.15)'}`, background: showArchived ? 'rgba(210,175,80,0.08)' : 'transparent', color: showArchived ? 'rgba(210,175,80,0.9)' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>📦 Archived</button>
            {!showArchived && (
              <button onClick={() => setHideUnconfirmed(!hideUnconfirmed)} title="Hide unconfirmed enquiries" style={{ fontSize: 11, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${hideUnconfirmed ? 'rgba(100,150,220,0.4)' : 'rgba(200,194,187,0.15)'}`, background: hideUnconfirmed ? 'rgba(100,150,220,0.08)' : 'transparent', color: hideUnconfirmed ? 'rgba(100,150,220,0.9)' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{hideUnconfirmed ? 'Unconfirmed hidden' : 'Hide unconfirmed'}</button>
            )}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 12px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            <option value="created_at">Sort: Recent</option>
            <option value="shoot_date">Sort: Shoot date</option>
            <option value="delivery_due">Sort: Delivery date</option>
            <option value="client">Sort: Client</option>
            <option value="title">Sort: Project name</option>
            <option value="progress">Sort: Progress</option>
          </select>
          {!showArchived && viewMode === 'list' && (
            <button onClick={() => setGroupByStage(!groupByStage)} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${groupByStage ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: groupByStage ? 'rgba(200,194,187,0.08)' : 'transparent', color: groupByStage ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>Group by stage</button>
          )}
          {!showArchived && (
          <div style={{ display: 'flex', background: 'rgba(200,194,187,0.06)', borderRadius: 4, padding: 2 }}>
            {(['kanban', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 3, background: viewMode === mode ? 'rgba(200,194,187,0.12)' : 'transparent', color: viewMode === mode ? '#C8C2BB' : 'rgba(200,194,187,0.35)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{mode === 'kanban' ? '⬛ Kanban' : '☰ List'}</button>
            ))}
          </div>
          )}
          <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
        </div>
      </div>

      {/* ARCHIVED — always a flat list, production stage no longer applies */}
      {showArchived && (
        <div style={{ padding: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Archived projects</div>
          <ProjectsTable list={filtered} />
        </div>
      )}

      {/* KANBAN */}
      {!showArchived && viewMode === 'kanban' && (
        <div className="ec-kanban" style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, height: 'calc(100vh - 57px)', overflow: 'auto' }}>
          {STAGES.map(stage => {
            const stageProjects = filtered.filter(p => p.stage === stage)
            const c = STAGE_COLORS[stage]
            const isOver = dragOverStage === stage
            return (
              <div key={stage} data-stage={stage} style={{ borderRight: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', flexDirection: 'column', background: isOver ? 'rgba(200,194,187,0.03)' : 'transparent', transition: 'background 0.15s', height: '100%' }}>
                <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB' }}>{stage}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', background: 'rgba(200,194,187,0.07)', padding: '2px 7px', borderRadius: 10 }}>{stageProjects.length}</span>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageProjects.map(project => <ProjectCard key={project.id} project={project} />)}
                  {stageProjects.length === 0 && (
                    <div style={{ border: '0.5px dashed rgba(200,194,187,0.1)', borderRadius: 6, padding: '24px 16px', textAlign: 'center', color: 'rgba(200,194,187,0.2)', fontSize: 12 }}>Drop here</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LIST */}
      {!showArchived && viewMode === 'list' && (
        <div style={{ padding: 28 }}>
          {groupByStage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {STAGES.map(stage => {
                const stageProjects = filtered.filter(p => p.stage === stage)
                if (stageProjects.length === 0) return null
                const sc = STAGE_COLORS[stage] || { color: '#C8C2BB', border: 'rgba(200,194,187,0.2)' }
                return (
                  <div key={stage}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: sc.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stage}</span>
                      <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>— {stageProjects.length} project{stageProjects.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ background: '#1A1F28', border: `0.5px solid ${sc.color}33`, borderRadius: 7, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {stageProjects.map((project, i) => (
                            <tr key={project.id} onClick={() => { setModalProject(project); setModalEditing(false) }} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{project.title}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}>{project.client}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.shoot_date)}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.delivery_due)}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div draggable={false} onMouseDown={e => startProgressDrag(e, project)} onClick={e => e.stopPropagation()} style={{ width: 80, height: 6, background: 'rgba(200,194,187,0.07)', borderRadius: 2, cursor: 'ew-resize' }}>
                                    <div style={{ height: '100%', width: `${project.progress}%`, background: '#C8C2BB', opacity: 0.5, borderRadius: 2, pointerEvents: 'none' }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <ProjectsTable list={filtered} />
          )}
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: modalFullscreen ? 'stretch' : 'center', justifyContent: 'center', padding: modalFullscreen ? 0 : 20 }}>
          <div style={{ background: '#1A1F28', border: modalFullscreen ? 'none' : '0.5px solid rgba(200,194,187,0.15)', borderRadius: modalFullscreen ? 0 : 10, padding: 28, width: '100%', maxWidth: modalFullscreen ? '100%' : 720, maxHeight: modalFullscreen ? '100vh' : '90vh', overflowY: 'auto' as const }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>New project</div>
            {/* Category toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['Property', 'Commercial', 'Events', 'Socials'].map(cat => (
                <button key={cat} onClick={() => setNewForm(f => ({ ...f, category: cat, title: cat === 'Property' ? f.address || '' : f.title }))} style={{ fontSize: 11, padding: '7px 14px', borderRadius: 3, border: `0.5px solid ${newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newForm.category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
              ))}
            </div>
            <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {newForm.category === 'Property' ? (
                <>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Property address (used as project name)</label>
                    <input style={inp} value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value, title: e.target.value }))} placeholder="e.g. 14 Clifton Rd, Havelock North" />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Package</label>
                    <select style={inp} value={newForm.shoot_package} onChange={e => setNewForm(f => ({ ...f, shoot_package: e.target.value }))}>
                      <option value="">Select a package...</option>
                      {PROPERTY_PACKAGES.map(pkg => <option key={pkg.name} value={pkg.name}>{pkg.name} — ${pkg.price.toLocaleString()}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Project name</label>
                  <input style={inp} value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Black Barn Brand Film 2026" />
                </div>
              )}
              <div><label style={lbl}>Client</label><input style={inp} value={newForm.client} onChange={e => setNewForm(f => ({ ...f, client: e.target.value }))} placeholder="e.g. Blackwell Properties" /></div>
              <div><label style={lbl}>Contact person</label><input style={inp} value={newForm.contact} onChange={e => setNewForm(f => ({ ...f, contact: e.target.value }))} placeholder="e.g. James Blackwell" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Email</label><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" /></div>
              {newForm.category !== 'Property' && (
                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Shoot location</label><input style={inp} value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Auckland CBD, client studio, outdoor location..." /></div>
              )}
              <div><label style={lbl}>Starting stage</label>
                <select style={inp} value={newForm.stage} onChange={e => setNewForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setNewForm(f => ({ ...f, brief_due: f.brief_due === 'required' ? '' : 'required' }))} style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${newForm.brief_due === 'required' ? 'rgba(100,150,220,0.6)' : 'rgba(200,194,187,0.2)'}`, background: newForm.brief_due === 'required' ? 'rgba(100,150,220,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  {newForm.brief_due === 'required' && <span style={{ fontSize: 10, color: 'rgba(100,150,220,0.9)' }}>✓</span>}
                </div>
                <label style={{ ...lbl, marginBottom: 0, cursor: 'pointer' }} onClick={() => setNewForm(f => ({ ...f, brief_due: f.brief_due === 'required' ? '' : 'required' }))}>Property brief required</label>
              </div>
              <div><label style={lbl}>Requested shoot date</label><input style={inp} type="date" value={newForm.shoot_date} onChange={e => setNewForm(f => ({ ...f, shoot_date: e.target.value }))} min={new Date().toISOString().split('T')[0]} /></div>
              <div><label style={lbl}>Delivery date</label><input style={inp} type="date" value={newForm.delivery_due} onChange={e => setNewForm(f => ({ ...f, delivery_due: e.target.value }))} min={newForm.shoot_date || ''} /></div>
              <div><label style={lbl}>Shoot start time</label><input style={inp} type="time" value={newForm.shoot_window_start} onChange={e => setNewForm(f => ({ ...f, shoot_window_start: e.target.value }))} /></div>
              <div><label style={lbl}>Shoot end time</label><input style={inp} type="time" value={newForm.shoot_window_end} onChange={e => setNewForm(f => ({ ...f, shoot_window_end: e.target.value }))} min={newForm.shoot_window_start || ''} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Reference link (mood board, style guide, etc.)</label><input style={inp} value={newForm.reference_url} onChange={e => setNewForm(f => ({ ...f, reference_url: e.target.value }))} placeholder="https://..." /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Supplied information</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 70 }} value={newForm.supplied_info} onChange={e => setNewForm(f => ({ ...f, supplied_info: e.target.value }))} placeholder="Paste any client-supplied info, brief details, special requirements..." /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addProject} disabled={saving || !newForm.title || !newForm.client} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: saving || !newForm.title || !newForm.client ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: saving || !newForm.title || !newForm.client ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: saving || !newForm.title || !newForm.client ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{saving ? 'Saving...' : 'Create project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT MODAL */}
      {modalProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={async e => { if (e.target === e.currentTarget) { await saveModalProject(); setModalProject(null); setModalEditing(false) } }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', position: 'sticky', top: 0, background: '#1A1F28', zIndex: 1 }}>
              <div style={{ flex: 1, marginRight: 16 }}>
                <input value={modalProject.title} onChange={e => setModalProject(p => { const u = p ? { ...p, title: e.target.value } : p; if (u) triggerAutoSave(u); return u })} placeholder="Project title" style={{ fontSize: 15, fontWeight: 500, color: '#fff', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '5px 8px', outline: 'none', fontFamily: 'inherit', width: '100%' }} />
                {modalProject.category === 'Property' && modalProject.address && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 4 }}>{modalProject.address}</div>}
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{modalProject.client}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {modalSaved && <span style={{ fontSize: 11, color: 'rgba(100,200,130,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Saved</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setModalEditing(e => !e)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: `0.5px solid ${modalEditing ? 'rgba(100,150,220,0.35)' : 'rgba(200,194,187,0.2)'}`, color: modalEditing ? 'rgba(100,150,220,0.9)' : 'rgba(200,194,187,0.4)', background: modalEditing ? 'rgba(100,150,220,0.08)' : 'rgba(200,194,187,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>{modalEditing ? 'Done editing' : 'Edit project'}</button>
                  <button onClick={() => deleteProject(modalProject)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.7)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                  <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {STAGES.map((stage, idx) => {
                    const stageIdx = STAGES.indexOf(modalProject.stage)
                    const isDone = idx < stageIdx; const isCurrent = idx === stageIdx
                    return (
                      <div key={stage} onClick={() => moveProject(modalProject.id, stage)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? 'rgba(100,200,130,0.15)' : isCurrent ? 'rgba(200,194,187,0.08)' : 'transparent', border: `1.5px solid ${isDone ? 'rgba(100,200,130,0.5)' : isCurrent ? STAGE_COLORS[stage].color : 'rgba(200,194,187,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: isDone ? 'rgba(100,200,130,0.8)' : isCurrent ? STAGE_COLORS[stage].color : 'rgba(200,194,187,0.2)' }}>{isDone ? '✓' : idx+1}</div>
                        <span style={{ fontSize: 9, color: isCurrent ? '#C8C2BB' : 'rgba(200,194,187,0.3)', textAlign: 'center', lineHeight: 1.3 }}>{stage}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{modalProject.progress}%</span>
                </div>
                <input type="range" min="0" max="100" value={modalProject.progress} onChange={e => {
                  const val = parseInt(e.target.value)
                  const stage = stageForProgress(val)
                  setModalProject(p => {
                    const u = p ? { ...p, progress: val, stage } : p
                    if (u) triggerAutoSave(u)
                    return u
                  })
                }} style={{ width: '100%', accentColor: '#C8C2BB', cursor: 'pointer' }} />
              </div>
              {modalProject.attachment_urls && modalProject.attachment_urls.length > 0 && (
                <div style={{ marginBottom: 20, background: 'rgba(100,150,220,0.06)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 6, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(100,150,220,0.85)', marginBottom: 10 }}>Client attachments ({modalProject.attachment_urls.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {modalProject.attachment_urls.map((a, ai) => (
                      <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#C8C2BB', textDecoration: 'none', background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.12)', borderRadius: 4, padding: '6px 10px', maxWidth: 240 }}>
                        <span>{attachmentIcon(a.name)}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
                {[{ id: 'overview', label: 'Overview' }, { id: 'notes', label: 'Notes & Files' }, { id: 'brief', label: 'Brief' }].map(tab => (
                  <button key={tab.id} onClick={() => setModalTab(tab.id as any)} style={{ fontSize: 12, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: `2px solid ${modalTab === tab.id ? '#C8C2BB' : 'transparent'}`, color: modalTab === tab.id ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>{tab.label}</button>
                ))}
              </div>
              {modalTab === 'overview' && (
              <>
              <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Client', key: 'client' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: modalProject.category === 'Property' ? 'Property address' : 'Shoot location', key: 'address' as const },
                ].map(({ label, key }) => (
                  <div key={key} style={{ gridColumn: key === 'address' ? 'span 2' : 'span 1' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input value={modalProject[key] || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, [key]: e.target.value } : p; if (u) triggerAutoSave(u); return u })} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] || '—'}</div>}
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Stage</div>
                  {modalEditing ? (
                    <select value={modalProject.stage} onChange={e => setModalProject(p => { const u = p ? { ...p, stage: e.target.value, progress: STAGE_PROGRESS[e.target.value] } : p; if (u) triggerAutoSave(u); return u })} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {STAGES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.stage}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Amount ($)</div>
                  {modalEditing ? <input type="number" min="0" step="0.01" value={modalProject.amount ?? ''} onChange={e => setModalProject(p => { const u = p ? { ...p, amount: e.target.value === '' ? null : parseFloat(e.target.value) } : p; if (u) triggerAutoSave(u); return u })} placeholder="0.00" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.amount ? `$${modalProject.amount.toLocaleString()}` : '—'}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {modalProject.client_confirmed ? (
                    <div style={{ fontSize: 11, color: 'rgba(100,200,130,0.8)' }}>✓ Confirmed{modalProject.confirmed_at ? ' ' + new Date(modalProject.confirmed_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : ''}</div>
                  ) : modalProject.stage === 'Enquiry' ? (
                    <button onClick={() => markConfirmed(modalProject)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(100,150,220,0.35)', color: 'rgba(100,150,220,0.9)', background: 'rgba(100,150,220,0.08)', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>Mark confirmed</button>
                  ) : null}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Google Drive</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={modalProject.drive_url || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, drive_url: e.target.value } : p; if (u) triggerAutoSave(u); return u })} placeholder="https://drive.google.com/drive/folders/..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', flex: 1 }} />
                  {modalProject.drive_url ? (
                    <a href={modalProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 3, border: '0.5px solid rgba(100,150,220,0.3)', color: 'rgba(100,150,220,0.9)', background: 'rgba(100,150,220,0.08)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Open ↗</a>
                  ) : (
                    <button disabled={creatingFolder} onClick={() => createProjectFolder(modalProject)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: creatingFolder ? 'not-allowed' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {creatingFolder ? 'Creating...' : '+ Create folder'}
                    </button>
                  )}
                </div>
              </div>
              <div className="ec-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[{ label: 'Shoot date', key: 'shoot_date' as const }, { label: 'Draft due', key: 'draft_due' as const }, { label: 'Delivery date', key: 'delivery_due' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    <input type="date" value={modalProject[key] || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, [key]: e.target.value } : p; if (u) { triggerAutoSave(u); if (key === 'shoot_date') triggerCalendarSync(u) } return u })} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                    {key === 'shoot_date' && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input type="time" value={modalProject.shoot_window_start || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, shoot_window_start: e.target.value } : p; if (u) { triggerAutoSave(u); triggerCalendarSync(u) } return u })} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                        <input type="time" value={modalProject.shoot_window_end || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, shoot_window_end: e.target.value } : p; if (u) { triggerAutoSave(u); triggerCalendarSync(u) } return u })} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Additional shoot dates <span style={{ color: 'rgba(200,194,187,0.2)', textTransform: 'none', letterSpacing: 0 }}>— for shoots spanning multiple days</span></div>
                  <button onClick={addShootDate} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add date</button>
                </div>
                {(modalProject.shoot_dates || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.2)' }}>No additional dates — just the single shoot date above</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(modalProject.shoot_dates || []).map(d => (
                      <div key={d.id} className="ec-shoot-date-row" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 1fr 24px', gap: 8, alignItems: 'center', background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.07)', borderRadius: 5, padding: '8px 10px' }}>
                        <input type="date" value={d.date} onChange={e => updateShootDate(d.id, 'date', e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                        <select value={d.start_time} onChange={e => updateShootDate(d.id, 'start_time', e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>Start</option>
                          {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                        </select>
                        <select value={d.end_time} onChange={e => updateShootDate(d.id, 'end_time', e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>End</option>
                          {['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                        </select>
                        <input value={d.notes} onChange={e => updateShootDate(d.id, 'notes', e.target.value)} placeholder="Notes — e.g. exterior, level 2..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                        <button onClick={() => removeShootDate(d.id)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {modalProject.deliverables && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Packages & deliverables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modalProject.deliverables.split('\n').filter(Boolean).map((d: string, i: number) => {
                      const isPackage = d.startsWith('PACKAGE: ')
                      const isDeliverables = d.startsWith('DELIVERABLES: ')
                      const isAddons = d.startsWith('ADD-ONS: ')
                      const label = isPackage ? 'Shoot package' : isDeliverables ? 'Deliverables' : isAddons ? 'Add-ons' : null
                      const value = d.replace(/^(PACKAGE|DELIVERABLES|ADD-ONS): /, '')
                      if (label) return (
                        <div key={i}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 5 }}>{label}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {value.split(',').map((v: string, j: number) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                                <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', flexShrink: 0 }}>✓</span>
                                <span style={{ fontSize: 12, color: '#C8C2BB' }}>{v.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                          <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 12, color: '#C8C2BB' }}>{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              </>
              )}
              {modalTab === 'notes' && (
              <>
              {projectFeedback.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Client feedback</div>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)' }}>{projectFeedback.filter(f => f.status !== 'resolved').length} pending</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {projectFeedback.map(fb => (
                      <div key={fb.id} style={{ background: fb.status === 'resolved' ? 'rgba(200,194,187,0.03)' : 'rgba(210,175,80,0.05)', border: `0.5px solid ${fb.status === 'resolved' ? 'rgba(200,194,187,0.08)' : 'rgba(210,175,80,0.2)'}`, borderRadius: 5, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB' }}>{fb.client_name || fb.client_email} · <span style={{ color: 'rgba(200,194,187,0.4)', fontWeight: 400 }}>{fb.file_name} @ {formatFeedbackTimestamp(fb.timestamp_seconds)}</span></div>
                          {fb.status === 'resolved' ? (
                            <span style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(100,200,130,0.8)' }}>✓ Resolved</span>
                          ) : (
                            <button onClick={() => resolveFeedback(fb.id)} style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, border: '0.5px solid rgba(210,175,80,0.3)', color: 'rgba(210,175,80,0.9)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Mark resolved</button>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.7)', lineHeight: 1.5 }}>{fb.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Notes</div>
                  <textarea value={modalProject.general_notes || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, general_notes: e.target.value } : p; if (u) triggerAutoSave(u); return u })} style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.08)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.7, resize: 'vertical' as const, minHeight: 80 }} placeholder="General notes..." />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Editor notes</div>
                  <textarea value={modalProject.editor_notes || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, editor_notes: e.target.value } : p; if (u) triggerAutoSave(u); return u })} style={{ width: '100%', background: 'rgba(100,150,220,0.03)', border: '0.5px solid rgba(100,150,220,0.12)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.7, resize: 'vertical' as const, minHeight: 80 }} placeholder="Editor notes..." />
                </div>
              </div>
              </>
              )}
              {modalTab === 'brief' && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Internal document · visible to studio only</div>
                    {(briefSaving || briefSaved) && <span style={{ fontSize: 11, color: briefSaving ? 'rgba(210,175,80,0.8)' : 'rgba(100,200,130,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{briefSaving ? 'Saving...' : '✓ Saved'}</span>}
                  </div>
                  {/* TOOLBAR */}
                  <style>{`
                    .brief-tb-btn { font-family: inherit; cursor: pointer; transition: background 0.12s, color 0.12s, border-color 0.12s; }
                    .brief-tb-btn:hover { background: rgba(200,194,187,0.1) !important; color: #C8C2BB !important; border-color: rgba(200,194,187,0.25) !important; }
                    .brief-tb-select { font-family: inherit; cursor: pointer; transition: border-color 0.12s; }
                    .brief-tb-select:hover, .brief-tb-select:focus { border-color: rgba(200,194,187,0.3) !important; }
                    .brief-tb-swatch { cursor: pointer; transition: transform 0.12s, border-color 0.12s; }
                    .brief-tb-swatch:hover { transform: scale(1.15); border-color: rgba(255,255,255,0.5) !important; }
                  `}</style>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' as const, alignItems: 'center', padding: '10px 14px', background: 'rgba(200,194,187,0.035)', borderRadius: 8, border: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <select className="brief-tb-select" onChange={e => { document.execCommand('formatBlock', false, e.target.value); e.target.value = 'p' }} style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '5px 8px', color: 'rgba(200,194,187,0.7)', outline: 'none' }}>
                      <option value="p">Paragraph</option>
                      <option value="h1">Heading 1</option>
                      <option value="h2">Heading 2</option>
                      <option value="h3">Heading 3</option>
                      <option value="h4">Heading 4</option>
                    </select>
                    <select className="brief-tb-select" onChange={e => { document.execCommand('fontName', false, e.target.value) }} style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '5px 8px', color: 'rgba(200,194,187,0.7)', outline: 'none' }}>
                      <option value="Inter, sans-serif">Sans (Inter)</option>
                      <option value="Georgia, serif">Serif (Georgia)</option>
                      <option value="'Times New Roman', serif">Serif (Times)</option>
                      <option value="Verdana, sans-serif">Sans (Verdana)</option>
                      <option value="ui-monospace, monospace">Mono</option>
                    </select>
                    <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                    {[
                      { label: 'B', cmd: 'bold', style: { fontWeight: 700 } },
                      { label: 'I', cmd: 'italic', style: { fontStyle: 'italic' } },
                      { label: 'U', cmd: 'underline', style: { textDecoration: 'underline' } },
                    ].map(({ label, cmd, style }) => (
                      <button key={cmd} className="brief-tb-btn" onMouseDown={e => { e.preventDefault(); document.execCommand(cmd) }} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent', ...style }}>{label}</button>
                    ))}
                    <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                    {[
                      { color: '#C8C2BB', title: 'Default' },
                      { color: '#E8A87C', title: 'Amber' },
                      { color: '#85C1E9', title: 'Blue' },
                      { color: '#82E0AA', title: 'Green' },
                      { color: '#F1948A', title: 'Red' },
                    ].map(({ color, title }) => (
                      <div key={color} className="brief-tb-swatch" title={title} onMouseDown={e => { e.preventDefault(); document.execCommand('foreColor', false, color) }} style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: '1.5px solid rgba(255,255,255,0.15)' }} />
                    ))}
                    <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                    {[
                      { label: '• List', cmd: 'insertUnorderedList' },
                      { label: '1. List', cmd: 'insertOrderedList' },
                    ].map(({ label, cmd }) => (
                      <button key={cmd} className="brief-tb-btn" onMouseDown={e => { e.preventDefault(); document.execCommand(cmd) }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent' }}>{label}</button>
                    ))}
                    <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                    <button className="brief-tb-btn" onMouseDown={e => { e.preventDefault(); document.execCommand('insertHorizontalRule') }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent' }}>─ Rule</button>
                    <button className="brief-tb-btn" onMouseDown={e => { e.preventDefault(); document.execCommand('removeFormat') }} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent' }}>✕ Clear</button>
                  </div>
                  {/* EDITOR */}
                  <style>{`
                    .brief-editor h1 { font-size: 26px; font-weight: 800; color: #fff; margin: 24px 0 8px; letter-spacing: -0.02em; text-transform: uppercase; }
                    .brief-editor h2 { font-size: 18px; font-weight: 700; color: #C8C2BB; margin: 20px 0 6px; letter-spacing: -0.01em; }
                    .brief-editor h3 { font-size: 14px; font-weight: 600; color: rgba(200,194,187,0.8); margin: 16px 0 4px; }
                    .brief-editor h4 { font-size: 12px; font-weight: 600; color: rgba(200,194,187,0.6); margin: 12px 0 4px; text-transform: uppercase; letter-spacing: 0.08em; }
                    .brief-editor p { margin: 4px 0; color: rgba(200,194,187,0.7); line-height: 1.8; font-size: 13px; }
                    .brief-editor ul { margin: 6px 0 6px 20px; padding: 0; }
                    .brief-editor ol { margin: 6px 0 6px 20px; padding: 0; }
                    .brief-editor li { color: rgba(200,194,187,0.7); line-height: 1.8; font-size: 13px; margin: 2px 0; }
                    .brief-editor hr { border: none; border-top: 0.5px solid rgba(200,194,187,0.12); margin: 20px 0; }
                    .brief-editor b, .brief-editor strong { color: #C8C2BB; font-weight: 600; }
                    .brief-editor i, .brief-editor em { color: rgba(200,194,187,0.7); }
                    .brief-editor u { text-decoration-color: rgba(200,194,187,0.4); }
                    .brief-editor:focus { outline: none; }
                    .brief-editor p:empty:before, .brief-editor li:empty:before { content: attr(data-placeholder); color: rgba(200,194,187,0.22); pointer-events: none; }
                    .brief-editor:empty:before { content: 'Start writing your brief...'; color: rgba(200,194,187,0.2); }
                  `}</style>
                  <div
                    ref={briefEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="brief-editor"
                    onInput={e => { const html = (e.target as HTMLDivElement).innerHTML; setBriefDocContent(html); briefContentRef.current = html; if (modalProject) autoSaveBrief(html, modalProject.id) }}
                    style={{ background: 'rgba(200,194,187,0.02)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '24px 32px', fontSize: 13, color: '#C8C2BB', fontFamily: 'Inter, sans-serif', lineHeight: 1.8, outline: 'none', minHeight: 420 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => navigator.clipboard.writeText(briefEditorRef.current?.innerText || '')} style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Copy plain text</button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                {modalProject.drive_url && (
                  <button onClick={() => deliverProject(modalProject)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.4)', color: modalProject.stage === 'Awaiting Confirmation' ? 'rgba(100,200,130,0.4)' : 'rgba(100,200,130,0.9)', background: modalProject.stage === 'Awaiting Confirmation' ? 'transparent' : 'rgba(100,200,130,0.08)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    {modalProject.stage === 'Awaiting Confirmation' ? 'Redeliver to client' : 'Deliver to client'}
                  </button>
                )}
                {modalProject.category === 'Property' && modalProject.address && (
                  <button onClick={() => generateProjectBrief(modalProject)} disabled={briefLoading} style={{ position: 'relative', overflow: 'hidden', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: `0.5px solid ${briefGenerated ? 'rgba(100,200,130,0.3)' : 'rgba(200,194,187,0.2)'}`, color: briefGenerated ? 'rgba(100,200,130,0.8)' : 'rgba(200,194,187,0.5)', background: briefGenerated ? 'rgba(100,200,130,0.06)' : 'transparent', cursor: briefLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {briefLoading && (
                      <>
                        <style>{`@keyframes fakeBriefProgress { 0% { width: 0%; } 100% { width: 92%; } }`}</style>
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(200,194,187,0.14)', animation: 'fakeBriefProgress 55s cubic-bezier(0.15,0.65,0.3,1) forwards' }} />
                      </>
                    )}
                    <span style={{ position: 'relative' }}>{briefLoading ? 'Researching...' : briefGenerated ? 'Brief saved' : 'Generate brief'}</span>
                  </button>
                )}
                {modalProject.stage === 'Awaiting Confirmation' && !modalProject.archived && !modalProject.invoice_id && (
                  <button disabled={sendingInvoice} onClick={() => sendToInvoice(modalProject)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,175,80,0.3)', color: 'rgba(210,175,80,0.8)', background: 'rgba(210,175,80,0.06)', cursor: sendingInvoice ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>{sendingInvoice ? 'Sending...' : 'Send to invoice'}</button>
                )}
                {modalProject.stage === 'Awaiting Confirmation' && !modalProject.archived && modalProject.invoice_id && (
                  <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,175,80,0.25)', color: 'rgba(210,175,80,0.7)' }}>Invoiced — Draft</span>
                )}
                {modalProject.archived && (
                  <button onClick={() => archiveProject(modalProject.id, false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.3)', color: 'rgba(100,200,130,0.8)', background: 'rgba(100,200,130,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>Unarchive</button>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </main>
  )
}
export default function ProjectsPage() {
  return <Suspense fallback={<div style={{background:'#0E1014',minHeight:'100vh'}}/>}><ProjectsPageInner /></Suspense>
}
