'use client'
import StudioSidebar from '../StudioSidebar'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'

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

const STAGES = ['Pre-Production', 'Shooting', 'Post-Production', 'Revisions', 'Awaiting Confirmation']

const STAGE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
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
  draft_due: string
  brief_due: string
  delivery_due: string
  drive_url: string
  progress: number
  from_booking: boolean
  general_notes: string
  editor_notes: string
  archived: boolean
  deliverables: string
  reference_url: string
  supplied_info: string
  shoot_window_start: string
  shoot_window_end: string
  form_booking: boolean
  notes: string
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
  const [modalEditing, setModalEditing] = useState(true)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalSaved, setModalSaved] = useState(false)
  const [autoSaveTimer, setAutoSaveTimer] = useState<any>(null)

  function triggerAutoSave(updatedProject: any) {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    const timer = setTimeout(async () => {
      if (!updatedProject) return
      await supabase.from('projects1').update({
        title: updatedProject.title, client: updatedProject.client, email: updatedProject.email,
        category: updatedProject.category, address: updatedProject.address, stage: updatedProject.stage,
        shoot_date: updatedProject.shoot_date || null, draft_due: updatedProject.draft_due || null,
        delivery_due: updatedProject.delivery_due || null, drive_url: updatedProject.drive_url,
        progress: updatedProject.progress, editor_notes: updatedProject.editor_notes,
      }).eq('id', updatedProject.id)
      setProjects(p => p.map(proj => proj.id === updatedProject.id ? { ...proj, ...updatedProject } : proj))
      setModalSaved(true)
      setTimeout(() => setModalSaved(false), 2000)
    }, 1000)
    setAutoSaveTimer(timer)
  }
  const [modalFullscreen, setModalFullscreen] = useState(false)
  const [showBriefDoc, setShowBriefDoc] = useState(false)

  useEffect(() => {
    if (showBriefDoc && briefEditorRef.current) {
      briefEditorRef.current.innerHTML = briefDocContent
      briefEditorRef.current.focus()
    }
  }, [showBriefDoc])
  const [briefDocContent, setBriefDocContent] = useState('')
  const briefEditorRef = useRef<HTMLDivElement>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefGenerated, setBriefGenerated] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [groupByStage, setGroupByStage] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newForm, setNewForm] = useState({
    title: '', client: '', contact: '', email: '',
    category: 'Property', stage: 'Pre-Production',
    brief_due: '', shoot_window_start: '', shoot_window_end: '',
    shoot_date: '', draft_due: '', delivery_due: '',
    address: '', reference_url: '', supplied_info: ''
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
        if (proj) { setModalProject(proj); setModalEditing(true) }
      }
    }
    setLoading(false)
  }

  async function moveProject(id: string, stage: string) {
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, stage } : proj))
    await supabase.from('projects1').update({ stage }).eq('id', id)
  }

  const STAGE_PROGRESS: Record<string, number> = {
    'Pre-Production': 10,
    'Shooting': 35,
    'Post-Production': 65,
    'Revisions': 85,
    'Awaiting Confirmation': 100,
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
      drive_url: modalProject.drive_url,
      progress: modalProject.progress,
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
    if (!confirm('Mark this project as delivered and notify the client?')) return
    
    // Update project stage to Awaiting Confirmation and progress to 100
    await supabase.from('projects1').update({
      stage: 'Awaiting Confirmation',
      progress: 100,
    }).eq('id', project.id)

    // Send notification to client
    await supabase.from('notifications').insert([{
      user_email: project.email,
      type: 'content_delivered',
      title: 'Your content is ready',
      message: 'Your content for ' + (project.title || project.address || 'your project') + ' has been delivered. Click to view your files in Google Drive.',
      project_id: project.id,
      read: false,
    }])

    // Update local state
    setModalProject(p => p ? { ...p, stage: 'Awaiting Confirmation', progress: 100 } : p)
    setProjects(p => p.map(proj => proj.id === project.id ? { ...proj, stage: 'Awaiting Confirmation', progress: 100 } : proj))
    setModalSaved(true)
    setTimeout(() => setModalSaved(false), 2000)
  }

  async function deleteProject(project: Project) {
    const isFromBooking = project.from_booking
    const msg = isFromBooking
      ? 'This project was created from a client booking. Deleting it will remove it from your system but will NOT automatically remove any Google Calendar events. Are you sure you want to delete this project?'
      : 'Are you sure you want to permanently delete this project? This cannot be undone.'
    if (!confirm(msg)) return
    await supabase.from('projects1').delete().eq('id', project.id)
    setProjects(p => p.filter(proj => proj.id !== project.id))
    setModalProject(null)
  }

  async function archiveProject(id: string, archived: boolean) {
    await supabase.from('projects1').update({ archived }).eq('id', id)
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, archived } : proj))
    setModalProject(null)
  }

  async function addProject() {
    if (!newForm.title || !newForm.client) return
    setSaving(true)
    const { data, error } = await supabase.from('projects1').insert([{
      ...newForm,
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
    }]).select().single()
    if (error) {
      console.error('Insert error:', error)
      alert('Error saving: ' + error.message)
    }
    if (!error && data) {
      setProjects(p => [data, ...p])
      setShowNewModal(false)
      setNewForm({ title: '', client: '', contact: '', email: '', category: 'Property', stage: 'Pre-Production', brief_due: '', shoot_window_start: '', shoot_window_end: '', shoot_date: '', draft_due: '', delivery_due: '', address: '', reference_url: '', supplied_info: '' })
      router.push(`/portal/studio/projects/${data.id}`)
    }
    setSaving(false)
  }

  const filtered = projects.filter(p => {
    const matchesCat = filterCat === 'All' || p.category === filterCat
    const matchesArchived = showArchived ? p.archived === true : !p.archived
    return matchesCat && matchesArchived
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

  function ProjectCard({ project }: { project: Project }) {
    return (
      <div
        draggable
        onDragStart={() => setDragId(project.id)}
        onDragEnd={() => { setDragId(null); setDragOverStage(null) }}
        onClick={() => { if (!dragId) { setModalProject(project); setModalEditing(true) } }}
        style={{ background: '#1A1F28', border: `0.5px solid ${dragId === project.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '14px 16px', cursor: 'pointer', opacity: dragId === project.id ? 0.5 : 1, transition: 'all 0.15s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{project.title}</div>
          {project.from_booking && <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(100,150,220,0.15)', color: 'rgba(100,150,220,0.8)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 2, flexShrink: 0 }}>Booking</span>}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>{project.client}</div>
        <div style={{ height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
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
      <StudioSidebar active="projects" />
      <div style={{ flex: 1, overflowX: 'hidden' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
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
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 12px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            <option value="created_at">Sort: Recent</option>
            <option value="shoot_date">Sort: Shoot date</option>
            <option value="delivery_due">Sort: Delivery date</option>
            <option value="client">Sort: Client</option>
            <option value="title">Sort: Project name</option>
            <option value="progress">Sort: Progress</option>
          </select>
          {viewMode === 'list' && (
            <button onClick={() => setGroupByStage(!groupByStage)} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${groupByStage ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: groupByStage ? 'rgba(200,194,187,0.08)' : 'transparent', color: groupByStage ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>Group by stage</button>
          )}
          <div style={{ display: 'flex', background: 'rgba(200,194,187,0.06)', borderRadius: 4, padding: 2 }}>
            {(['kanban', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 3, background: viewMode === mode ? 'rgba(200,194,187,0.12)' : 'transparent', color: viewMode === mode ? '#C8C2BB' : 'rgba(200,194,187,0.35)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{mode === 'kanban' ? '⬛ Kanban' : '☰ List'}</button>
            ))}
          </div>
          <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
        </div>
      </div>

      {/* KANBAN */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', height: 'calc(100vh - 57px)', overflow: 'auto' }}>
          {STAGES.map(stage => {
            const stageProjects = filtered.filter(p => p.stage === stage)
            const c = STAGE_COLORS[stage]
            const isOver = dragOverStage === stage
            return (
              <div key={stage} onDragOver={e => { e.preventDefault(); setDragOverStage(stage) }} onDrop={() => { if (dragId) { moveProject(dragId, stage); setDragId(null); setDragOverStage(null) } }} style={{ borderRight: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', flexDirection: 'column', background: isOver ? 'rgba(200,194,187,0.03)' : 'transparent', transition: 'background 0.15s', height: '100%' }}>
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
      {viewMode === 'list' && (
        <div style={{ padding: 28 }}>
          {groupByStage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(stage => {
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
                            <tr key={project.id} onClick={() => { setModalProject(project); setModalEditing(true) }} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{project.title}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}>{project.client}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.shoot_date)}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.delivery_due)}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 80, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                                    <div style={{ height: '100%', width: `${project.progress}%`, background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
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
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Project', 'Client', 'Category', 'Stage', 'Shoot date', 'Draft due', 'Delivery', 'Progress'].map(h => (
                  <th key={h} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', padding: '10px 16px', textAlign: 'left', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontWeight: 400 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((project, i) => (
                  <tr key={project.id} onClick={() => { setModalProject(project); setModalEditing(true) }} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
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
                        <div style={{ flex: 1, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No projects yet — create one above</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {newForm.category === 'Property' ? (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Property address (used as project name)</label>
                  <input style={inp} value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value, title: e.target.value }))} placeholder="e.g. 14 Clifton Rd, Havelock North" />
                </div>
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
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{modalProject.category === 'Property' ? (modalProject.address || modalProject.title) : modalProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{modalProject.client}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {modalSaved && <span style={{ fontSize: 11, color: 'rgba(100,200,130,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Saved</span>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => { setShowBriefDoc(true); setBriefDocContent(modalProject.general_notes && modalProject.general_notes.startsWith('<') ? modalProject.general_notes : '<h1>' + modalProject.title + '</h1><h2>Project Overview</h2><p></p><hr/><h2>Creative Direction</h2><p></p><hr/><h2>Key Messages</h2><ul><li></li></ul><hr/><h2>Target Audience</h2><p></p><hr/><h2>Audio / Music</h2><p></p><hr/><h2>Deliverables</h2><ul><li></li></ul><hr/><h2>Additional Notes</h2><p></p>') }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.4)', background: 'rgba(200,194,187,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>Brief</button>
                  <button onClick={() => deleteProject(modalProject)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.7)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                  <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
                </div>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(160,100,220,0.9)','Revisions':'rgba(220,120,60,0.9)','Awaiting Confirmation':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].indexOf(modalProject.stage)
                    const isDone = idx < stageIdx; const isCurrent = idx === stageIdx
                    return (
                      <div key={stage} onClick={() => setModalProject(p => p ? { ...p, stage, progress: STAGE_PROGRESS[stage] } : p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? 'rgba(100,200,130,0.15)' : isCurrent ? 'rgba(200,194,187,0.08)' : 'transparent', border: `1.5px solid ${isDone ? 'rgba(100,200,130,0.5)' : isCurrent ? SC[stage] : 'rgba(200,194,187,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: isDone ? 'rgba(100,200,130,0.8)' : isCurrent ? SC[stage] : 'rgba(200,194,187,0.2)' }}>{isDone ? '✓' : idx+1}</div>
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
                  const stage = val >= 100 ? 'Awaiting Confirmation' : val >= 85 ? 'Revisions' : val >= 65 ? 'Post-Production' : val >= 35 ? 'Shooting' : 'Pre-Production'
                  setModalProject(p => p ? { ...p, progress: val, stage } : p)
                }} style={{ width: '100%', accentColor: '#C8C2BB', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
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
                      {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.stage}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[{ label: 'Shoot date', key: 'shoot_date' as const }, { label: 'Draft due', key: 'draft_due' as const }, { label: 'Delivery date', key: 'delivery_due' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input type="date" value={modalProject[key] || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, [key]: e.target.value } : p; if (u) triggerAutoSave(u); return u })} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] ? new Date(modalProject[key]).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>}
                  </div>
                ))}
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
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Google Drive</div>
                {modalEditing ? <input value={modalProject.drive_url || ''} onChange={e => setModalProject(p => { const u = p ? { ...p, drive_url: e.target.value } : p; if (u) triggerAutoSave(u); return u })} placeholder="https://drive.google.com/drive/folders/..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : modalProject.drive_url ? <a href={modalProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>📁 Open project folder →</a> : <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.25)' }}>No folder linked</div>}
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                {modalProject.drive_url && (
                  <button onClick={() => deliverProject(modalProject)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.4)', color: modalProject.stage === 'Awaiting Confirmation' ? 'rgba(100,200,130,0.4)' : 'rgba(100,200,130,0.9)', background: modalProject.stage === 'Awaiting Confirmation' ? 'transparent' : 'rgba(100,200,130,0.08)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    {modalProject.stage === 'Awaiting Confirmation' ? 'Redeliver to client' : 'Deliver to client'}
                  </button>
                )}
                {modalProject.category === 'Property' && modalProject.address && (
                  <button onClick={() => generateProjectBrief(modalProject)} disabled={briefLoading} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: `0.5px solid ${briefGenerated ? 'rgba(100,200,130,0.3)' : 'rgba(200,194,187,0.2)'}`, color: briefGenerated ? 'rgba(100,200,130,0.8)' : 'rgba(200,194,187,0.5)', background: briefGenerated ? 'rgba(100,200,130,0.06)' : 'transparent', cursor: briefLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {briefLoading ? 'Researching...' : briefGenerated ? 'Brief saved' : 'Generate brief'}
                  </button>
                )}
                {modalProject.stage === 'Awaiting Confirmation' && !modalProject.archived && (
                  <button onClick={async () => { archiveProject(modalProject.id, true) }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,175,80,0.3)', color: 'rgba(210,175,80,0.8)', background: 'rgba(210,175,80,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>Send invoice & archive</button>
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


      {/* BRIEF DOCUMENT OVERLAY */}
      {showBriefDoc && modalProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#14181F', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 860, height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{modalProject.title} — Brief</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Freeform document</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { const html = briefEditorRef.current?.innerHTML || briefDocContent; await supabase.from('projects1').update({ general_notes: html }).eq('id', modalProject.id); setBriefDocContent(html); setShowBriefDoc(false) }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Save & close</button>
                <button onClick={() => setShowBriefDoc(false)} style={{ fontSize: 18, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px', overflow: 'hidden' }}>
              {/* TOOLBAR */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' as const, alignItems: 'center', padding: '8px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 6, border: '0.5px solid rgba(200,194,187,0.09)' }}>
                <select onChange={e => { document.execCommand('formatBlock', false, e.target.value); e.target.value = 'p' }} style={{ fontSize: 11, background: 'transparent', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 3, padding: '3px 8px', color: 'rgba(200,194,187,0.6)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                  <option value="p">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="h4">Heading 4</option>
                </select>
                <select onChange={e => { document.execCommand('fontName', false, e.target.value) }} style={{ fontSize: 11, background: 'transparent', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 3, padding: '3px 8px', color: 'rgba(200,194,187,0.6)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                  <option value="Inter, sans-serif">Sans</option>
                  <option value="Georgia, serif">Serif</option>
                  <option value="ui-monospace, monospace">Mono</option>
                </select>
                <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                {[
                  { label: 'B', cmd: 'bold', style: { fontWeight: 700 } },
                  { label: 'I', cmd: 'italic', style: { fontStyle: 'italic' } },
                  { label: 'U', cmd: 'underline', style: { textDecoration: 'underline' } },
                ].map(({ label, cmd, style }) => (
                  <button key={cmd} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd) }} style={{ fontSize: 12, padding: '3px 9px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', ...style }}>{label}</button>
                ))}
                <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                {[
                  { label: '• List', cmd: 'insertUnorderedList' },
                  { label: '1. List', cmd: 'insertOrderedList' },
                ].map(({ label, cmd }) => (
                  <button key={cmd} onMouseDown={e => { e.preventDefault(); document.execCommand(cmd) }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                ))}
                <div style={{ width: 1, height: 20, background: 'rgba(200,194,187,0.12)', margin: '0 4px' }} />
                <button onMouseDown={e => { e.preventDefault(); document.execCommand('insertHorizontalRule') }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>─ Rule</button>
                <button onMouseDown={e => { e.preventDefault(); document.execCommand('removeFormat') }} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>✕ Clear</button>
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
                .brief-editor:empty:before { content: 'Start writing your brief...'; color: rgba(200,194,187,0.2); }
              `}</style>
              <div
                ref={briefEditorRef}
                contentEditable
                suppressContentEditableWarning
                className="brief-editor"
                onInput={e => setBriefDocContent((e.target as HTMLDivElement).innerHTML)}
                style={{ flex: 1, background: 'rgba(200,194,187,0.02)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '24px 32px', fontSize: 13, color: '#C8C2BB', fontFamily: 'Inter, sans-serif', lineHeight: 1.8, outline: 'none', overflowY: 'auto' as const, minHeight: 200 }}
              />
            </div>
            <div style={{ padding: '12px 24px', borderTop: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)' }}>Rich text editor</span>
              <button onClick={() => navigator.clipboard.writeText((document.querySelector('[contenteditable]') as HTMLElement)?.innerText || '')} style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Copy plain text</button>
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
