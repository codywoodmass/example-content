'use client'
import React from 'react'
import StudioSidebar from './StudioSidebar'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatTime12 } from '@/lib/time'
import { xeroAuthedFetch } from '@/lib/xeroClient'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'
import { useRouter } from 'next/navigation'

function StudioDriveFolder({ driveUrl }: { driveUrl: string }) {
  const [files, setFiles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [stack, setStack] = React.useState<{ id: string; name: string }[]>([])
  const [previewFile, setPreviewFile] = React.useState<any>(null)
  const [feedbackList, setFeedbackList] = React.useState<any[]>([])

  React.useEffect(() => {
    if (!previewFile) { setFeedbackList([]); return }
    supabase.from('video_feedback').select('*').eq('file_id', previewFile.id).order('timestamp_seconds', { ascending: true })
      .then(({ data }) => setFeedbackList(data || []))
  }, [previewFile])

  function formatSeconds(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function resolveFeedback(id: string) {
    await supabase.from('video_feedback').update({ status: 'resolved' }).eq('id', id)
    setFeedbackList(p => p.map(f => f.id === id ? { ...f, status: 'resolved' } : f))
  }

  function loadRoot() {
    setLoading(true)
    fetch(`/api/drive?url=${encodeURIComponent(driveUrl)}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack([]); setLoading(false) })
      .catch(() => setLoading(false))
  }

  React.useEffect(() => { loadRoot() }, [driveUrl])

  function openFolder(folder: any) {
    setLoading(true)
    fetch(`/api/drive?folderId=${folder.id}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack(p => [...p, { id: folder.id, name: folder.name }]); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function goToCrumb(index: number) {
    if (index < 0) { loadRoot(); return }
    const target = stack[index]
    setLoading(true)
    fetch(`/api/drive?folderId=${target.id}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack(stack.slice(0, index + 1)); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const breadcrumb = (
    <div style={{ display:'flex', flexWrap:'wrap' as const, alignItems:'center', gap:4, marginBottom:14, fontSize:11 }}>
      <span onClick={() => goToCrumb(-1)} style={{ cursor:'pointer', color: stack.length ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: stack.length ? 'underline' : 'none' }}>📁 Root</span>
      {stack.map((s, i) => (
        <span key={s.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ color:'rgba(200,194,187,0.25)' }}>/</span>
          <span onClick={() => goToCrumb(i)} style={{ cursor: i < stack.length - 1 ? 'pointer' : 'default', color: i < stack.length - 1 ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: i < stack.length - 1 ? 'underline' : 'none' }}>{s.name}</span>
        </span>
      ))}
    </div>
  )

  if (loading) return <div style={{ textAlign:'center', color:'rgba(200,194,187,0.3)', padding:'40px 0' }}>Loading files...</div>

  return (
    <div>
      {stack.length > 0 && breadcrumb}
      {files.length === 0 ? (
        <div style={{ textAlign:'center', color:'rgba(200,194,187,0.25)', padding:'40px 0' }}>No files found</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {files.map((file: any) => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder'
            const isVideo = file.mimeType?.includes('video')
            const isImage = file.mimeType?.includes('image')
            return (
              <div key={file.id} onClick={() => { if (isFolder) openFolder(file); else if (isVideo || isImage) setPreviewFile(file) }} style={{ background:'#0E1014', border:'0.5px solid rgba(200,194,187,0.08)', borderRadius:7, overflow:'hidden', cursor: isFolder || isVideo || isImage ? 'pointer' : 'default' }}>
                <div style={{ aspectRatio:'16/9', position:'relative', overflow:'hidden' }}>
                  {isFolder ? (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, background:'#14181F' }}>📁</div>
                  ) : isVideo ? (
                    <div style={{ width:'100%', height:'100%', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0c10' }}>
                      <img src={`/api/drive?thumb=${file.id}`} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.8 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                      <div style={{ position:'relative', width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(200,194,187,0.3)' }}><span style={{ fontSize:12, marginLeft:2 }}>▶</span></div>
                    </div>
                  ) : isImage ? (
                    <img src={`/api/drive?thumb=${file.id}`} alt={file.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                  ) : (
                    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>📄</div>
                  )}
                </div>
                <div style={{ padding:'10px 12px' }}>
                  <div style={{ fontSize:11, fontWeight:500, color:'#C8C2BB', marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')}</div>
                  {isFolder ? (
                    <div style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)' }}>Open folder →</div>
                  ) : (
                    <div style={{ display:'flex', gap:6 }}>
                      <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 8px', borderRadius:2, border:'0.5px solid rgba(200,194,187,0.12)', color:'rgba(200,194,187,0.4)', textDecoration:'none' }}>View</a>
                      <a href={`https://drive.google.com/uc?export=download&id=${file.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'4px 8px', borderRadius:2, border:'0.5px solid rgba(200,194,187,0.12)', color:'rgba(200,194,187,0.4)', textDecoration:'none' }}>Download</a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {previewFile && (
        <div onClick={() => setPreviewFile(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:500, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, gap:14 }}>
          {previewFile.mimeType?.includes('video') ? (
            <div style={{ display:'flex', gap:16, width:'96vw', height:'88vh' }} onClick={e => e.stopPropagation()}>
              <div style={{ flex:'1 1 auto', display:'flex', alignItems:'center', justifyContent:'center', minWidth:0 }}>
                <iframe src={`https://drive.google.com/file/d/${previewFile.id}/preview`} style={{ width:'100%', maxWidth:'68vw', height:'86vh', border:'none', borderRadius:6 }} allow="autoplay" allowFullScreen />
              </div>
              <div style={{ width:320, flexShrink:0, height:'86vh', background:'#14181F', border:'0.5px solid rgba(200,194,187,0.12)', borderRadius:8, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'16px 18px', borderBottom:'0.5px solid rgba(200,194,187,0.1)' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#fff' }}>Client feedback</div>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'12px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                  {feedbackList.length === 0 && <div style={{ fontSize:12, color:'rgba(200,194,187,0.25)' }}>No feedback yet</div>}
                  {feedbackList.map(fb => (
                    <div key={fb.id} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.08)', borderRadius:5, padding:'8px 10px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'#C8C2BB' }}>{formatSeconds(fb.timestamp_seconds)}</span>
                        <span style={{ fontSize:10, color:'rgba(200,194,187,0.35)' }}>{fb.client_name}</span>
                      </div>
                      <div style={{ fontSize:12, color:'rgba(200,194,187,0.7)', lineHeight:1.5, marginBottom:6 }}>{fb.message}</div>
                      {fb.status === 'resolved' ? (
                        <span style={{ fontSize:9, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(100,200,130,0.8)' }}>✓ Resolved</span>
                      ) : (
                        <button onClick={() => resolveFeedback(fb.id)} style={{ fontSize:9, letterSpacing:'0.06em', textTransform:'uppercase', padding:'3px 8px', borderRadius:2, border:'0.5px solid rgba(200,194,187,0.15)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Mark resolved</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div onClick={e => e.stopPropagation()}>
              {previewFile.mimeType?.includes('image') ? (
                <img src={`https://drive.google.com/uc?id=${previewFile.id}`} alt={previewFile.name} style={{ maxWidth:'94vw', maxHeight:'88vh', objectFit:'contain', borderRadius:6 }} />
              ) : (
                <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color:'#C8C2BB', fontSize:14 }}>Open file in Google Drive</a>
              )}
            </div>
          )}
          <button onClick={() => setPreviewFile(null)} style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Close</button>
        </div>
      )}
    </div>
  )
}

function StudioDriveThumb({ driveUrl }: { driveUrl: string }) {
  const [thumb, setThumb] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const isMedia = (f: any) => f.mimeType?.includes('video') || f.mimeType?.includes('image')
    fetch(`/api/drive?url=${encodeURIComponent(driveUrl)}`)
      .then(r => r.json())
      .then(async data => {
        const files = data.files || []
        const media = files.find(isMedia)
        if (media) { setThumb(media); setLoading(false); return }
        const folder = files.find((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
        if (folder) {
          const res2 = await fetch(`/api/drive?folderId=${folder.id}`)
          const data2 = await res2.json()
          setThumb((data2.files || []).find(isMedia) || null)
        } else {
          setThumb(null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [driveUrl])

  if (loading) return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(200,194,187,0.2)', fontSize:11 }}>...</div>
  if (!thumb) return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, opacity:0.3 }}>📁</div>

  const isVideo = thumb.mimeType?.includes('video')
  const isImage = thumb.mimeType?.includes('image')

  if (isVideo) return (
    <div style={{ width:'100%', height:'100%', position:'relative', background:'#0a0c10', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <img src={`/api/drive?thumb=${thumb.id}`} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.8 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
      <div style={{ position:'relative', width:32, height:32, borderRadius:'50%', background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(200,194,187,0.3)', zIndex:1 }}><span style={{ fontSize:12, marginLeft:2, color:'#fff' }}>▶</span></div>
    </div>
  )
  if (isImage) return <img src={`https://lh3.googleusercontent.com/d/${thumb.id}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
  return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, opacity:0.4 }}>📄</div>
}

export default function StudioPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingCount, setBookingCount] = useState(0)
  const [changeRequests, setChangeRequests] = useState<any[]>([])
  const [changeRequestCount, setChangeRequestCount] = useState(0)
  const [videoFeedbackCount, setVideoFeedbackCount] = useState(0)
  const [respondingToCR, setRespondingToCR] = useState<any>(null)
  const [dashProjects, setDashProjects] = useState<any[]>([])
  const [modalProject, setModalProject] = useState<any>(null)
  const [dayTodoDate, setDayTodoDate] = useState<string | null>(null)
  const [todos, setTodos] = useState<any[]>([])
  const [newTodoText, setNewTodoText] = useState('')
  const [newTodoDate, setNewTodoDate] = useState<string>('')

  async function loadTodos() {
    const { data } = await supabase.from('todos').select('*').order('done', { ascending: true }).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true })
    setTodos(data || [])
  }

  async function addTodo() {
    if (!newTodoText.trim()) return
    const { data, error } = await supabase.from('todos').insert([{ text: newTodoText.trim(), due_date: newTodoDate || null }]).select().single()
    if (error) { notify('Error adding task: ' + error.message, 'error'); return }
    setTodos(p => [...p, data])
    setNewTodoText('')
    setNewTodoDate('')
  }

  async function toggleTodo(id: string, done: boolean) {
    await supabase.from('todos').update({ done: !done }).eq('id', id)
    setTodos(p => p.map(t => t.id === id ? { ...t, done: !done } : t))
  }

  async function deleteTodo(id: string) {
    await supabase.from('todos').delete().eq('id', id)
    setTodos(p => p.filter(t => t.id !== id))
  }

  useEffect(() => { loadTodos() }, [])
  const [deliveryModal, setDeliveryModal] = useState<any>(null)
  const [modalEditing, setModalEditing] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalSaved, setModalSaved] = useState(false)
  const [upcomingShoots, setUpcomingShoots] = useState<any[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([])
  const [scheduleProjects, setScheduleProjects] = useState<any[]>([])

  const [scheduleModal, setScheduleModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [shootDate, setShootDate] = useState("")
  const [meetingMode, setMeetingMode] = useState(false)
  const [scheduleMonthOffset, setScheduleMonthOffset] = useState(0)
  const [shootTime, setShootTime] = useState("08:00")
  const [calendarView, setCalendarView] = useState(false)
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState("07:30")
  const [endTime, setEndTime] = useState("12:00")
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [confirmingBooking, setConfirmingBooking] = useState(false)
  const [eventLink, setEventLink] = useState("")
  const [showConnectPrompt, setShowConnectPrompt] = useState(false)


  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      return hash || 'dashboard'
    }
    return 'dashboard'
  })

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) setActiveView(hash)
  }, [])

  const [xeroStatus, setXeroStatus] = useState<{ connected: boolean; tenantName?: string } | null>(null)
  const [pnl, setPnl] = useState<any>(null)
  const [pnlLoading, setPnlLoading] = useState(false)
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [pnlMonths, setPnlMonths] = useState(6)

  async function loadXeroStatus() {
    const res = await xeroAuthedFetch('/api/xero/status')
    const data = await res.json()
    setXeroStatus(data)
  }

  async function loadInvoiceSummary() {
    const { data } = await supabase.from('invoices1').select('*').order('created_at', { ascending: false }).limit(50)
    setRecentInvoices(data || [])
  }

  async function loadPnl(months = pnlMonths) {
    setPnlLoading(true)
    try {
      const res = await xeroAuthedFetch('/api/xero/pnl?months=' + months)
      const data = await res.json()
      setPnl(data)
    } finally {
      setPnlLoading(false)
    }
  }

  async function connectXero(scopeOverride?: string) {
    const qs = scopeOverride ? '?scope=' + encodeURIComponent(scopeOverride) : ''
    const res = await xeroAuthedFetch('/api/xero/connect' + qs)
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else notify('Xero connect error: ' + (data.error || 'unknown'), 'error')
  }

  async function disconnectXero() {
    if (!(await confirmDialog('Disconnect Xero from the studio portal?'))) return
    await xeroAuthedFetch('/api/xero/disconnect', { method: 'POST' })
    setXeroStatus({ connected: false })
    setPnl(null)
  }

  useEffect(() => { if (activeView === 'finance' && userRole === 'studio') { loadXeroStatus(); loadInvoiceSummary() } }, [activeView, userRole])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('xero') === 'error') {
      notify('Xero connection failed' + (params.get('detail') ? ': ' + params.get('detail') : ''), 'error')
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    } else if (params.get('xero') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname + window.location.hash)
    }
  }, [])
  useEffect(() => { if (activeView === 'finance' && xeroStatus?.connected) loadPnl(pnlMonths) }, [activeView, xeroStatus?.connected, pnlMonths])

  const [briefData, setBriefData] = useState<Record<number, any>>({})
  const [briefLoading, setBriefLoading] = useState<Record<number, boolean>>({})


  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (profile?.role !== 'studio' && profile?.role !== 'editor') { router.push('/portal/client'); return }
      setUserRole(profile.role)
      setUser(session.user)
      setLoading(false)
      loadBookings()
      checkGoogleStatus()
    })

    // Background token refresh can silently fail if the tab sits idle for a
    // while (browsers throttle timers in hidden tabs) — the old token then
    // stays cached and every request quietly fails with no error shown. Revalidate
    // whenever the tab regains focus/visibility so a dead session bounces to login
    // instead of leaving the page looking broken/empty.
    async function revalidateSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
    }
    function onVisible() { if (document.visibilityState === 'visible') revalidateSession() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', revalidateSession)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', revalidateSession)
      authListener.subscription.unsubscribe()
    }
  }, [router])

  async function checkGoogleStatus() {
    try {
      const res = await fetch('/api/calendar?action=status')
      const data = await res.json()
      setCalendarConnected(!!data.connected)
      if (!data.connected && !sessionStorage.getItem('google_connect_prompted')) {
        sessionStorage.setItem('google_connect_prompted', '1')
        setShowConnectPrompt(true)
      }
    } catch (e) { console.error(e) }
  }
  const STAGE_PROGRESS: Record<string, number> = {
    'Enquiry': 0, 'Pre-Production': 10, 'Shooting': 35, 'Post-Production': 65, 'Revisions': 85, 'Awaiting Confirmation': 100,
  }

  async function saveModalProject() {
    if (!modalProject) return
    setModalSaving(true)
    const { error } = await supabase.from('projects1').update({
      title: modalProject.title, client: modalProject.client, email: modalProject.email,
      category: modalProject.category, address: modalProject.address, stage: modalProject.stage,
      shoot_date: modalProject.shoot_date || null, draft_due: modalProject.draft_due || null,
      delivery_due: modalProject.delivery_due || null, drive_url: modalProject.drive_url,
      progress: modalProject.progress,
    }).eq('id', modalProject.id)
    if (!error) {
      setDashProjects(p => p.map(proj => proj.id === modalProject.id ? { ...proj, ...modalProject } : proj))
      setModalSaved(true)
      setModalEditing(false)
      setTimeout(() => setModalSaved(false), 2000)
    }
    setModalSaving(false)
  }

  async function loadBookings() {
    const [{ data, error }, { data: projects }, { data: crs }, { data: vf }] = await Promise.all([
      supabase.from('bookings1').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('projects1').select('*').order('created_at', { ascending: false }),
      supabase.from('change_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('video_feedback').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    if (!error && data) {
      setBookings(data)
      setBookingCount(data.length)
    }
    if (crs) { setChangeRequests(crs); setChangeRequestCount(crs.length) }
    if (vf) setVideoFeedbackCount(vf.length)
    if (projects) {
      const now = new Date()
      const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      setDashProjects(projects.filter((p: any) => !p.archived))
      setUpcomingShoots(projects.filter((p: any) => {
        if (!p.shoot_date) return false
        const d = new Date(p.shoot_date)
        return d >= now && d <= in14
      }).sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime()))
      setRecentDeliveries(projects.filter((p: any) => p.drive_url && !p.archived && p.stage === 'Awaiting Confirmation').slice(0, 10))
      setScheduleProjects(projects.filter((p: any) => !p.archived))
    }
  }

  async function connectGoogleCalendar() {
    setShowConnectPrompt(false)
    const res = await fetch('/api/calendar?action=auth_url')
    const { url } = await res.json()
    window.open(url, '_blank', 'width=500,height=600')
    function onFocus() {
      window.removeEventListener('focus', onFocus)
      checkGoogleStatus()
    }
    window.addEventListener('focus', onFocus)
  }

  async function createCalendarEvent(booking: any) {
    setCreatingEvent(true)
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Example Content — ${booking.address || booking.shoot_package || 'Shoot'}`,
          date: shootDate,
          startTime,
          endTime,
          clientEmail: booking.client_email,
          location: booking.address || '',
          description: `Booking confirmed for ${booking.client_name || booking.client_email}\nPackage: ${booking.shoot_package}\nDeliverables: ${booking.deliverables}\nNotes: ${booking.notes || ''}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEventLink(data.eventLink)
        const proj = await confirmBooking(booking)
        setTimeout(() => {
          setScheduleModal(false)
          setEventLink('')
          if (proj?.id) router.push('/portal/studio/projects/' + proj.id)
        }, 1500)
      } else if (data.error === 'Not authenticated') {
        notify('Please connect your Google Calendar first', 'error')
        connectGoogleCalendar()
      } else {
        notify('Calendar error: ' + data.error, 'error')
      }
    } catch (e) {
      console.error(e)
    }
    setCreatingEvent(false)
  }

  async function createMeetingEvent(booking: any) {
    setCreatingEvent(true)
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Example Content — Discovery call: ${booking.client_name || booking.address || booking.shoot_package || 'New enquiry'}`,
          date: shootDate,
          startTime,
          endTime,
          clientEmail: booking.client_email,
          location: booking.address || '',
          description: `Scoping meeting for ${booking.client_name || booking.client_email}\nProject type: ${booking.shoot_package}\nDeliverables: ${booking.deliverables}\nNotes: ${booking.notes || ''}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEventLink(data.eventLink)
        const proj = await bookMeeting(booking)
        setTimeout(() => {
          setScheduleModal(false)
          setEventLink('')
          setMeetingMode(false)
          if (proj?.id) router.push('/portal/studio/projects/' + proj.id)
        }, 1500)
      } else if (data.error === 'Not authenticated') {
        notify('Please connect your Google Calendar first', 'error')
        connectGoogleCalendar()
      } else {
        notify('Calendar error: ' + data.error, 'error')
      }
    } catch (e) {
      console.error(e)
    }
    setCreatingEvent(false)
  }

  // Shared by confirmBooking and bookMeeting — creates the project, Drive folder and
  // deliverables checklist from a pending booking. shootDateForProject is only set when
  // an actual shoot date is being locked in (not for a discovery/scoping meeting).
  async function createProjectFromBooking(booking: any, shootDateForProject: string | null, extraNotes: string) {
    const { data, error: projectError } = await supabase.from('projects1').insert([{
      title: booking.address || booking.shoot_package || 'New project',
      client: booking.client_name || booking.client_email || '',
      contact: booking.client_name || "",
      email: booking.client_email || '',
      category: booking.category === 'property' ? 'Property' : 'Commercial',
      address: booking.address || '',
      stage: 'Enquiry',
      shoot_date: shootDateForProject,
      draft_due: booking.draft_due || null,
      delivery_due: booking.delivery_due || null,
      progress: 0,
      from_booking: true,
      general_notes: (booking.notes || '') + extraNotes,
      editor_notes: '',
      amount: booking.total_price ?? null,
      deliverables: [
        booking.shoot_package ? 'PACKAGE: ' + booking.shoot_package : '',
        booking.deliverables ? 'DELIVERABLES: ' + booking.deliverables : '',
        booking.addons ? 'ADD-ONS: ' + booking.addons : '',
      ].filter(Boolean).join('\n'),
    }]).select().single()
    if (projectError) {
      notify('Project error: ' + projectError.message, 'error')
      return null
    }
    if (data) {
      const deliverables = []
      if (booking.shoot_package) deliverables.push({ id: '1', name: booking.shoot_package, done: false })
      if (booking.deliverables) deliverables.push({ id: '2', name: booking.deliverables, done: false })
      if (booking.addons) booking.addons.split(', ').filter(Boolean).forEach((a: string, i: number) => deliverables.push({ id: String(i + 3), name: a, done: false }))
      if (deliverables.length > 0) localStorage.setItem(`deliverables_${data.id}`, JSON.stringify(deliverables))
      try {
        const driveRes = await fetch('/api/drive/folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: booking.category, client: data.client, projectTitle: data.title }),
        })
        const driveData = await driveRes.json()
        if (driveData.url) {
          await supabase.from('projects1').update({ drive_url: driveData.url }).eq('id', data.id)
          data.drive_url = driveData.url
        } else if (driveData.error === 'Not authenticated') {
          notify('Project created, but Google Drive isn\'t connected — no folder was made. Connect Google Drive from the dashboard, then create the folder manually from the project.', 'error')
        } else if (driveData.error) {
          notify('Project created, but the Drive folder failed: ' + driveData.error, 'error')
        }
      } catch (e) { console.error('Drive folder creation error:', e) }
    }
    return data
  }

  async function confirmBooking(booking: any) {
    await supabase.from('bookings1').update({ status: 'confirmed' }).eq('id', booking.id)
    const data = await createProjectFromBooking(booking, shootDate || booking.preferred_date || null, '')
    // Send notification to client
    if (data?.id) {
      await supabase.from('notifications').insert([{
        user_email: booking.client_email,
        type: 'booking_confirmed',
        title: 'Shoot confirmed!',
        message: 'Your booking for ' + (booking.address || booking.shoot_package || 'your shoot') + ' has been confirmed.' + (shootDate ? ' Shoot date: ' + new Date(shootDate + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : ''),
        project_id: data.id,
        read: false,
      }])
    }
    loadBookings()
    return data
  }

  async function bookMeeting(booking: any) {
    await supabase.from('bookings1').update({ status: 'meeting_booked' }).eq('id', booking.id)
    const meetingLabel = shootDate ? new Date(shootDate + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ' at ' + formatTime12(startTime) : ''
    const data = await createProjectFromBooking(booking, null, meetingLabel ? '\n\nMeeting scheduled: ' + meetingLabel : '')
    // Send notification to client
    if (data?.id) {
      await supabase.from('notifications').insert([{
        user_email: booking.client_email,
        type: 'meeting_booked',
        title: 'Meeting booked',
        message: 'We\'ve booked a meeting to discuss ' + (booking.shoot_package || booking.address || 'your project') + '.' + (meetingLabel ? ' Meeting date: ' + meetingLabel : ''),
        project_id: data.id,
        read: false,
      }])
    }
    loadBookings()
    return data
  }

  async function declineBooking(id: string) {
    await supabase.from('bookings1').update({ status: 'declined' }).eq('id', id)
    loadBookings()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function generateBriefForBooking(index: number, address: string, propertyType: string, shootDate: string) {
    setBriefLoading(prev => ({ ...prev, [index]: true }))
    try {
      const res = await fetch('/api/property-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, propertyType, shootDate }),
      })
      const data = await res.json()
      setBriefData(prev => ({ ...prev, [index]: data }))
    } catch (e) {
      setBriefData(prev => ({ ...prev, [index]: { error: 'Failed to generate brief' } }))
    }
    setBriefLoading(prev => ({ ...prev, [index]: false }))
  }


  const s = { panel: { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7 } as React.CSSProperties }

  const pill = (label: string, color: string, bg: string) => (
    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '3px 9px', borderRadius: 2, background: bg, color, border: `0.5px solid ${color}33`, whiteSpace: 'nowrap' as const }}>{label}</span>
  )

  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
    </main>
  )

  const navGroups = [
    { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard' }] },
    { label: 'Work', items: [
      { id: 'projects', label: 'Projects' },
      { id: 'schedule', label: 'Shoot Schedule' },
      { id: 'bookings', label: 'Booking Requests', badge: (bookingCount + changeRequestCount) > 0 ? String(bookingCount + changeRequestCount) : undefined },
      { id: 'brief', label: 'Property Brief' },
    ]},
    { label: 'Team', items: [
      { id: 'team', label: 'Team & Time' },
      { id: 'equipment', label: 'Equipment' },
    ]},
    { label: 'Finance', items: [
      { id: 'finance', label: 'P&L Overview' },
    ]},
    { label: 'Clients', items: [
      { id: 'pitches', label: 'Pitch Decks' },
    ]},
  ]

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', display: 'flex', fontSize: 13 }}>
      <ToastHost />
      <ConfirmHost />

      {/* SIDEBAR */}
      <StudioSidebar active={activeView} onViewChange={setActiveView} />

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(bookingCount + changeRequestCount) > 0 && (
                  <button onClick={() => setActiveView('bookings')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.4)', color: 'rgba(210,90,90,0.9)', background: 'rgba(210,90,90,0.08)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {bookingCount + changeRequestCount} new {bookingCount > 0 && changeRequestCount > 0 ? 'notifications' : bookingCount > 0 ? 'request' + (bookingCount !== 1 ? 's' : '') : 'change' + (changeRequestCount !== 1 ? 's' : '')}
                  </button>
                )}
                {videoFeedbackCount > 0 && (
                  <div title="Open a delivered project's files to see and resolve it" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(100,150,220,0.4)', color: 'rgba(100,150,220,0.9)', background: 'rgba(100,150,220,0.08)' }}>
                    🎬 {videoFeedbackCount} video feedback
                  </div>
                )}
                <button onClick={() => router.push('/portal/studio/projects')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
                {[
                  { label: 'Active projects', value: dashProjects.length, sub: (() => {
                    const start = new Date(); start.setHours(0, 0, 0, 0)
                    const end = new Date(start); end.setDate(end.getDate() + 7)
                    const count = dashProjects.filter((p: any) => {
                      const dates = [p.shoot_date, ...((p.shoot_dates || []).map((d: any) => d.date))].filter(Boolean)
                      return dates.some((ds: string) => { const d = new Date(ds + 'T12:00:00'); return d >= start && d < end })
                    }).length
                    return count + ' shooting this week'
                  })() },
                  { label: 'Revision requests', value: videoFeedbackCount, sub: videoFeedbackCount > 0 ? 'Client feedback awaiting a response' : 'All clear', alert: videoFeedbackCount > 0 },
                  { label: 'In post-production', value: dashProjects.filter((p: any) => p.stage === 'Post-Production' || p.stage === 'Revisions').length, sub: 'Editing & revisions' },
                  { label: 'Ready to invoice', value: dashProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' && !p.invoice_id).length, sub: (() => { const now = new Date(); const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0); const days = Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)); return days === 0 ? 'Last day of month!' : `${days} day${days !== 1 ? 's' : ''} until end of month` })(), alert: dashProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' && !p.invoice_id).length > 0 },
                ].map(({ label, value, sub, alert }: any) => (
                  <div key={label} style={{ background: 'linear-gradient(135deg, rgba(30,36,48,0.9) 0%, rgba(20,24,32,0.95) 100%)', border: '0.5px solid ' + (alert ? 'rgba(210,90,90,0.4)' : 'rgba(200,194,187,0.08)'), borderRadius: 12, padding: '20px 22px', position: 'relative', overflow: 'hidden', boxShadow: alert ? '0 0 20px rgba(210,90,90,0.08) inset' : '0 0 0 0 transparent' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: alert ? 'linear-gradient(90deg, transparent, rgba(210,90,90,0.5), transparent)' : 'linear-gradient(90deg, transparent, rgba(200,194,187,0.12), transparent)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', fontWeight: 500 }}>{label}</div>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: alert ? 'rgba(210,90,90,0.9)' : 'rgba(100,200,130,0.7)', boxShadow: alert ? '0 0 8px rgba(210,90,90,0.6)' : '0 0 8px rgba(100,200,130,0.5)' }} />
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, marginBottom: 8, color: alert ? 'rgba(210,90,90,0.9)' : '#fff' }}>{value}</div>
                    <div style={{ fontSize: 11, color: alert ? 'rgba(210,90,90,0.7)' : 'rgba(200,194,187,0.3)', letterSpacing: '0.02em' }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, minWidth: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -6 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Active projects</div>
                    <button onClick={() => router.push('/portal/studio/projects')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                  </div>
                  {(() => {
                    const SC: Record<string,any> = {'Enquiry':{color:'rgba(200,194,187,0.55)',bg:'rgba(200,194,187,0.06)'},'Pre-Production':{color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'},'Shooting':{color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'},'Post-Production':{color:'rgba(210,90,90,0.9)',bg:'rgba(50,25,80,0.4)'},'Revisions':{color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'},'Awaiting Confirmation':{color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}}
                    const now = new Date()
                    const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
                    const recentBookings = [...dashProjects].filter(p => p.from_booking).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0,5)
                    const nearDelivery = [...dashProjects].filter(p => p.delivery_due && new Date(p.delivery_due) >= now && new Date(p.delivery_due) <= in14).sort((a,b) => new Date(a.delivery_due).getTime() - new Date(b.delivery_due).getTime()).slice(0,5)
                    const postProd = [...dashProjects].filter(p => p.stage === 'Post-Production' || p.stage === 'Revisions').slice(0,5)

                    function ProjectRow({ p, last }: { p: any; last: boolean }) {
                      const sc = SC[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                      return (
                        <div onClick={() => { setModalProject(p); setModalEditing(false) }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: last ? 'none' : '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.client}{p.delivery_due ? ' · Due: ' + new Date(p.delivery_due).toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : ''}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: p.progress + '%', background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <>
                        {[
                          { label: 'Recent bookings', projects: recentBookings, color: 'rgba(100,150,220,0.9)' },
                          { label: 'Approaching delivery', projects: nearDelivery, color: 'rgba(220,120,60,0.9)' },
                          { label: 'Post-production', projects: postProd, color: 'rgba(210,90,90,0.9)' },
                        ].map(({ label, projects, color }) => (
                          <div key={label}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                              <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>{label}</span>
                            </div>
                            <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                              {projects.length === 0 ? (
                                <div style={{ padding: '14px 16px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No projects</div>
                              ) : projects.map((p, i) => <ProjectRow key={p.id} p={p} last={i === projects.length - 1} />)}
                            </div>
                          </div>
                        ))}
                      </>
                    )
                  })()}
                  {recentDeliveries.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Recent deliveries</div>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>scroll →</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                        {recentDeliveries.map((p: any) => (
                          <div key={p.id} onClick={() => setDeliveryModal(p)} style={{ flexShrink: 0, width: 200, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', cursor: 'pointer' }}>
                            <div style={{ height:110, background:'#0a0c10', position:'relative', overflow:'hidden', borderBottom:'0.5px solid rgba(200,194,187,0.06)', pointerEvents:'none' }}>
                              {p.drive_url ? (
                                <StudioDriveThumb driveUrl={p.drive_url} />
                              ) : (
                                <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                                  <span style={{ fontSize:22, opacity:0.25 }}>📁</span>
                                  <span style={{ fontSize:9, color:'rgba(200,194,187,0.25)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Coming soon</span>
                                </div>
                              )}
                            </div>
                            <div style={{ padding: '11px 13px' }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>{p.client}</div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(100,200,130,0.15)', color: 'rgba(100,200,130,0.9)', border: '0.5px solid rgba(100,200,130,0.3)' }}>Delivered</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {userRole === 'studio' && (
                    <div>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Booking requests</div>
                      <div style={{ background: bookingCount > 0 ? 'rgba(210,90,90,0.06)' : '#1A1F28', border: '0.5px solid ' + (bookingCount > 0 ? 'rgba(210,90,90,0.25)' : 'rgba(200,194,187,0.09)'), borderRadius: 7, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: (bookingCount + changeRequestCount) > 0 ? 'rgba(210,90,90,0.9)' : '#C8C2BB' }}>{bookingCount + changeRequestCount}</div>
                          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>
                            {bookingCount > 0 && <span>{bookingCount} booking request{bookingCount !== 1 ? 's' : ''}</span>}
                            {bookingCount > 0 && changeRequestCount > 0 && <span> · </span>}
                            {changeRequestCount > 0 && <span style={{ color: 'rgba(210,90,90,0.8)' }}>{changeRequestCount} change request{changeRequestCount !== 1 ? 's' : ''}</span>}
                            {bookingCount === 0 && changeRequestCount === 0 && <span>No pending requests</span>}
                          </div>
                        </div>
                        {(bookingCount + changeRequestCount) > 0 && <button onClick={() => setActiveView('bookings')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.4)', color: 'rgba(210,90,90,0.9)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Review →</button>}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>4 week calendar</div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: 12 }}>
                      {(() => {
                        const today = new Date(); today.setHours(0,0,0,0)
                        const startOfWeek = new Date(today)
                        const dow = today.getDay() === 0 ? 6 : today.getDay() - 1
                        startOfWeek.setDate(today.getDate() - dow)
                        const weeks = Array.from({length: 4}, (_: any, wi: number) => Array.from({length: 7}, (_: any, di: number) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + wi * 7 + di); return d }))
                        const eventsByDate: Record<string, {type: string, project: any}[]> = {}
                        const addEvent = (date: string | null, type: string, project: any) => {
                          if (!date) return
                          if (!eventsByDate[date]) eventsByDate[date] = []
                          eventsByDate[date].push({ type, project })
                        }
                        dashProjects.forEach((p: any) => {
                          addEvent(p.shoot_date, 'shoot', p)
                          addEvent(p.draft_due, 'draft', p)
                          addEvent(p.delivery_due, 'delivery', p)
                          ;(p.shoot_dates || []).forEach((d: any) => addEvent(d.date, 'shoot', p))
                        })
                        const typeColors: Record<string, string> = { shoot: 'rgba(210,175,80,0.9)', draft: 'rgba(100,150,220,0.9)', delivery: 'rgba(100,200,130,0.9)' }
                        const typeLabels: Record<string, string> = { shoot: 'Shoot', draft: 'Brief/draft due', delivery: 'Delivery due' }
                        return (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                              {['M','T','W','T','F','S','S'].map((d: string, i: number) => <div key={i} style={{ fontSize: 9, textAlign: 'center', color: 'rgba(200,194,187,0.3)' }}>{d}</div>)}
                            </div>
                            {weeks.map((week: any, wi: number) => (
                              <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
                                {week.map((day: any, di: number) => {
                                  const key = day.toISOString().split('T')[0]
                                  const events = eventsByDate[key] || []
                                  const isToday = day.toDateString() === new Date().toDateString()
                                  const isPast = day < today
                                  const hasEvents = events.length > 0
                                  return (
                                    <div key={di} onClick={() => setDayTodoDate(key)} style={{ height: 44, borderRadius: 3, background: hasEvents ? 'rgba(200,194,187,0.04)' : 'transparent', border: '0.5px solid ' + (isToday ? 'rgba(200,194,187,0.5)' : hasEvents ? 'rgba(200,194,187,0.12)' : 'rgba(200,194,187,0.05)'), padding: '3px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                                      <div style={{ fontSize: 9, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isPast ? 'rgba(200,194,187,0.18)' : 'rgba(200,194,187,0.45)', lineHeight: 1 }}>{day.getDate()}</div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 3 }}>
                                        {events.slice(0, 4).map((ev: any, ei: number) => (
                                          <div key={ei} style={{ width: 5, height: 5, borderRadius: '50%', background: typeColors[ev.type] || '#C8C2BB' }} />
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(200,194,187,0.07)' }}>
                              {[['rgba(210,175,80,0.9)', 'Shoot'], ['rgba(100,150,220,0.9)', 'Brief/Draft'], ['rgba(100,200,130,0.9)', 'Delivery']].map(([color, label]) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                                  <span style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
                                </div>
                              ))}
                            </div>
                            {dayTodoDate && (() => {
                              const dayEvents = eventsByDate[dayTodoDate] || []
                              const label = new Date(dayTodoDate + 'T12:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
                              return (
                                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDayTodoDate(null)}>
                                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
                                      <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{label}</div>
                                      <button onClick={() => setDayTodoDate(null)} style={{ fontSize: 18, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                                    </div>
                                    <div style={{ padding: '10px 14px' }}>
                                      {dayEvents.length === 0 ? (
                                        <div style={{ padding: '20px 6px', fontSize: 12, color: 'rgba(200,194,187,0.3)', textAlign: 'center' }}>Nothing due this day</div>
                                      ) : dayEvents.map((ev: any, i: number) => (
                                        <div key={i} onClick={() => { setDayTodoDate(null); setModalProject(ev.project) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 5, cursor: 'pointer', borderBottom: i < dayEvents.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: typeColors[ev.type] || '#C8C2BB', flexShrink: 0 }} />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.project.title}</div>
                                            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{typeLabels[ev.type] || ev.type} · {ev.project.client}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>To do</div>
                  <button onClick={() => router.push('/portal/studio/todos')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                </div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
                    <input value={newTodoText} onChange={e => setNewTodoText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="Add a task..." style={{ flex: 1, minWidth: 180, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    {(() => {
                      const todayStr = new Date().toISOString().split('T')[0]
                      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
                      const tomorrowStr = tomorrow.toISOString().split('T')[0]
                      return (
                        <>
                          <button onClick={() => setNewTodoDate(d => d === todayStr ? '' : todayStr)} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 4, border: `0.5px solid ${newTodoDate === todayStr ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newTodoDate === todayStr ? 'rgba(200,194,187,0.08)' : 'transparent', color: newTodoDate === todayStr ? '#C8C2BB' : 'rgba(200,194,187,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>Today</button>
                          <button onClick={() => setNewTodoDate(d => d === tomorrowStr ? '' : tomorrowStr)} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 4, border: `0.5px solid ${newTodoDate === tomorrowStr ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newTodoDate === tomorrowStr ? 'rgba(200,194,187,0.08)' : 'transparent', color: newTodoDate === tomorrowStr ? '#C8C2BB' : 'rgba(200,194,187,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>Tomorrow</button>
                        </>
                      )
                    })()}
                    <input type="date" value={newTodoDate} onChange={e => setNewTodoDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={addTodo} disabled={!newTodoText.trim()} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 4, background: newTodoText.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: newTodoText.trim() ? '#111' : 'rgba(200,194,187,0.3)', border: 'none', cursor: newTodoText.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>+ Add</button>
                  </div>
                  {todos.length === 0 ? (
                    <div style={{ padding: '10px 4px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Nothing on the list — add a task above</div>
                  ) : todos.slice(0, 8).map((t: any) => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const overdue = t.due_date && !t.done && t.due_date < todayStr
                    const dateLabel = t.due_date ? (t.due_date === todayStr ? 'Today' : (() => { const tmw = new Date(); tmw.setDate(tmw.getDate() + 1); return t.due_date === tmw.toISOString().split('T')[0] ? 'Tomorrow' : new Date(t.due_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) })()) : null
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <div onClick={() => toggleTodo(t.id, t.done)} style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${t.done ? 'rgba(100,200,130,0.6)' : 'rgba(200,194,187,0.25)'}`, background: t.done ? 'rgba(100,200,130,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                          {t.done && <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.9)' }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, color: t.done ? 'rgba(200,194,187,0.3)' : '#C8C2BB', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</div>
                        {dateLabel && <span style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: overdue ? 'rgba(210,90,90,0.8)' : 'rgba(200,194,187,0.35)' }}>{overdue ? '⚠ ' : ''}{dateLabel}</span>}
                        <button onClick={() => deleteTodo(t.id)} style={{ fontSize: 14, color: 'rgba(200,194,187,0.25)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeView === 'projects' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Projects</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>8 active · 2 awaiting delivery · 24 completed</div></div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={s.panel}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Project','Category','Shoot date','Budget','Spent','Progress','Status'].map(h => <th key={h} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', padding: '10px 18px', textAlign: 'left', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontWeight: 400 }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[
                      { name: '14 Clifton Rd', client: 'Blackwell Properties', cat: 'Property', date: '14 Jun', budget: '$1,480', spent: '$1,120', progress: 80, status: 'Editing', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)' },
                      { name: 'Orchard Lane Dev.', client: 'Blackwell Properties', cat: 'Property', date: '28 Jun', budget: '$2,100', spent: '$880', progress: 45, status: 'Shooting', sc: 'rgba(210,175,80,0.85)', sb: 'rgba(65,52,18,0.5)' },
                      { name: 'Black Barn — Brand', client: 'Black Barn Retreats', cat: 'Commercial', date: '19 Jun', budget: '$1,780', spent: '$340', progress: 20, status: 'Pre-prod', sc: 'rgba(100,150,220,0.85)', sb: 'rgba(25,45,80,0.5)' },
                      { name: 'Elephant Hill Winery', client: 'Elephant Hill', cat: 'Commercial', date: '2 Jun', budget: '$1,330', spent: '$1,290', progress: 95, status: 'Review', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)' },
                      { name: 'Mission Heights', client: "Bayleys Hawke's Bay", cat: 'Property', date: '17 Jun', budget: '$890', spent: '—', progress: 5, status: 'Scheduled', sc: 'rgba(100,150,220,0.85)', sb: 'rgba(25,45,80,0.5)' },
                    ].map((p, i) => (
                      <tr key={i} style={{ cursor: 'pointer' }}>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}><div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{p.name}</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.client}</div></td>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}><span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: 'rgba(200,194,187,0.1)', color: '#C8C2BB', border: '0.5px solid rgba(200,194,187,0.2)' }}>{p.cat}</span></td>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.date}</td>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', fontSize: 12, color: '#C8C2BB' }}>{p.budget}</td>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', fontSize: 12, color: 'rgba(100,200,130,0.85)' }}>{p.spent}</td>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 60, height: 3, background: 'rgba(200,194,187,0.08)', borderRadius: 2 }}><div style={{ height: '100%', width: `${p.progress}%`, background: '#C8C2BB', opacity: 0.6, borderRadius: 2 }} /></div>
                            <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.progress}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>{pill(p.status, p.sc, p.sb)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* ===== SCHEDULE ===== */}
        {activeView === 'schedule' && (() => {
          const now = new Date()
          // "Enquiry" stage covers both brand-new enquiries and property jobs whose
          // brief has been sent but not yet approved by the client (approval is what
          // advances a project to Pre-Production) — so this one filter covers both.
          const preProd = scheduleProjects
            .filter((p: any) => p.stage === 'Enquiry')
            .sort((a: any, b: any) => {
              const aDate = a.draft_due || a.shoot_date || '9999'
              const bDate = b.draft_due || b.shoot_date || '9999'
              return aDate < bDate ? -1 : 1
            })
          // Each project can contribute more than one upcoming shoot: its primary
          // shoot_date plus any additional shoot_dates entries added for multi-day jobs.
          const upcomingShoots = scheduleProjects
            .flatMap((p: any) => {
              const occurrences: { key: string; p: any; date: string; note?: string }[] = []
              if (p.shoot_date && new Date(p.shoot_date) >= now) occurrences.push({ key: p.id, p, date: p.shoot_date })
              ;(p.shoot_dates || []).forEach((d: any) => {
                if (d.date && new Date(d.date) >= now) occurrences.push({ key: p.id + '-' + d.id, p, date: d.date, note: d.notes || 'Additional shoot date' })
              })
              return occurrences
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          function ProjectRow({ p, i, total, displayDate, note }: { p: any; i: number; total: number; displayDate?: string; note?: string }) {
            const dateVal = displayDate || p.shoot_date
            const STAGE_C: Record<string,any> = {
              'Enquiry': {color:'rgba(200,194,187,0.55)',bg:'rgba(200,194,187,0.06)'},
              'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'},
              'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'},
              'Post-Production': {color:'rgba(210,90,90,0.9)',bg:'rgba(50,25,80,0.4)'},
              'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'},
              'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'},
            }
            const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
            return (
              <div onClick={() => { setModalProject(p); setModalEditing(false) }} style={{ display: 'flex', gap: 14, padding: '13px 18px', borderBottom: i < total - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer', alignItems: 'center' }}>
                {dateVal ? (
                  <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5, padding: '6px 4px' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{new Date(dateVal + 'T12:00:00').getDate()}</div>
                    <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{new Date(dateVal + 'T12:00:00').toLocaleDateString('en-NZ',{month:'short'})}</div>
                  </div>
                ) : (
                  <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.15)', border: '0.5px solid rgba(200,194,187,0.06)', borderRadius: 5, padding: '6px 4px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.25)', textTransform: 'uppercase' }}>No date</div>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>
                    {p.client}
                    {p.address ? ' · ' + p.address.split(',')[0] : ''}
                    {note ? ' · ' + note : ''}
                    {p.draft_due ? ' · Brief due: ' + new Date(p.draft_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ width: 60, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: p.progress + '%', background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                </div>
              </div>
            )
          }

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic' }}>Shoot Schedule</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{upcomingShoots.length} upcoming shoot{upcomingShoots.length !== 1 ? 's' : ''}{userRole === 'studio' ? ` · ${preProd.length} enquir${preProd.length !== 1 ? 'ies' : 'y'} / awaiting brief` : ''}</div>
                </div>
                <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
              </div>
              <div style={{ padding: 28, display: 'grid', gridTemplateColumns: userRole === 'studio' ? '1fr 1fr' : '1fr', gap: 20 }}>
                {userRole === 'studio' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(100,150,220,0.9)' }} />
                      <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Enquiries & awaiting brief</span>
                      <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)', marginLeft: 4 }}>sorted by brief due then shoot date</span>
                    </div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      {preProd.length === 0 ? (
                        <div style={{ padding: '28px 18px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No enquiries or projects awaiting a brief</div>
                      ) : preProd.map((p: any, i: number) => <ProjectRow key={p.id} p={p} i={i} total={preProd.length} />)}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,175,80,0.9)' }} />
                    <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Upcoming shoots</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)', marginLeft: 4 }}>sorted by shoot date</span>
                  </div>
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                    {upcomingShoots.length === 0 ? (
                      <div style={{ padding: '28px 18px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No upcoming shoots scheduled</div>
                    ) : upcomingShoots.map((occ, i: number) => <ProjectRow key={occ.key} p={occ.p} i={i} total={upcomingShoots.length} displayDate={occ.date} note={occ.note} />)}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* ===== BOOKINGS ===== */}
        {activeView === 'bookings' && userRole !== 'studio' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Booking Requests</div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28, textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔒</div>
              <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)' }}>You don't have access to booking requests.</div>
            </div>
          </div>
        )}
        {activeView === 'bookings' && userRole === 'studio' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Booking Requests</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{bookingCount} pending request{bookingCount !== 1 ? 's' : ''} awaiting review</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bookings.length === 0 && (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '40px 28px', textAlign: 'center', color: 'rgba(200,194,187,0.3)', fontSize: 13 }}>
                  No pending booking requests
                </div>
              )}
              {bookings.map((booking, i) => (
                <div key={booking.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{booking.address || booking.shoot_package || 'New booking'}</span>
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: 'rgba(200,194,187,0.1)', color: '#C8C2BB', border: '0.5px solid rgba(200,194,187,0.2)' }}>{booking.category}</span>
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: 'rgba(210,175,80,0.15)', color: 'rgba(210,175,80,0.9)', border: '0.5px solid rgba(210,175,80,0.25)' }}>Pending</span>
                      </div>
                       <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:12 }}>
                         <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Client</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.client_name || booking.client_email}</div></div>
                         <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Package</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.shoot_package || '-'}</div></div>
                         <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Deliverables</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.deliverables || '-'}</div></div>
                         <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Addons</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.addons || 'None'}</div></div>
                         <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Preferred date</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.preferred_date || 'TBC'}{booking.preferred_time ? ' at ' + formatTime12(booking.preferred_time) : ''}</div></div>
                         <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Total</div><div style={{ fontSize:12, color:'rgba(100,200,130,0.9)' }}>{booking.total || '-'}</div></div>
                         {booking.draft_due && <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Draft due</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.draft_due}</div></div>}
                         {booking.delivery_due && <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Delivery due</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.delivery_due}</div></div>}
                         {booking.property_live_date && <div><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Property goes live</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.property_live_date}</div></div>}
                         {booking.address && <div style={{ gridColumn:'span 3' }}><div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Address</div><div style={{ fontSize:12, color:'#C8C2BB' }}>{booking.address}</div></div>}
                       </div>
                       {booking.notes && (
                         <div style={{ marginTop:14, paddingTop:14, borderTop:'0.5px solid rgba(200,194,187,0.07)' }}>
                           <div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>Notes</div>
                           <div style={{ fontSize:12, color:'rgba(200,194,187,0.6)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{booking.notes}</div>
                         </div>
                       )}
                      </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => { setSelectedBooking(booking); setShootDate(booking.preferred_date || ''); setMeetingMode(false); setScheduleMonthOffset(0); setScheduleModal(true) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Confirm + create project</button>
                      <button onClick={() => { setSelectedBooking(booking); setShootDate(''); setMeetingMode(true); setScheduleMonthOffset(0); setScheduleModal(true) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(100,150,220,0.35)', color: 'rgba(100,150,220,0.9)', background: 'rgba(100,150,220,0.08)', cursor: 'pointer', fontFamily: 'inherit' }}>Book a meeting</button>
                      <button onClick={() => declineBooking(booking.id)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.4)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Decline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeView === 'team' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Team & Time Tracking</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>June 2026 · 4 team members · 94h logged this month</div></div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[['Total hours — Jun','94h'],['Shoot hours','52h'],['Edit hours','38h'],['Labour cost est.','$4,700']].map(([label, value]) => (
                  <div key={label} style={{ ...s.panel, padding: '14px 16px' }}><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 6 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 500, color: '#fff' }}>{value}</div></div>
                ))}
              </div>
              <div style={s.panel}>
                {[
                  { initials: 'JD', name: 'Jordan D. — Director / Shooter', meta: '5 projects · 35h shot · 0h edit', hours: '35h', pct: 88 },
                  { initials: 'SK', name: 'Sam K. — Shooter / Editor', meta: '4 projects · 18h shot · 10h edit', hours: '28h', pct: 70 },
                  { initials: 'MT', name: 'Mia T. — Editor', meta: '3 projects · 0h shot · 22h edit', hours: '22h', pct: 55 },
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < 2 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{t.initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{t.meta}</div>
                      <div style={{ height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginTop: 6 }}><div style={{ height: '100%', width: `${t.pct}%`, background: '#C8C2BB', opacity: 0.45, borderRadius: 2 }} /></div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{t.hours}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== CHANGE REQUESTS (part of bookings view) ===== */}
        {activeView === 'bookings' && userRole === 'studio' && changeRequests.length > 0 && (
          <div style={{ padding: '0 28px 28px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Client change requests</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {changeRequests.map((cr: any) => (
                <div key={cr.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(160,100,220,0.25)', borderRadius: 7, padding: '18px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{cr.project_title || 'Project'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{cr.client_name} · {new Date(cr.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}</div>
                    </div>
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(210,90,90,0.15)', color: 'rgba(210,90,90,0.9)', border: '0.5px solid rgba(160,100,220,0.3)' }}>Change request</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.7)', lineHeight: 1.7, background: 'rgba(210,90,90,0.05)', borderRadius: 5, padding: '10px 14px', marginBottom: 12, border: '0.5px solid rgba(160,100,220,0.1)' }}>{cr.message}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {cr.type === 'cancellation' ? (
                      <>
                        <button onClick={async () => { if (!(await confirmDialog('Accept cancellation and archive this project?'))) return; if (cr.project_id) await supabase.from('projects1').update({ archived: true }).eq('id', cr.project_id); await supabase.from('change_requests').update({ status: 'resolved' }).eq('id', cr.id); await supabase.from('notifications').insert([{ user_email: cr.client_email, type: 'cancellation_accepted', title: 'Booking cancelled', message: 'Your cancellation request for ' + cr.project_title + ' has been accepted.', project_id: cr.project_id, read: false }]); setChangeRequests((p) => p.filter((r) => r.id !== cr.id)); setChangeRequestCount((c) => c - 1) }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: 'rgba(210,90,90,0.15)', color: 'rgba(210,90,90,0.9)', border: '0.5px solid rgba(210,90,90,0.3)', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Accept cancellation</button>
                        <button onClick={async () => { await supabase.from('change_requests').update({ status: 'resolved' }).eq('id', cr.id); await supabase.from('notifications').insert([{ user_email: cr.client_email, type: 'cancellation_declined', title: 'Cancellation declined', message: 'Your cancellation request for ' + cr.project_title + ' has been declined. Please contact us to discuss.', project_id: cr.project_id, read: false }]); setChangeRequests((p) => p.filter((r) => r.id !== cr.id)); setChangeRequestCount((c) => c - 1) }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Decline</button>
                      </>
                    ) : (
                      <>
                        <button onClick={async () => { await supabase.from('change_requests').update({ status: 'resolved' }).eq('id', cr.id); setChangeRequests((p) => p.filter((r) => r.id !== cr.id)); setChangeRequestCount((c) => c - 1) }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Mark resolved</button>
                        <button onClick={() => { setRespondingToCR(cr); setShootDate(''); setStartTime('08:00'); setEndTime('17:00'); setScheduleMonthOffset(0); setScheduleModal(true) }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', background: 'rgba(210,90,90,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>Schedule new date</button>
                      </>
                    )}
                    {cr.project_id && <button onClick={() => router.push('/portal/studio/projects?open=' + cr.project_id)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>View project</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== EQUIPMENT ===== */}
        {activeView === 'equipment' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Equipment</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>14 items tracked · 1 due for service</div></div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[['Total asset value','$68,400'],['Drones','2'],['Cameras','3'],['Lenses & accessories','9']].map(([label, value]) => (
                  <div key={label} style={{ ...s.panel, padding: '14px 16px' }}><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 6 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 500, color: '#fff' }}>{value}</div></div>
                ))}
              </div>
              <div style={s.panel}>
                {[
                  { name: 'Sony FX3 — Body #1', detail: 'Serial: FX3-00123 · Purchased Jan 2024', status: 'Operational', value: '$5,200' },
                  { name: 'Sony FX3 — Body #2', detail: 'Serial: FX3-00124 · Purchased Mar 2024', status: 'Operational', value: '$5,200' },
                  { name: 'DJI Mavic 3 Pro', detail: 'Serial: DJI-M3P-789 · Last service: Mar 2026', status: 'Service due', value: '$4,800' },
                  { name: 'DJI Air 3 — Backup', detail: 'Serial: DJI-A3-012 · Last service: May 2026', status: 'Operational', value: '$2,400' },
                ].map((eq, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < 3 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{eq.name}</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{eq.detail}</div></div>
                    {pill(eq.status, eq.status === 'Operational' ? 'rgba(100,200,130,0.85)' : 'rgba(210,175,80,0.85)', eq.status === 'Operational' ? 'rgba(30,70,45,0.5)' : 'rgba(65,52,18,0.5)')}
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', minWidth: 50, textAlign: 'right' }}>{eq.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== FINANCE ===== */}
        {activeView === 'finance' && userRole === 'editor' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>P&L Overview</div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28, textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🔒</div>
              <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)' }}>You don't have access to financial information.</div>
            </div>
          </div>
        )}
        {activeView === 'finance' && userRole === 'studio' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(100,200,130,0.1)', border: '0.5px solid rgba(100,200,130,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💰</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>P&L Overview</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: xeroStatus?.connected ? 'rgba(100,200,130,0.8)' : 'rgba(200,194,187,0.25)', boxShadow: xeroStatus?.connected ? '0 0 6px rgba(100,200,130,0.6)' : 'none' }} />
                    {xeroStatus?.connected ? `Live from Xero — ${xeroStatus.tenantName || 'connected org'}` : 'Not connected to Xero'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {xeroStatus?.connected && <button onClick={disconnectXero} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.7)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect Xero</button>}
                <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
              </div>
            </div>
            {xeroStatus === null ? (
              <div style={{ padding: 28, textAlign: 'center', paddingTop: 80, color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Checking Xero connection...</div>
            ) : !xeroStatus?.connected ? (
              <div style={{ padding: 28, textAlign: 'center', paddingTop: 80 }}>
                <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>📊</div>
                <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', marginBottom: 16 }}>Connect Xero to see your real P&L here</div>
                <button onClick={() => connectXero()} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Connect Xero →</button>
              </div>
            ) : pnlLoading || !pnl ? (
              <div style={{ padding: 28, textAlign: 'center', paddingTop: 80, color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading P&L from Xero...</div>
            ) : pnl.error ? (
              <div style={{ padding: 28, textAlign: 'center', paddingTop: 80, color: 'rgba(210,90,90,0.8)', fontSize: 13 }}>{pnl.error}</div>
            ) : (() => {
              const kpiCard = (bg: string, borderCol: string) => ({ background: `linear-gradient(135deg, ${bg} 0%, rgba(20,24,32,0.95) 100%)`, border: `0.5px solid ${borderCol}`, borderRadius: 10, padding: '16px 18px', position: 'relative' as const, overflow: 'hidden' as const })
              const glow = (color: string) => <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
              const unbilled = dashProjects.filter((p: any) => p.amount && !p.invoice_id)
              const pipelineTotal = unbilled.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
              const margin = pnl.revenueTotal ? Math.round((pnl.netProfit / pnl.revenueTotal) * 100) : 0
              const outstandingItems = pnl.outstandingInvoices?.items || []
              const outstandingTotal = pnl.outstandingInvoices?.outstandingTotal || 0
              const overdueTotal = pnl.outstandingInvoices?.overdueTotal || 0
              const recentPayments = recentInvoices.filter((i: any) => i.status === 'paid').sort((a: any, b: any) => new Date(b.paid_at || b.created_at).getTime() - new Date(a.paid_at || a.created_at).getTime()).slice(0, 6)
              const sectionLabel = (icon: string, text: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12 }}>{icon}</span>
                  <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'rgba(200,194,187,0.35)' }}>{text}</span>
                </div>
              )

              return (
                <div style={{ padding: 28 }}>
                  {sectionLabel('📌', 'Overview')}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
                    <div style={kpiCard('rgba(30,50,38,0.6)', 'rgba(100,200,130,0.2)')}>
                      {glow('rgba(100,200,130,0.5)')}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>YTD Revenue</span>
                        <span style={{ fontSize: 14 }}>📈</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>${(pnl.revenueTotal || 0).toLocaleString()}</div>
                    </div>
                    <div style={kpiCard('rgba(50,30,30,0.6)', 'rgba(210,90,90,0.2)')}>
                      {glow('rgba(210,90,90,0.5)')}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>YTD Expenses</span>
                        <span style={{ fontSize: 14 }}>📉</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>${(pnl.expensesTotal || 0).toLocaleString()}</div>
                    </div>
                    <div style={kpiCard('rgba(25,45,80,0.6)', 'rgba(100,150,220,0.2)')}>
                      {glow('rgba(100,150,220,0.5)')}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Net Profit YTD</span>
                        <span style={{ fontSize: 14 }}>💎</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>${(pnl.netProfit || 0).toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'rgba(100,150,220,0.7)', marginTop: 4 }}>{margin}% margin</div>
                    </div>
                    <div style={kpiCard('rgba(65,52,18,0.6)', 'rgba(210,175,80,0.25)')}>
                      {glow('rgba(210,175,80,0.5)')}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(210,175,80,0.6)' }}>Forecasted Pipeline</span>
                        <span style={{ fontSize: 14 }}>⏳</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(210,175,80,0.95)' }}>${pipelineTotal.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', marginTop: 4 }}>{unbilled.length} not yet invoiced</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12 }}>📊</span>
                      <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Trends</span>
                    </div>
                    <div style={{ display: 'flex', gap: 3, background: 'rgba(200,194,187,0.05)', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 6, padding: 3 }}>
                      {[3, 6, 12].map(m => (
                        <button key={m} onClick={() => setPnlMonths(m)} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 4, border: 'none', background: pnlMonths === m ? '#C8C2BB' : 'transparent', color: pnlMonths === m ? '#111' : 'rgba(200,194,187,0.4)', fontWeight: pnlMonths === m ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>{m}mo</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
                    {pnl.monthly && pnl.monthly.length > 0 && (
                      <div style={s.panel}>
                        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Monthly income</span></div>
                        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, borderBottom: '0.5px solid rgba(200,194,187,0.06)', margin: '0 4px' }}>
                          {(() => {
                            const max = Math.max(...pnl.monthly.map((m: any) => m.revenue), 1)
                            return pnl.monthly.map((m: any) => (
                              <div key={m.label} title={`$${m.revenue.toLocaleString()}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.5)', whiteSpace: 'nowrap' }}>${m.revenue >= 1000 ? Math.round(m.revenue / 1000) + 'k' : m.revenue.toLocaleString()}</div>
                                <div style={{ width: '100%', maxWidth: 34, height: `${Math.max(3, (m.revenue / max) * 100)}%`, background: m.net >= 0 ? 'linear-gradient(180deg, rgba(100,200,130,0.75), rgba(100,200,130,0.35))' : 'linear-gradient(180deg, rgba(210,90,90,0.75), rgba(210,90,90,0.35))', borderRadius: '4px 4px 0 0' }} />
                              </div>
                            ))
                          })()}
                        </div>
                        <div style={{ display: 'flex', gap: 10, padding: '10px 20px 4px' }}>
                          {pnl.monthly.map((m: any) => (
                            <div key={m.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(200,194,187,0.3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{m.label.split(' ')[0]}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pnl.cashFlow && pnl.cashFlow.length > 0 && (
                      <div style={s.panel}>
                        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Cash in & out</span>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(200,194,187,0.4)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(100,200,130,0.6)' }} />In</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(200,194,187,0.4)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,90,90,0.6)' }} />Out</span>
                          </div>
                        </div>
                        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, borderBottom: '0.5px solid rgba(200,194,187,0.06)', margin: '0 4px' }}>
                          {(() => {
                            const max = Math.max(...pnl.cashFlow.flatMap((m: any) => [m.cashIn, m.cashOut]), 1)
                            return pnl.cashFlow.map((m: any) => (
                              <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%' }} title={`In $${m.cashIn.toLocaleString()} / Out $${m.cashOut.toLocaleString()}`}>
                                  <div style={{ width: 13, height: `${Math.max(3, (m.cashIn / max) * 100)}%`, background: 'linear-gradient(180deg, rgba(100,200,130,0.75), rgba(100,200,130,0.35))', borderRadius: '3px 3px 0 0' }} />
                                  <div style={{ width: 13, height: `${Math.max(3, (m.cashOut / max) * 100)}%`, background: 'linear-gradient(180deg, rgba(210,90,90,0.75), rgba(210,90,90,0.35))', borderRadius: '3px 3px 0 0' }} />
                                </div>
                              </div>
                            ))
                          })()}
                        </div>
                        <div style={{ display: 'flex', gap: 10, padding: '10px 20px 4px' }}>
                          {pnl.cashFlow.map((m: any) => (
                            <div key={m.label} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: 'rgba(200,194,187,0.3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>{m.label.split(' ')[0]}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {sectionLabel('🧾', 'Xero P&L breakdown')}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={s.panel}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Revenue</span></div>
                      {(pnl.revenueBreakdown || []).map((row: any) => (
                        <div key={row.label} style={{ padding: '10px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><div style={{ fontSize: 12, color: '#C8C2BB' }}>{row.label}</div><div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(100,200,130,0.85)' }}>${row.amount.toLocaleString()}</div></div>
                          <div style={{ height: 3, background: 'rgba(200,194,187,0.06)', borderRadius: 2 }}><div style={{ height: '100%', width: `${pnl.revenueTotal ? Math.min(100, (row.amount / pnl.revenueTotal) * 100) : 0}%`, background: 'rgba(100,200,130,0.5)', borderRadius: 2 }} /></div>
                        </div>
                      ))}
                      {(pnl.revenueBreakdown || []).length === 0 && <div style={{ padding: '10px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No revenue lines this period</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(61,71,86,0.15)' }}><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total revenue</div><div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(100,200,130,0.85)' }}>${(pnl.revenueTotal || 0).toLocaleString()}</div></div>
                    </div>
                    <div style={s.panel}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Expenses</span></div>
                      {(pnl.expensesBreakdown || []).map((row: any) => (
                        <div key={row.label} style={{ padding: '10px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><div style={{ fontSize: 12, color: '#C8C2BB' }}>{row.label}</div><div style={{ fontSize: 13, color: 'rgba(210,90,90,0.85)' }}>−${row.amount.toLocaleString()}</div></div>
                          <div style={{ height: 3, background: 'rgba(200,194,187,0.06)', borderRadius: 2 }}><div style={{ height: '100%', width: `${pnl.expensesTotal ? Math.min(100, (row.amount / pnl.expensesTotal) * 100) : 0}%`, background: 'rgba(210,90,90,0.5)', borderRadius: 2 }} /></div>
                        </div>
                      ))}
                      {(pnl.expensesBreakdown || []).length === 0 && <div style={{ padding: '10px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No expense lines this period</div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(61,71,86,0.15)' }}><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total expenses</div><div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(210,90,90,0.85)' }}>−${(pnl.expensesTotal || 0).toLocaleString()}</div></div>
                    </div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, rgba(30,50,38,0.5) 0%, rgba(20,24,32,0.95) 100%)', border: '0.5px solid rgba(100,200,130,0.25)', borderRadius: 10, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(100,200,130,0.5), transparent)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>Net profit</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{pnl.reportDate ? `As of ${pnl.reportDate}` : ''} · {margin}% margin</div>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 600, color: 'rgba(100,200,130,0.9)' }}>${(pnl.netProfit || 0).toLocaleString()}</div>
                  </div>

                  {sectionLabel('💳', 'Invoicing')}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={s.panel}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Outstanding invoices</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(210,175,80,0.9)' }}>${outstandingTotal.toLocaleString()}</span>
                        </div>
                        {overdueTotal > 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(210,90,90,0.9)', background: 'rgba(210,90,90,0.1)', border: '0.5px solid rgba(210,90,90,0.25)', borderRadius: 3, padding: '2px 8px', marginTop: 8 }}>⚠ ${overdueTotal.toLocaleString()} overdue</div>}
                      </div>
                      {outstandingItems.length === 0 ? (
                        <div style={{ padding: '14px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Nothing outstanding</div>
                      ) : outstandingItems.map((inv: any) => (
                        <div key={inv.invoiceId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: inv.overdue ? 'rgba(210,90,90,0.12)' : 'rgba(210,175,80,0.12)', color: inv.overdue ? 'rgba(210,90,90,0.9)' : 'rgba(210,175,80,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{(inv.contact || '?').charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#C8C2BB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.contact}{inv.invoiceNumber ? ' · ' + inv.invoiceNumber : ''}</div>
                            <div style={{ fontSize: 10, color: inv.overdue ? 'rgba(210,90,90,0.8)' : 'rgba(200,194,187,0.35)' }}>{inv.overdue ? 'Overdue — ' : 'Due '}{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '—'}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: inv.overdue ? 'rgba(210,90,90,0.9)' : 'rgba(210,175,80,0.85)', whiteSpace: 'nowrap' }}>${inv.amountDue.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                    <div style={s.panel}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Recent payments</span></div>
                      {recentPayments.length === 0 ? (
                        <div style={{ padding: '14px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No payments recorded yet</div>
                      ) : recentPayments.map((inv: any) => (
                        <div key={inv.id} onClick={() => router.push('/portal/studio/invoices')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(100,200,130,0.12)', color: 'rgba(100,200,130,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{(inv.client_name || inv.client_email || '?').charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#C8C2BB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.client_name || inv.client_email}</div>
                            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)' }}>Paid {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) : '—'}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(100,200,130,0.85)', whiteSpace: 'nowrap' }}>${(inv.total || 0).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ===== PITCH DECKS ===== */}
        {activeView === 'pitches' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Pitch Decks</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Create AI-drafted proposals and send to clients for review</div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
                <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New deck</button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={s.panel}>
                {[
                  { title: 'Orchard Lane — Social Content Campaign', client: 'Blackwell Properties', meta: 'Created 13 Jun 2026 · 5 sections', status: 'Awaiting review', sc: 'rgba(100,150,220,0.85)', sb: 'rgba(25,45,80,0.5)' },
                  { title: '14 Clifton Rd — Property Film & Photography', client: 'Blackwell Properties', meta: 'Sent 2 May 2026 · Accepted 4 May', status: 'Accepted', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)' },
                  { title: 'Black Barn — Season Brand Film 2026', client: 'Black Barn Retreats', meta: 'Sent 28 Apr 2026 · Accepted 1 May', status: 'Accepted', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)' },
                  { title: 'Ray White Napier — Quarterly Property Package', client: 'Ray White Napier', meta: 'Draft · Not sent', status: 'Draft', sc: 'rgba(200,194,187,0.6)', sb: 'rgba(200,194,187,0.1)' },
                ].map((deck, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < 3 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 34, borderRadius: 3, background: '#3D4756', border: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>▤</div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{deck.title}</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{deck.client} · {deck.meta}</div></div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {pill(deck.status, deck.sc, deck.sb)}
                      <button style={{ fontSize: 10, padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* SCHEDULE MODAL */}
      {scheduleModal && (selectedBooking || respondingToCR) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 6 }}>{respondingToCR ? 'Reschedule shoot' : meetingMode ? 'Book a meeting' : 'Schedule shoot'}</div>
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
              {respondingToCR ? (respondingToCR.project_title + ' · ' + respondingToCR.client_name) : (selectedBooking?.address || selectedBooking?.shoot_package) + ' · ' + (selectedBooking?.client_name || selectedBooking?.client_email)}
            </div>

            {eventLink ? (
              <div style={{ background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.25)', borderRadius: 6, padding: '16px 18px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,200,130,0.9)', marginBottom: 8 }}>✓ Calendar event created</div>
                <a href={eventLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>Open in Google Calendar →</a>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>{meetingMode ? 'Meeting date' : 'Shoot date'} {shootDate && '— ' + new Date(shootDate + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'})}</label>
                    {(() => {
                      const today = new Date(); today.setHours(0,0,0,0)
                      const viewMonth = new Date(today.getFullYear(), today.getMonth() + scheduleMonthOffset, 1)
                      const startDay = viewMonth.getDay() === 0 ? 6 : viewMonth.getDay() - 1
                      const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
                      const shootsByDate: Record<string, any[]> = {}
                      dashProjects.forEach((p: any) => {
                        if (p.shoot_date) {
                          if (!shootsByDate[p.shoot_date]) shootsByDate[p.shoot_date] = []
                          shootsByDate[p.shoot_date].push(p)
                        }
                      })
                      const shootDatesSet = new Set(Object.keys(shootsByDate))
                      const cells = []
                      for (let i = 0; i < startDay; i++) cells.push(null)
                      for (let d = 1; d <= daysInMonth; d++) cells.push(d)
                      const days = ['M','T','W','T','F','S','S']
                      return (
                        <div style={{ background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <button type="button" onClick={() => setScheduleMonthOffset(o => Math.max(0, o - 1))} disabled={scheduleMonthOffset === 0} style={{ background: 'transparent', border: 'none', color: scheduleMonthOffset === 0 ? 'rgba(200,194,187,0.15)' : 'rgba(200,194,187,0.6)', cursor: scheduleMonthOffset === 0 ? 'default' : 'pointer', fontSize: 13, padding: '2px 8px', fontFamily: 'inherit' }}>‹</button>
                            <div style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB', textAlign: 'center' }}>{viewMonth.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})}</div>
                            <button type="button" onClick={() => setScheduleMonthOffset(o => o + 1)} style={{ background: 'transparent', border: 'none', color: 'rgba(200,194,187,0.6)', cursor: 'pointer', fontSize: 13, padding: '2px 8px', fontFamily: 'inherit' }}>›</button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                            {days.map((d,i) => <div key={i} style={{ fontSize: 9, textAlign: 'center', color: 'rgba(200,194,187,0.3)' }}>{d}</div>)}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                            {cells.map((d, i) => {
                              if (!d) return <div key={i} />
                              const dateStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                              const hasShoot = shootDatesSet.has(dateStr)
                              const isSelected = shootDate === dateStr
                              const isPast = new Date(dateStr) < today
                              return (
                                <div key={i} style={{ position: 'relative' }} onMouseEnter={() => hasShoot && setHoveredDate(dateStr)} onMouseLeave={() => setHoveredDate(null)}>
                                  <div onClick={() => !isPast && setShootDate(dateStr)} style={{ height: 30, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: isPast ? 'default' : 'pointer', background: isSelected ? '#C8C2BB' : hasShoot ? 'rgba(210,175,80,0.12)' : 'transparent', border: '0.5px solid ' + (isSelected ? '#C8C2BB' : hasShoot ? 'rgba(210,175,80,0.35)' : 'rgba(200,194,187,0.06)') }}>
                                    <span style={{ fontSize: 11, fontWeight: isSelected ? 700 : 400, color: isSelected ? '#111' : isPast ? 'rgba(200,194,187,0.2)' : '#C8C2BB' }}>{d}</span>
                                    {hasShoot && !isSelected && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(210,175,80,0.9)', marginTop: 1 }} />}
                                  </div>
                                  {hasShoot && hoveredDate === dateStr && (
                                    <div style={{ position: 'absolute', bottom: '105%', left: '50%', transform: 'translateX(-50%)', background: '#14181F', border: '0.5px solid rgba(210,175,80,0.3)', borderRadius: 6, padding: '10px 12px', zIndex: 100, width: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                                      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(210,175,80,0.7)', marginBottom: 6 }}>Shoot booked</div>
                                      {(shootsByDate[dateStr] || []).map((proj: any, pi: number) => (
                                        <div key={pi} style={{ marginBottom: pi < (shootsByDate[dateStr] || []).length - 1 ? 8 : 0 }}>
                                          <div style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.title}</div>
                                          <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.5)' }}>{proj.client}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(200,194,187,0.07)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(210,175,80,0.9)' }} /><span style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)' }}>Shoot booked</span></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: '#C8C2BB' }} /><span style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)' }}>Selected</span></div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>Start time</label>
                    <select value={startTime} onChange={e => setStartTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>End time</label>
                    <select value={endTime} onChange={e => setEndTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>Duration</label>
                    <div style={{ fontSize: 12, color: '#C8C2BB', padding: '9px 0' }}>
                      {(() => { const s = startTime.split(':').map(Number); const e = endTime.split(':').map(Number); const mins = (e[0]*60+e[1]) - (s[0]*60+s[1]); return mins > 0 ? `${Math.floor(mins/60)}h ${mins%60 > 0 ? mins%60+'m' : ''}`.trim() : '—' })()}
                    </div>
                  </div>
                </div>

                <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5, padding: '12px 14px', marginBottom: 20, fontSize: 11, color: 'rgba(200,194,187,0.5)', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>Calendar invite will be sent to:</div>
                  <div>• cody@examplecontent.co.nz (Example Content)</div>
                  <div>• {selectedBooking?.client_email || respondingToCR?.client_email} (Client)</div>
                </div>

                {!calendarConnected && (
                  <div style={{ background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 5, padding: '10px 14px', marginBottom: 16, fontSize: 11, color: 'rgba(210,175,80,0.8)' }}>
                    Google isn't connected yet — creating this event will prompt you to connect.
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => { setScheduleModal(false); setEventLink(''); setRespondingToCR(null); setMeetingMode(false) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                {eventLink ? 'Close' : 'Cancel'}
              </button>
              {!eventLink && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button disabled={confirmingBooking || creatingEvent} onClick={async () => {
                    if (confirmingBooking || creatingEvent) return
                    setConfirmingBooking(true)
                    try {
                    if (respondingToCR && shootDate) {
                      if (respondingToCR.project_id) {
                        await supabase.from('projects1').update({ shoot_date: shootDate, general_notes: (respondingToCR.general_notes || '') + '\n\n[RESCHEDULED ' + new Date().toLocaleDateString('en-NZ') + '] New date: ' + new Date(shootDate + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ' at ' + formatTime12(startTime) }).eq('id', respondingToCR.project_id)
                      }
                      await supabase.from('change_requests').update({ status: 'resolved' }).eq('id', respondingToCR.id)
                      setChangeRequests((p: any[]) => p.filter((r: any) => r.id !== respondingToCR.id))
                      setChangeRequestCount((c: number) => c - 1)
                      // Notify client of rescheduled date
      await supabase.from('notifications').insert([{
        user_email: respondingToCR.client_email,
        type: 'change_confirmed',
        title: 'Shoot rescheduled',
        message: 'Your change request for ' + respondingToCR.project_title + ' has been confirmed. New shoot date: ' + new Date(shootDate + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ' at ' + formatTime12(startTime),
        project_id: respondingToCR.project_id || null,
        read: false,
      }])
      setRespondingToCR(null); setScheduleModal(false); setShootDate('')
                    } else if (meetingMode) {
                      const proj = await bookMeeting(selectedBooking)
                      setScheduleModal(false); setEventLink(''); setMeetingMode(false)
                      if (proj?.id) router.push('/portal/studio/projects/' + proj.id)
                    } else {
                      const proj = await confirmBooking(selectedBooking)
                      if (proj?.id && shootDate) { await supabase.from('projects1').update({ general_notes: (selectedBooking?.notes || '') + '\n\nShoot confirmed: ' + new Date(shootDate + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) + ' at ' + formatTime12(startTime) }).eq('id', proj.id) }
                      setScheduleModal(false); setEventLink('')
                      if (proj?.id) router.push('/portal/studio/projects/' + proj.id)
                    }
                    } finally { setConfirmingBooking(false) }
                  }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: confirmingBooking ? 'rgba(200,194,187,0.2)' : 'rgba(200,194,187,0.5)', background: 'transparent', cursor: confirmingBooking ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {confirmingBooking ? 'Saving...' : respondingToCR ? 'Confirm new date' : meetingMode ? 'Book meeting without calendar' : 'Confirm without calendar'}
                  </button>
                  {!respondingToCR && <button onClick={() => meetingMode ? createMeetingEvent(selectedBooking) : createCalendarEvent(selectedBooking)} disabled={creatingEvent || confirmingBooking || !shootDate} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: creatingEvent || confirmingBooking || !shootDate ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: creatingEvent || confirmingBooking || !shootDate ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', cursor: creatingEvent || confirmingBooking || !shootDate ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                    {creatingEvent ? 'Creating event...' : meetingMode ? '📅 Book meeting & add to calendar' : '📅 Confirm & add to calendar'}
                  </button>}
                </div>
              )}
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
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{modalProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{modalProject.client} · {modalProject.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!modalEditing ? (
                  <>
                    <button onClick={() => setModalEditing(true)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Edit</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModalEditing(false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveModalProject} disabled={modalSaving} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: modalSaved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: modalSaved ? 'rgba(100,200,130,0.9)' : '#111', border: modalSaved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{modalSaving ? 'Saving...' : modalSaved ? '✓ Saved' : 'Save'}</button>
                  </>
                )}
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {['Enquiry','Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Enquiry':'rgba(200,194,187,0.55)','Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(210,90,90,0.9)','Revisions':'rgba(220,120,60,0.9)','Awaiting Confirmation':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Enquiry','Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].indexOf(modalProject.stage)
                    const isDone = idx < stageIdx; const isCurrent = idx === stageIdx
                    return (
                      <div key={stage} onClick={() => setModalProject((p: any) => p ? { ...p, stage, progress: STAGE_PROGRESS[stage] } : p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
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
                  setModalProject((p: any) => p ? { ...p, progress: val, stage } : p)
                }} style={{ width: '100%', accentColor: '#C8C2BB', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[{ label: 'Client', key: 'client' }, { label: 'Email', key: 'email' }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input value={modalProject[key] || ''} onChange={e => setModalProject((p: any) => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] || '—'}</div>}
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{modalProject.category === 'Property' ? 'Property address' : 'Shoot location'}</div>
                  {modalEditing ? <input value={modalProject.address || ''} onChange={e => setModalProject((p: any) => p ? { ...p, address: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.address || '—'}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Stage</div>
                  {modalEditing ? (
                    <select value={modalProject.stage} onChange={e => setModalProject((p: any) => p ? { ...p, stage: e.target.value, progress: STAGE_PROGRESS[e.target.value] } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['Enquiry','Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.stage}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[{ label: 'Shoot date', key: 'shoot_date' }, { label: 'Draft due', key: 'draft_due' }, { label: 'Delivery date', key: 'delivery_due' }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input type="date" value={modalProject[key] || ''} onChange={e => setModalProject((p: any) => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] ? new Date(modalProject[key]).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : '-'}</div>}
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
                {modalEditing ? <input value={modalProject.drive_url || ''} onChange={e => setModalProject((p: any) => p ? { ...p, drive_url: e.target.value } : p)} placeholder="https://drive.google.com/drive/folders/..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : modalProject.drive_url ? <a href={modalProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>📁 Open project folder →</a> : <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.25)' }}>No folder linked</div>}
              </div>
              {(modalProject.general_notes || modalProject.editor_notes) && (
                <div style={{ marginBottom: 20 }}>
                  {modalProject.general_notes && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(200,194,187,0.04)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(200,194,187,0.08)' }}>{modalProject.general_notes}</div>
                    </div>
                  )}
                  {modalProject.editor_notes && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Editor notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(100,150,220,0.05)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(100,150,220,0.15)' }}>{modalProject.editor_notes}</div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false); router.push('/portal/studio/projects') }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>← Back to projects</button>
              </div>
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
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{modalProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{modalProject.client} · {modalProject.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!modalEditing ? (
                  <>
                    <button onClick={() => setModalEditing(true)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Edit</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModalEditing(false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveModalProject} disabled={modalSaving} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: modalSaved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: modalSaved ? 'rgba(100,200,130,0.9)' : '#111', border: modalSaved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{modalSaving ? 'Saving...' : modalSaved ? '✓ Saved' : 'Save'}</button>
                  </>
                )}
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {['Enquiry','Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Enquiry':'rgba(200,194,187,0.55)','Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(210,90,90,0.9)','Revisions':'rgba(220,120,60,0.9)','Awaiting Confirmation':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Enquiry','Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].indexOf(modalProject.stage)
                    const isDone = idx < stageIdx; const isCurrent = idx === stageIdx
                    return (
                      <div key={stage} onClick={() => setModalProject((p: any) => p ? { ...p, stage, progress: STAGE_PROGRESS[stage] } : p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
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
                  setModalProject((p: any) => p ? { ...p, progress: val, stage } : p)
                }} style={{ width: '100%', accentColor: '#C8C2BB', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[{ label: 'Client', key: 'client' }, { label: 'Email', key: 'email' }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input value={modalProject[key] || ''} onChange={e => setModalProject((p: any) => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] || '—'}</div>}
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{modalProject.category === 'Property' ? 'Property address' : 'Shoot location'}</div>
                  {modalEditing ? <input value={modalProject.address || ''} onChange={e => setModalProject((p: any) => p ? { ...p, address: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.address || '—'}</div>}
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Stage</div>
                  {modalEditing ? (
                    <select value={modalProject.stage} onChange={e => setModalProject((p: any) => p ? { ...p, stage: e.target.value, progress: STAGE_PROGRESS[e.target.value] } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['Enquiry','Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.stage}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[{ label: 'Shoot date', key: 'shoot_date' }, { label: 'Draft due', key: 'draft_due' }, { label: 'Delivery date', key: 'delivery_due' }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input type="date" value={modalProject[key] || ''} onChange={e => setModalProject((p: any) => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] ? new Date(modalProject[key]).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>}
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
                {modalEditing ? <input value={modalProject.drive_url || ''} onChange={e => setModalProject((p: any) => p ? { ...p, drive_url: e.target.value } : p)} placeholder="https://drive.google.com/drive/folders/..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : modalProject.drive_url ? <a href={modalProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>📁 Open project folder →</a> : <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.25)' }}>No folder linked</div>}
              </div>
              {(modalProject.general_notes || modalProject.editor_notes) && (
                <div style={{ marginBottom: 20 }}>
                  {modalProject.general_notes && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(200,194,187,0.04)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(200,194,187,0.08)' }}>{modalProject.general_notes}</div>
                    </div>
                  )}
                  {modalProject.editor_notes && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Editor notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(100,150,220,0.05)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(100,150,220,0.15)' }}>{modalProject.editor_notes}</div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false); router.push('/portal/studio/projects') }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>← Back to projects</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DELIVERY MODAL */}
      {deliveryModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setDeliveryModal(null)}>
          <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.15)', borderRadius:10, width:'100%', maxWidth:800, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>{deliveryModal.title}</div>
                <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)', marginTop:2 }}>{deliveryModal.client} · Delivered</div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => { setModalProject(deliveryModal); setModalEditing(false); setDeliveryModal(null) }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>View project →</button>
                <button onClick={() => setDeliveryModal(null)} style={{ fontSize:20, color:'rgba(200,194,187,0.4)', background:'transparent', border:'none', cursor:'pointer' }}>×</button>
              </div>
            </div>
            <div style={{ overflowY:'auto', flex:1, padding:24 }}>
              {deliveryModal.drive_url ? (
                <StudioDriveFolder driveUrl={deliveryModal.drive_url} />
              ) : (
                <div style={{ textAlign:'center', color:'rgba(200,194,187,0.25)', fontSize:13, padding:'40px 0' }}>No files uploaded yet</div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* GOOGLE CONNECT PROMPT */}
      {showConnectPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowConnectPrompt(false)}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 420, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Connect Google</div>
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.7, marginBottom: 20 }}>
              Link your Google account to send calendar invites for shoots and automatically create project folders in Drive. You can do this anytime — booking confirmations and folder creation will prompt you again if you skip it.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowConnectPrompt(false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Not now</button>
              <button onClick={connectGoogleCalendar} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Connect Google →</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
