'use client'
import StudioSidebar from './StudioSidebar'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StudioPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingCount, setBookingCount] = useState(0)
  const [dashProjects, setDashProjects] = useState<any[]>([])
  const [modalProject, setModalProject] = useState<any>(null)
  const [modalEditing, setModalEditing] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalSaved, setModalSaved] = useState(false)
  const [upcomingShoots, setUpcomingShoots] = useState<any[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([])

  const [scheduleModal, setScheduleModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [shootDate, setShootDate] = useState("")
  const [startTime, setStartTime] = useState("07:30")
  const [endTime, setEndTime] = useState("12:00")
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [eventLink, setEventLink] = useState("")


  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [briefData, setBriefData] = useState<Record<number, any>>({})
  const [briefLoading, setBriefLoading] = useState<Record<number, boolean>>({})


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setLoading(false)
      loadBookings()
    })
  }, [router])
  const STAGE_PROGRESS: Record<string, number> = {
    'Pre-Production': 10, 'Shooting': 35, 'Post-Production': 65, 'Revisions': 85, 'Invoicing': 100,
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
    const { data, error } = await supabase.from('bookings1').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    if (!error && data) {
      setBookings(data)
      setBookingCount(data.length)
    }
    const { data: projects } = await supabase.from('projects1').select('*').order('created_at', { ascending: false })
    if (projects) {
      const now = new Date()
      const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      setDashProjects(projects.filter((p: any) => p.stage !== 'Invoicing' || p.progress < 100))
      setUpcomingShoots(projects.filter((p: any) => {
        if (!p.shoot_date) return false
        const d = new Date(p.shoot_date)
        return d >= now && d <= in14
      }).sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime()))
      setRecentDeliveries(projects.filter((p: any) => p.stage === 'Invoicing' && p.progress === 100).slice(0, 3))
    }
  }

  async function connectGoogleCalendar() {
    const res = await fetch('/api/calendar?action=auth_url')
    const { url } = await res.json()
    window.open(url, '_blank', 'width=500,height=600')
    setTimeout(() => setCalendarConnected(true), 3000)
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
        alert('Please connect your Google Calendar first')
        connectGoogleCalendar()
      } else {
        alert('Calendar error: ' + data.error)
      }
    } catch (e) {
      console.error(e)
    }
    setCreatingEvent(false)
  }

  async function confirmBooking(booking: any) {
    await supabase.from('bookings1').update({ status: 'confirmed' }).eq('id', booking.id)
    const { data, error: projectError } = await supabase.from('projects1').insert([{
      title: booking.address || booking.shoot_package || 'New project',
      client: booking.client_name || booking.client_email || '',
      contact: booking.client_name || "",
      contact: '',
      email: booking.client_email || '',
      category: booking.category === 'property' ? 'Property' : 'Commercial',
      address: booking.address || '',
      stage: 'Pre-Production',
      shoot_date: booking.preferred_date || null,
      draft_due: booking.draft_due || null,
      delivery_due: booking.delivery_due || null,
      progress: 0,
      from_booking: true,
      general_notes: booking.notes || '',
      editor_notes: '',
      deliverables: [
        booking.shoot_package ? 'PACKAGE: ' + booking.shoot_package : '',
        booking.deliverables ? 'DELIVERABLES: ' + booking.deliverables : '',
        booking.addons ? 'ADD-ONS: ' + booking.addons : '',
      ].filter(Boolean).join('\n'),
    }]).select().single()
    if (projectError) {
      alert('Project error: ' + projectError.message)
      return null
    } else if (data) {
      const deliverables = []
      if (booking.shoot_package) deliverables.push({ id: '1', name: booking.shoot_package, done: false })
      if (booking.deliverables) deliverables.push({ id: '2', name: booking.deliverables, done: false })
      if (booking.addons) booking.addons.split(', ').filter(Boolean).forEach((a: string, i: number) => deliverables.push({ id: String(i + 3), name: a, done: false }))
      if (deliverables.length > 0) localStorage.setItem(`deliverables_${data.id}`, JSON.stringify(deliverables))
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
      { id: 'bookings', label: 'Booking Requests', badge: bookingCount > 0 ? String(bookingCount) : undefined },
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

      {/* SIDEBAR */}
      <StudioSidebar active={activeView} onViewChange={setActiveView} />

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Studio Dashboard</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{new Date().toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {bookingCount > 0 && (
                  <button onClick={() => setActiveView('bookings')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.4)', color: 'rgba(210,90,90,0.9)', background: 'rgba(210,90,90,0.08)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {bookingCount} new request{bookingCount !== 1 ? 's' : ''}
                  </button>
                )}
                <button onClick={() => router.push('/portal/studio/projects')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Overview</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
                {[
                  { label: 'Active projects', value: dashProjects.length, sub: dashProjects.filter((p: any) => p.stage === 'Shooting').length + ' shooting this week' },
                  { label: 'Pending requests', value: bookingCount, sub: bookingCount > 0 ? 'Awaiting review' : 'All clear', alert: bookingCount > 0 },
                  { label: 'In post-production', value: dashProjects.filter((p: any) => p.stage === 'Post-Production' || p.stage === 'Revisions').length, sub: 'Editing & revisions' },
                  { label: 'Ready to invoice', value: dashProjects.filter((p: any) => p.stage === 'Invoicing').length, sub: 'Completed projects' },
                ].map(({ label, value, sub, alert }: any) => (
                  <div key={label} style={{ background: '#1A1F28', border: '0.5px solid ' + (alert ? 'rgba(210,90,90,0.3)' : 'rgba(200,194,187,0.09)'), borderRadius: 7, padding: '18px 20px' }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: alert ? 'rgba(210,90,90,0.9)' : '#fff', marginBottom: 6 }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Active projects</div>
                    <button onClick={() => router.push('/portal/studio/projects')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all →</button>
                  </div>
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                    {dashProjects.length === 0 && <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No active projects</div>}
                    {dashProjects.slice(0, 6).map((p: any, i: number) => {
                      const SC: Record<string,any> = {'Pre-Production':{color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'},'Shooting':{color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'},'Post-Production':{color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'},'Revisions':{color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'},'Invoicing':{color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}}
                      const sc = SC[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                      return (
                        <div key={p.id} onClick={() => { setModalProject(p); setModalEditing(false) }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < Math.min(dashProjects.length,6)-1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.client}{p.shoot_date ? ' · Shoot: ' + new Date(p.shoot_date).toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : ''}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 80, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: p.progress + '%', background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', minWidth: 28 }}>{p.progress}%</span>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {recentDeliveries.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Recent deliveries</div>
                      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                        {recentDeliveries.map((p: any, i: number) => (
                          <div key={p.id} onClick={() => { setModalProject(p); setModalEditing(false) }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < recentDeliveries.length-1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.client}</div>
                            </div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(100,200,130,0.15)', color: 'rgba(100,200,130,0.9)', border: '0.5px solid rgba(100,200,130,0.3)' }}>Delivered</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Upcoming shoots — next 14 days</div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      {upcomingShoots.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No shoots scheduled</div>}
                      {upcomingShoots.map((p: any, i: number) => {
                        const d = new Date(p.shoot_date)
                        return (
                          <div key={p.id} onClick={() => { setModalProject(p); setModalEditing(false) }} style={{ display: 'flex', gap: 14, padding: '13px 16px', borderBottom: i < upcomingShoots.length-1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer', alignItems: 'center' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 5, background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#C8C2BB', lineHeight: 1 }}>{d.getDate()}</div>
                              <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.client}{p.address ? ' · ' + p.address.split(',')[0] : ''}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Booking requests</div>
                    <div style={{ background: bookingCount > 0 ? 'rgba(210,90,90,0.06)' : '#1A1F28', border: '0.5px solid ' + (bookingCount > 0 ? 'rgba(210,90,90,0.25)' : 'rgba(200,194,187,0.09)'), borderRadius: 7, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 600, color: bookingCount > 0 ? 'rgba(210,90,90,0.9)' : '#C8C2BB' }}>{bookingCount}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{bookingCount === 0 ? 'No pending requests' : 'Pending request' + (bookingCount !== 1 ? 's' : '')}</div>
                      </div>
                      {bookingCount > 0 && <button onClick={() => setActiveView('bookings')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.4)', color: 'rgba(210,90,90,0.9)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Review →</button>}
                    </div>
                  </div>
                  <div style={{ padding: '12px 16px', background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(100,200,130,0.8)', flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Logged in as {user?.email} · Database connected</div>
                  </div>
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
        {activeView === 'schedule' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Shoot Schedule</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>June 2026 · 6 shoots this month</div></div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={s.panel}>
                {[
                  { day: '17', month: 'Jun', title: 'Mission Heights — Full Property Highlights', meta: '7:30am – 12:00pm · Taradale · JD + SK', status: 'Confirmed', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)', client: 'Bayleys HB' },
                  { day: '19', month: 'Jun', title: 'Black Barn — Brand Film Day 1', meta: '9:00am – 5:00pm · Havelock North · JD', status: 'Pending', sc: 'rgba(210,175,80,0.85)', sb: 'rgba(65,52,18,0.5)', client: 'Black Barn Retreats' },
                  { day: '20', month: 'Jun', title: '14 Clifton Rd — Twilight Add-on', meta: '5:30pm – 7:30pm · Havelock North · SK + MT', status: 'Confirmed', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)', client: 'Blackwell Properties' },
                  { day: '28', month: 'Jun', title: 'Orchard Lane — Aerial + Walkthrough', meta: '7:00am – 1:00pm · Napier · JD + MT', status: 'Requested', sc: 'rgba(200,194,187,0.85)', sb: 'rgba(200,194,187,0.1)', client: 'Blackwell Properties' },
                ].map((sh, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 18px', borderBottom: i < 3 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                    <div style={{ width: 38, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '5px 3px', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{sh.day}</div>
                      <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)' }}>{sh.month}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{sh.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{sh.meta}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                      {pill(sh.status, sh.sc, sh.sb)}
                      <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{sh.client}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== BOOKINGS ===== */}
        {activeView === 'bookings' && (
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Client</div><div style={{ fontSize: 12 }}>{booking.client_email}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Shoot package</div><div style={{ fontSize: 12 }}>{booking.shoot_package || '—'}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Deliverables</div><div style={{ fontSize: 12 }}>{booking.deliverables || '—'}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Add-ons</div><div style={{ fontSize: 12 }}>{booking.addons || 'None'}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Preferred date</div><div style={{ fontSize: 12 }}>{booking.preferred_date || 'TBC'}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Total</div><div style={{ fontSize: 12, color: 'rgba(100,200,130,0.85)' }}>{booking.total || '—'}</div></div>
                        {booking.address && <div style={{ gridColumn: 'span 3' }}><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Address</div><div style={{ fontSize: 12 }}>{booking.address}</div></div>}
                        {booking.notes && <div style={{ gridColumn: 'span 3' }}><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Notes</div><div style={{ fontSize: 12 }}>{booking.notes}</div></div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => { setSelectedBooking(booking); setShootDate(booking.preferred_date || ''); setScheduleModal(true) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Confirm & create project</button>
                      <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Request changes</button>
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
        {activeView === 'finance' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>P&L Overview</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Financial year to date — Jul 2025 → Jun 2026</div></div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[['YTD Revenue','$186,400','↑ 22% vs FY25'],['YTD Expenses','$71,200','↑ 8% vs FY25'],['Net Profit YTD','$115,200','62% margin'],['Outstanding invoices','$8,400','3 pending']].map(([label, value, sub]) => (
                  <div key={label} style={{ ...s.panel, padding: '14px 16px' }}><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 6 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 500, color: '#fff' }}>{value}</div><div style={{ fontSize: 10, color: 'rgba(100,200,130,0.85)', marginTop: 4 }}>{sub}</div></div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div style={s.panel}>
                  <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Revenue by category — FY26</span></div>
                  {[['Property & Real Estate','112 projects','$149,120'],['Commercial & Brand','18 projects','$28,600'],['Events','6 projects','$8,680']].map(([label, sub, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}><div><div style={{ fontSize: 12 }}>{label}</div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{sub}</div></div><div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(100,200,130,0.85)' }}>{val}</div></div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(61,71,86,0.15)' }}><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total revenue</div><div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(100,200,130,0.85)' }}>$186,400</div></div>
                </div>
                <div style={s.panel}>
                  <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Expenses breakdown — FY26</span></div>
                  {[['Labour / contractor fees','−$34,200'],['Equipment & depreciation','−$12,800'],['Software & subscriptions','−$5,040'],['Travel & vehicle','−$9,600'],['Insurance & compliance','−$5,360']].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}><div style={{ fontSize: 12 }}>{label}</div><div style={{ fontSize: 13, color: 'rgba(210,90,90,0.85)' }}>{val}</div></div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(61,71,86,0.15)' }}><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total expenses</div><div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(210,90,90,0.85)' }}>−$71,200</div></div>
                </div>
              </div>
              <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 7, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>Net profit — FY26</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>62% margin · ↑ 22% year on year</div></div>
                <div style={{ fontSize: 28, fontWeight: 500, color: 'rgba(100,200,130,0.85)' }}>$115,200</div>
              </div>
            </div>
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
      {scheduleModal && selectedBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Schedule shoot</div>
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 20, lineHeight: 1.6 }}>
              {selectedBooking.address || selectedBooking.shoot_package} · {selectedBooking.client_name || selectedBooking.client_email}
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
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>Shoot date</label>
                    <input type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>Start time</label>
                    <select value={startTime} onChange={e => setStartTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>End time</label>
                    <select value={endTime} onChange={e => setEndTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00'].map(t => <option key={t}>{t}</option>)}
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
                  <div>• {selectedBooking.client_email} (Client)</div>
                </div>

                {!calendarConnected && (
                  <div style={{ background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 5, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'rgba(210,175,80,0.8)' }}>Connect Google Calendar to send invites</span>
                    <button onClick={connectGoogleCalendar} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 3, background: 'rgba(210,175,80,0.15)', color: 'rgba(210,175,80,0.9)', border: '0.5px solid rgba(210,175,80,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}>Connect →</button>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => { setScheduleModal(false); setEventLink('') }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                {eventLink ? 'Close' : 'Cancel'}
              </button>
              {!eventLink && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async () => { const proj = await confirmBooking(selectedBooking); setScheduleModal(false); setEventLink(''); if (proj?.id) router.push('/portal/studio/projects/' + proj.id) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Confirm without calendar
                  </button>
                  <button onClick={() => createCalendarEvent(selectedBooking)} disabled={creatingEvent || !shootDate} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: creatingEvent || !shootDate ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: creatingEvent || !shootDate ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', cursor: creatingEvent || !shootDate ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                    {creatingEvent ? 'Creating event...' : '📅 Confirm & add to calendar'}
                  </button>
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
                  {['Pre-Production','Shooting','Post-Production','Revisions','Invoicing'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(160,100,220,0.9)','Revisions':'rgba(220,120,60,0.9)','Invoicing':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Pre-Production','Shooting','Post-Production','Revisions','Invoicing'].indexOf(modalProject.stage)
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
                  const stage = val >= 100 ? 'Invoicing' : val >= 85 ? 'Revisions' : val >= 65 ? 'Post-Production' : val >= 35 ? 'Shooting' : 'Pre-Production'
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
                      {['Pre-Production','Shooting','Post-Production','Revisions','Invoicing'].map(s => <option key={s}>{s}</option>)}
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
                  {['Pre-Production','Shooting','Post-Production','Revisions','Invoicing'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(160,100,220,0.9)','Revisions':'rgba(220,120,60,0.9)','Invoicing':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Pre-Production','Shooting','Post-Production','Revisions','Invoicing'].indexOf(modalProject.stage)
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
                  const stage = val >= 100 ? 'Invoicing' : val >= 85 ? 'Revisions' : val >= 65 ? 'Post-Production' : val >= 35 ? 'Shooting' : 'Pre-Production'
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
                      {['Pre-Production','Shooting','Post-Production','Revisions','Invoicing'].map(s => <option key={s}>{s}</option>)}
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
    </main>
  )
}
