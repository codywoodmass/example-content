'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const handleViewChange = (view: string) => {
    setActiveView(view)
    if (notifications.length > 0) setShowNotifications(true)
  }
  const [bookingStep, setBookingStep] = useState(1)
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedShoot, setSelectedShoot] = useState<any>(null)
  const [selectedDel, setSelectedDel] = useState<any>(null)
  const [selectedSubDel, setSelectedSubDel] = useState<any>(null)
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [preferredDate, setPreferredDate] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressDebounce, setAddressDebounce] = useState<any>(null)
  const [bookingNotes, setBookingNotes] = useState("")
  const [accessNotes, setAccessNotes] = useState("")
  const [clientContactName, setClientContactName] = useState("")
  const [clientEmail2, setClientEmail2] = useState("")
  // Pre-fill email from logged in user
  useEffect(() => { if (user?.email && !clientEmail2) setClientEmail2(user.email) }, [user])
  const [draftDue, setDraftDue] = useState("")
  const [deliveryDue, setDeliveryDue] = useState("")



  const [tcAccepted, setTcAccepted] = useState(false)
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [clientBookings, setClientBookings] = useState<any[]>([])
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [changeRequest, setChangeRequest] = useState('')
  const [changeRequestSent, setChangeRequestSent] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOther, setCancelOther] = useState('')
  const [cancellationSent, setCancellationSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setLoading(false)
      const email = session.user.email
      // Load client profile
      const { data: profile } = await supabase.from('clients1').select('*').eq('email', email).single()
      if (profile) setClientProfile(profile)
      // Load projects linked to this client
      const { data: projects } = await supabase.from('projects1').select('*').eq('email', email).order('created_at', { ascending: false })
      if (projects) setClientProjects(projects)
      // Load bookings linked to this client
      const { data: bookings } = await supabase.from('bookings1').select('*').eq('client_email', email).order('created_at', { ascending: false })
      if (bookings) setClientBookings(bookings)
      const { data: notifs } = await supabase.from('notifications').select('*').eq('user_email', email).eq('read', false).order('created_at', { ascending: false })
      if (notifs) { setNotifications(notifs); if (notifs.length > 0) setShowNotifications(true) }
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function searchAddresses(query: string) {
    if (!query || query.length < 3) { setAddressSuggestions([]); return }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=NZ&types=address&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`)
      const data = await res.json()
      setAddressSuggestions(data.features || [])
      setShowAddressSuggestions(true)
    } catch (e) { setAddressSuggestions([]) }
  }

  function handleAddressChange(val: string) {
    setPropertyAddress(val)
    if (addressDebounce) clearTimeout(addressDebounce)
    setAddressDebounce(setTimeout(() => searchAddresses(val), 350))
  }

  function selectAddress(feature: any) {
    setPropertyAddress(feature.place_name)
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
  }

  function toggleAddon(addon: any) {
    setSelectedAddons(prev =>
      prev.find(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    )
  }

  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const grandTotal = (selectedShoot?.price || 0) + (selectedDel?.price || 0) + addonTotal

  const propertyShootPackages = [
    {
      name: 'Campaign Essentials', price: 890,
      includes: ['3hrs on-site', '6hrs editing', 'Aerial drone included', 'Colour graded'],
      deliverables: [
        { name: 'Walkthrough Video (45–60s)', price: 0, includes: ['1x walkthrough video', 'Google Drive delivery'] },
        { name: '2x Showcase Reels (20s)', price: 0, includes: ['2x 20s showcase reels', 'Vertical & landscape cuts', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Campaign Plus', price: 1280,
      includes: ['4hrs on-site', 'Lifestyle/talent shoot included', '8hrs editing', 'Aerial drone included'],
      deliverables: [
        { name: 'Walkthrough Video (60s)', price: 0, includes: ['1x 60s walkthrough video', 'Google Drive delivery'] },
        { name: '3x Reels + Carousel', price: 0, includes: ['3x social reels', '1x carousel', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Architectural', price: 2480,
      includes: ['Full day shoot', 'Coming Soon Reel', '1–2 min Property Showcase', 'Story Content', 'Carousel'],
      deliverables: [
        { name: 'Full Architectural Package', price: 0, includes: ['Coming Soon Reel', '1–2 min Property Showcase', 'Story Content', 'Carousel', 'Google Drive delivery'] },
      ]
    },
  ]

  const commercialShootPackages = [
    { name: 'Brand Film', price: 1490, includes: ['Full production day', 'Director-led shoot', 'Script & shot list included', 'Colour grade & sound mix'] },
    { name: 'Social Content Day', price: 890, includes: ['Up to 6 hrs on-site', 'Multi-format capture', 'Platform-optimised', '48hr turnaround'] },
    { name: 'Event Coverage', price: 1190, includes: ['Full event duration', 'Video + photo coverage', 'Highlight reel included', 'Same-day social cuts available'] },
  ]

  const propertyDeliverables: any[] = []


  const commercialDeliverables = [
    { name: 'Hero Film + Social Cut', price: 290, includes: ['1x hero film (2-3 min)', '1x 60 sec social cut', 'Google Drive delivery'] },
    { name: 'Social Reels Pack (4x)', price: 390, includes: ['4x social reels', 'Multi-format', 'Cover frames included', 'Google Drive delivery'] },
    { name: 'Single Social Reel', price: 140, includes: ['1x social reel', 'Vertical or landscape', 'Google Drive delivery'] },
    { name: 'Stills Pack', price: 240, includes: ['20-30 edited stills', 'High-res + web-res', 'Google Drive delivery'] },
  ]

  const propertyAddons = [
    { name: 'Additional 20s Reel', price: 250, desc: 'One additional 20s showcase reel' },
    { name: 'Additional 40s Reel', price: 400, desc: 'One additional 40s showcase reel' },
    { name: 'Carousel', price: 100, desc: 'Branded property carousel for social media' },
    { name: 'Open Home Story', price: 80, desc: 'Short-form story content for open home promotion' },
    { name: 'Content Library', price: 100, desc: 'Extended content library for ongoing social use' },
    { name: 'Twilight Shoot', price: 350, desc: 'Golden hour & dusk exterior shoot' },
    { name: 'Additional Shoot Time', price: 350, desc: 'Extra time on-site beyond package allocation' },
  ]

  const commercialAddons = [
    { name: 'Additional Talent', price: 220, desc: 'Extra on-screen talent sourced by Example Content' },
    { name: 'Rush Delivery (48hr)', price: 180, desc: 'Priority turnaround within 48 hours' },
    { name: 'Voiceover & Sound Design', price: 260, desc: 'Professional voiceover and custom sound design' },
    { name: 'Extra Shoot Hours', price: 290, desc: 'Add up to 3 additional hours to any package' },
  ]

  const shootPackages = selectedCat === 'property' ? propertyShootPackages : commercialShootPackages
  const deliverables = selectedCat === 'property' ? propertyDeliverables : commercialDeliverables
  const addons = selectedCat === 'property' ? propertyAddons : commercialAddons

  const s = { panel: { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7 } as React.CSSProperties }

  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', display: 'flex' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, flexShrink: 0, background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 40, objectFit: 'contain', maxWidth: 150 }} />
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(61,71,86,0.6)', color: '#C8C2BB', padding: '3px 7px', borderRadius: 2 }}>Client</span>
        </div>
        <div style={{ margin: '14px 14px 8px', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#C8C2BB', flexShrink: 0 }}>{clientProfile?.name ? clientProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{clientProfile?.name || user?.email?.split('@')[0] || 'Client'}</div>
            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{clientProfile?.company || user?.email || ''}</div>
          </div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'book', label: 'Book a Shoot' },
            { id: 'upcoming', label: 'Our Shoots' },
            { id: 'library', label: 'My Library' },
            { id: 'pitches', label: 'Pitch Decks' },
            { id: 'invoices', label: 'Invoices' },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id); setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress('') }} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 10px', borderRadius: 5, fontSize: 12, color: activeView === item.id ? '#C8C2BB' : 'rgba(200,194,187,0.38)', background: activeView === item.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: activeView === item.id ? '0.5px solid rgba(200,194,187,0.09)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 2, textAlign: 'left', fontFamily: 'inherit' }}>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 14, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
          <button onClick={handleSignOut} style={{ width: '100%', padding: '9px 10px', borderRadius: 5, fontSize: 12, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (() => {
          const now = new Date()
          const hour = now.getHours()
          const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
          const clientName = clientProfile?.name || user?.email?.split('@')[0] || 'there'
          const confirmedShoots = clientProjects.filter((p: any) => p.shoot_date && new Date(p.shoot_date) >= now)
          const confirmedShootDates = new Set(clientProjects.map((p: any) => p.shoot_date).filter(Boolean))
          const pendingShootBookings = clientBookings.filter((b: any) => b.preferred_date && new Date(b.preferred_date) >= now && b.status === 'pending' && !confirmedShootDates.has(b.preferred_date)).map((b: any) => ({ id: b.id, title: b.address || b.shoot_package || 'Pending booking', shoot_date: b.preferred_date, stage: 'Pending', client: b.client_name, address: b.address, progress: 0, isPending: true, shoot_package: b.shoot_package, deliverables_type: b.deliverables, addons: b.addons, total: b.total }))
          const upcomingShoots = [...confirmedShoots, ...pendingShootBookings].sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime())
          const activeProjects = clientProjects.filter((p: any) => p.stage !== 'Awaiting Confirmation')
          const awaitingSchedule = clientBookings.filter((b: any) => !b.preferred_date && b.status === 'pending')
          const completedProjects = clientProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' || p.archived === true)
          const pendingBookings = clientBookings.filter((b: any) => b.status === 'pending')

          // Calendar
          const startOfWeek = new Date(now)
          const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
          startOfWeek.setDate(now.getDate() - dow)
          const weeks = Array.from({length: 5}, (_: any, wi: number) => Array.from({length: 7}, (_: any, di: number) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + wi * 7 + di); return d }))
          const eventsByDate: Record<string, string[]> = {}
          const addCalEvent = (date: string | null, type: string) => {
            if (!date) return
            if (!eventsByDate[date]) eventsByDate[date] = []
            eventsByDate[date].push(type)
          }
          clientProjects.forEach((p: any) => {
            addCalEvent(p.shoot_date, 'shoot')
            addCalEvent(p.delivery_due, 'delivery')
          })
          clientBookings.filter((b: any) => b.preferred_date).forEach((b: any) => {
            addCalEvent(b.preferred_date, b.status === 'confirmed' ? 'shoot' : 'pending')
          })

          return (
            <div>
              {/* TOPBAR */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{greeting}, {clientName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{now.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{clientProfile?.company ? ' · ' + clientProfile.company : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setActiveView('book')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Book a shoot</button>
                  <button onClick={() => setActiveView('library')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>View my content</button>
                </div>
              </div>

              <div style={{ padding: 28 }}>
                {/* STAT CARDS */}
                <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Your account</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
                  {[
                    { label: 'Upcoming shoots', value: upcomingShoots.length, sub: upcomingShoots.length > 0 ? 'Next: ' + new Date(upcomingShoots[0].shoot_date + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : 'None scheduled' },
                    { label: 'Active projects', value: activeProjects.length, sub: activeProjects.length > 0 ? activeProjects[0].stage : 'All clear' },
                    { label: 'Pending bookings', value: pendingBookings.length, sub: pendingBookings.length > 0 ? 'Awaiting confirmation' : 'All confirmed', alert: pendingBookings.length > 0 },
                    { label: 'Projects complete', value: completedProjects.length, sub: 'Ready for delivery' },
                  ].map(({ label, value, sub, alert }: any) => (
                    <div key={label} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: alert ? 'rgba(210,175,80,0.9)' : '#fff', letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.28)', marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                  {/* LEFT: UPCOMING SHOOTS + ACTIVE PROJECTS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* UPCOMING SHOOTS */}
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Upcoming shoots</span>
                        <button onClick={() => setActiveView('book')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Book new</button>
                      </div>
                      {awaitingSchedule.length > 0 && awaitingSchedule.map((b: any) => (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                          <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 5, padding: '5px 3px' }}>
                            <div style={{ fontSize: 16, opacity: 0.5 }}>⏳</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Awaiting date confirmation from Example Content</div>
                          </div>
                          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(210,175,80,0.12)', color: 'rgba(210,175,80,0.9)', border: '0.5px solid rgba(210,175,80,0.25)', whiteSpace: 'nowrap' }}>Pending</span>
                        </div>
                      ))}
                      {upcomingShoots.length === 0 && awaitingSchedule.length === 0 ? (
                        <div style={{ padding: '24px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)', textAlign: 'center' }}>No upcoming shoots — book one above</div>
                      ) : upcomingShoots.map((p: any, i: number) => {
                        const d = new Date(p.shoot_date + 'T12:00:00')
                        const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'}, 'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}, 'Pending': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'} }
                        const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: i < upcomingShoots.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                            <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5, padding: '5px 3px' }}>
                              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                              <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.address ? p.address.split(',')[0] : p.client}</div>
                            </div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* ACTIVE PROJECTS */}
                    {activeProjects.length > 0 && (
                      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Active projects</span>
                        </div>
                        {activeProjects.map((p: any, i: number) => {
                          const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'} }
                          const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < activeProjects.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.delivery_due ? 'Due: ' + new Date(p.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : p.stage}</div>
                              </div>
                              <div style={{ width: 80, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: p.progress + '%', background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: CALENDAR */}
                  <div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{now.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})}</span>
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} style={{ fontSize: 9, textAlign: 'center', color: 'rgba(200,194,187,0.3)' }}>{d}</div>)}
                        </div>
                        {weeks.map((week: any, wi: number) => (
                          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
                            {week.map((day: any, di: number) => {
                              const key = day.toISOString().split('T')[0]
                              const events = eventsByDate[key] || []
                              const hasEvents = events.length > 0
                              const isToday = day.toDateString() === now.toDateString()
                              const isCurrentMonth = day.getMonth() === now.getMonth()
                              const typeColors: Record<string,string> = { shoot: 'rgba(210,175,80,0.9)', delivery: 'rgba(100,200,130,0.9)', pending: 'rgba(160,100,220,0.9)' }
                              return (
                                <div key={di} style={{ height: 36, borderRadius: 3, background: hasEvents ? 'rgba(200,194,187,0.04)' : 'transparent', border: '0.5px solid ' + (isToday ? 'rgba(200,194,187,0.5)' : hasEvents ? 'rgba(200,194,187,0.12)' : 'rgba(200,194,187,0.05)'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px 0' }}>
                                  <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isCurrentMonth ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.2)' }}>{day.getDate()}</div>
                                  {hasEvents && (
                                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                      {events.slice(0,3).map((type: string, ei: number) => (
                                        <div key={ei} style={{ width: 4, height: 4, borderRadius: '50%', background: typeColors[type] || '#C8C2BB' }} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PENDING BOOKINGS */}
                    {pendingBookings.length > 0 && (
                      <div style={{ marginTop: 14, background: 'rgba(210,175,80,0.06)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 7, padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(210,175,80,0.9)', marginBottom: 6 }}>{pendingBookings.length} pending booking{pendingBookings.length !== 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Awaiting confirmation from Example Content</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT DELIVERABLES */}
                {completedProjects.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Recent deliverables</div>
                    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                      {completedProjects.map((p: any) => (
                        <div key={p.id} style={{ flexShrink: 0, width: 220, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                          <div style={{ height: 110, background: 'rgba(100,200,130,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                            {p.drive_url ? (
                              <a href={p.drive_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                                <span style={{ fontSize: 28 }}>📁</span>
                                <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>View content</span>
                              </a>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 28, opacity: 0.25 }}>📁</span>
                                <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Coming soon</span>
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>{p.delivery_due ? new Date(p.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(100,200,130,0.15)', color: 'rgba(100,200,130,0.9)', border: '0.5px solid rgba(100,200,130,0.3)' }}>Delivered</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ===== BOOK A SHOOT ===== */}
        {activeView === 'book' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Book a Shoot</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Select your category, packages and preferred date</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: bookingStep === 1 ? 0 : 28 }}>

              {/* STEP INDICATOR */}
              {bookingStep > 1 && <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, padding: '0 28px' }}>
                {['Category','Packages','Add-ons','Details','Confirm'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${bookingStep > i + 1 ? 'rgba(100,200,130,0.5)' : bookingStep === i + 1 ? '#C8C2BB' : 'rgba(200,194,187,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: bookingStep > i + 1 ? 'rgba(100,200,130,0.8)' : bookingStep === i + 1 ? '#C8C2BB' : 'rgba(200,194,187,0.3)', background: bookingStep > i + 1 ? 'rgba(30,70,45,0.5)' : bookingStep === i + 1 ? 'rgba(200,194,187,0.08)' : 'transparent', flexShrink: 0 }}>{bookingStep > i + 1 ? '✓' : i + 1}</div>
                      <span style={{ fontSize: 11, color: bookingStep === i + 1 ? '#C8C2BB' : bookingStep > i + 1 ? 'rgba(100,200,130,0.7)' : 'rgba(200,194,187,0.3)', whiteSpace: 'nowrap' }}>{step}</span>
                    </div>
                    {i < 4 && <div style={{ flex: 1, height: 0.5, background: 'rgba(200,194,187,0.09)', margin: '0 10px' }} />}
                  </div>
                ))}
              </div>}

              {/* STEP 1: CATEGORY */}
              {bookingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 115px)' }}>
                  {/* SPLIT PANELS */}
                  <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 115px)' }}>
                    {[
                      {
                        id: 'property',
                        title: 'Property &\nArchitecture',
                        desc: 'Luxury, High End, Bold & Characteristic Residential, Lifestyle and Architectural Video.',
                        video: '/videos/property.mp4',
                        gradient: 'linear-gradient(160deg, #1a2535 0%, #0a0e14 100%)',
                      },
                      {
                        id: 'commercial',
                        title: 'Commercial\n& Events',
                        desc: 'Photo & Video Branding, Event Coverage, Commercial/Corporate Work, Other..',
                        video: '/videos/commercial.mp4',
                        gradient: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)',
                      },
                    ].map((cat, i) => (
                      <div
                        key={cat.id}
                        onClick={() => { setSelectedCat(cat.id); setBookingStep(2) }}
                        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRight: i === 0 ? '0.5px solid rgba(200,194,187,0.12)' : 'none', background: cat.gradient }}
                        onMouseEnter={e => { const ov = e.currentTarget.querySelector('.overlay') as HTMLElement; if(ov) ov.style.background = 'rgba(0,0,0,0.2)' }}
                        onMouseLeave={e => { const ov = e.currentTarget.querySelector('.overlay') as HTMLElement; if(ov) ov.style.background = 'rgba(0,0,0,0.55)' }}
                      >
                        {/* VIDEO BG */}
                        <video
                          src={cat.video}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* GRADIENT OVERLAY */}
                        <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', transition: 'background 0.4s ease' }} />
                        {/* GRADIENT BOTTOM FADE */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)' }} />

                        {/* CONTENT */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '48px' }}>
                          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.5)', marginBottom: 16 }}>0{i + 1}</div>
                          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', whiteSpace: 'pre-line', margin: '0 0 20px 0' }}>{cat.title}</h2>
                          <p style={{ fontSize: 13, color: 'rgba(200,194,187,0.65)', lineHeight: 1.7, maxWidth: 340, marginBottom: 36 }}>{cat.desc}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8C2BB', fontWeight: 500 }}>Select & continue</span>
                            <div style={{ width: 32, height: 1, background: '#C8C2BB' }} />
                            <span style={{ fontSize: 14, color: '#C8C2BB' }}>→</span>
                          </div>
                        </div>

                        {/* SELECTED INDICATOR */}
                        {selectedCat === cat.id && (
                          <div style={{ position: 'absolute', top: 24, right: 24, width: 28, height: 28, borderRadius: '50%', background: '#C8C2BB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#111', fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bookingStep === 2 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Select package</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
                    {shootPackages.map((pkg: any) => (
                      <div key={pkg.name} onClick={() => { setSelectedShoot(pkg); setSelectedSubDel(null); setSelectedDel(null) }} style={{ border: `0.5px solid ${selectedShoot?.name === pkg.name ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, padding: '16px 18px', cursor: 'pointer', background: selectedShoot?.name === pkg.name ? 'rgba(200,194,187,0.05)' : '#1A1F28', position: 'relative' }}>
                        {selectedShoot?.name === pkg.name && <span style={{ position: 'absolute', top: 12, right: 14, color: '#C8C2BB', fontSize: 12 }}>✓</span>}
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 6, paddingRight: 16 }}>{pkg.name}</div>
                        <div style={{ fontSize: 19, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>${pkg.price.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(200,194,187,0.4)' }}>+ GST</span></div>
                        <ul style={{ listStyle: 'none' }}>
                          {pkg.includes.map((item: string) => <li key={item} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', display: 'flex', gap: 7, marginBottom: 5 }}><span style={{ color: 'rgba(200,194,187,0.25)' }}>—</span>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {selectedShoot && selectedShoot.deliverables && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Choose your deliverable</div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedShoot.deliverables.length}, 1fr)`, gap: 12 }}>
                        {selectedShoot.deliverables.map((del: any) => (
                          <div key={del.name} onClick={() => { setSelectedSubDel(del); setSelectedDel(del) }} style={{ border: `0.5px solid ${selectedSubDel?.name === del.name ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, padding: '14px 16px', cursor: 'pointer', background: selectedSubDel?.name === del.name ? 'rgba(200,194,187,0.05)' : '#1A1F28', position: 'relative' }}>
                            {selectedSubDel?.name === del.name && <span style={{ position: 'absolute', top: 10, right: 12, color: '#C8C2BB', fontSize: 12 }}>✓</span>}
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 8, paddingRight: 14 }}>{del.name}</div>
                            <ul style={{ listStyle: 'none' }}>
                              {del.includes.map((item: string) => <li key={item} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: 'rgba(200,194,187,0.25)' }}>—</span>{item}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedShoot && !selectedShoot.deliverables && deliverables.length > 0 && (
                    <div style={{ marginBottom: 22 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Deliverable package — select one</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                        {deliverables.map((pkg: any) => (
                          <div key={pkg.name} onClick={() => setSelectedDel(pkg)} style={{ border: `0.5px solid ${selectedDel?.name === pkg.name ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, padding: '14px 16px', cursor: 'pointer', background: selectedDel?.name === pkg.name ? 'rgba(200,194,187,0.05)' : '#1A1F28', position: 'relative' }}>
                            {selectedDel?.name === pkg.name && <span style={{ position: 'absolute', top: 10, right: 12, color: '#C8C2BB', fontSize: 12 }}>✓</span>}
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 5, paddingRight: 14 }}>{pkg.name}</div>
                            <div style={{ fontSize: 17, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>${pkg.price} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(200,194,187,0.4)' }}>+ GST</span></div>
                            <ul style={{ listStyle: 'none' }}>
                              {pkg.includes.map((item: string) => <li key={item} style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: 'rgba(200,194,187,0.25)' }}>—</span>{item}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(1)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => selectedShoot && (selectedDel || selectedSubDel) && setBookingStep(3)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: selectedShoot && (selectedDel || selectedSubDel) ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedShoot && (selectedDel || selectedSubDel) ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: selectedShoot && (selectedDel || selectedSubDel) ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Continue →</button>
                  </div>
                </div>
              )}

              {/* STEP 3: ADD-ONS */}
              {bookingStep === 3 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 6 }}>Add-ons <span style={{ color: 'rgba(200,194,187,0.2)', fontSize: 10, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>Optional — select any that apply</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                    {addons.map(addon => {
                      const selected = selectedAddons.find(a => a.name === addon.name)
                      return (
                        <div key={addon.name} onClick={() => toggleAddon(addon)} style={{ border: `0.5px solid ${selected ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '13px 15px', cursor: 'pointer', background: selected ? 'rgba(200,194,187,0.05)' : '#1A1F28', display: 'flex', gap: 10 }}>
                          <div style={{ width: 17, height: 17, borderRadius: 3, border: `1px solid ${selected ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: selected ? 'rgba(200,194,187,0.15)' : 'transparent', marginTop: 1 }}>{selected && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{addon.name}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 4 }}>+${addon.price} + GST</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', lineHeight: 1.4 }}>{addon.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>Current total (excl. GST)</span>
                    <span style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(2)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => setBookingStep(4)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Continue to details →</button>
                  </div>
                </div>
              )}

              {/* STEP 4: DETAILS */}
              {bookingStep === 4 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Your details</div>

                  {/* Contact info — always shown first */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>{selectedCat === 'property' ? 'Listing agent name' : 'Your name'}</label>
                      <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Jessica Moore" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Your email</label>
                      <input type="email" value={clientEmail2} onChange={e => setClientEmail2(e.target.value)} placeholder="your@email.com" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Property specific */}
                  {selectedCat === 'property' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property address</label>
                        <div style={{ position: 'relative' }}>
                          <input value={propertyAddress} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)} placeholder="Start typing an address..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                          {showAddressSuggestions && addressSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                              {addressSuggestions.map((s: any, i: number) => (
                                <div key={i} onClick={() => selectAddress(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < addressSuggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  {s.place_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property type</label>
                        <select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option>Luxury residential</option><option>Standard residential</option><option>Multi-unit development</option><option>Commercial property</option><option>Lifestyle / rural</option><option>Land</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Access / key notes</label>
                        <input value={accessNotes} onChange={e => setAccessNotes(e.target.value)} placeholder="e.g. Key in lockbox, call owner on arrival" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                    </div>
                  )}

                  {/* Commercial specific */}
                  {selectedCat === 'commercial' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Business / brand name</label>
                        <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Black Barn Retreats" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Industry</label>
                        <select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option>Hospitality & tourism</option><option>Retail & product</option><option>Corporate</option><option>Not-for-profit</option><option>Health & wellness</option><option>Other</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Shoot location</label>
                        <div style={{ position: 'relative' }}>
                          <input value={propertyAddress} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)} placeholder="Start typing an address..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                          {showAddressSuggestions && addressSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                              {addressSuggestions.map((s: any, i: number) => (
                                <div key={i} onClick={() => selectAddress(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < addressSuggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  {s.place_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates — always shown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Preferred shoot date</label>
                      <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Draft needed by</label>
                      <input type="date" value={draftDue} onChange={e => setDraftDue(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Final delivery needed by</label>
                      <input type="date" value={deliveryDue} onChange={e => setDeliveryDue(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Brief & special requirements</label>
                    <textarea rows={3} value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Style references, key features, specific requirements, timeline notes..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.65 }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(3)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => setBookingStep(5)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Review & confirm →</button>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRM */}
              {bookingStep === 5 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Review your booking</div>
                  <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 8, padding: '18px 22px', marginBottom: 18 }}>
                    {[
                      { key: 'Category', val: selectedCat === 'property' ? 'Property & Architecture' : 'Commercial & Events' },
                      { key: 'Shoot package', val: `${selectedShoot?.name} — $${selectedShoot?.price?.toLocaleString()} + GST` },
                      { key: 'Deliverable package', val: `${selectedDel?.name} — $${selectedDel?.price} + GST` },
                      { key: 'Add-ons', val: selectedAddons.length ? selectedAddons.map(a => `${a.name} (+$${a.price})`).join(', ') : 'None' },
                      { key: 'Preferred date', val: 'TBC — confirmed within 24 hrs' },
                    ].map(({ key, val }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{key}</span>
                        <span style={{ fontSize: 13, color: '#C8C2BB', fontWeight: 500, textAlign: 'right', maxWidth: 360 }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, marginTop: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>Total estimate</span>
                      <span style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()} + GST</span>
                    </div>
                  </div>
                  <div style={{ border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '13px 16px', marginBottom: 16, maxHeight: 96, overflowY: 'auto', fontSize: 11, color: 'rgba(200,194,187,0.35)', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)' }}>
                    <strong style={{ color: 'rgba(200,194,187,0.5)' }}>Terms & Conditions — Example Content Ltd</strong><br /><br />
                    This booking request is not a confirmed shoot until Example Content confirms availability in writing. A 50% deposit is required to secure your shoot date. The remaining 50% is due on delivery. Cancellations made less than 48 hours before shoot date incur a 25% cancellation fee. Example Content retains the right to use footage for portfolio and promotional purposes unless a written waiver is requested prior to shoot day. All prices are exclusive of GST. Delivered files are provided via Google Drive and retained for 60 days.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }} onClick={() => setTcAccepted(!tcAccepted)}>
                    <div style={{ width: 15, height: 15, borderRadius: 2, border: `1px solid ${tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, background: tcAccepted ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{tcAccepted && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                    <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.6 }}>I have read and agree to the Terms & Conditions. I confirm the above package selection and understand a 50% deposit will be required to finalise my shoot date.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(4)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={async () => {
                      if (!tcAccepted) return
                      try {
                        await supabase.from('bookings1').insert([{
                          client_id: user?.id,
                          client_name: clientContactName || user?.email,
                          category: selectedCat,
                          shoot_package: selectedShoot?.name || '',
                          deliverables: selectedDel?.name || '',
                          addons: selectedAddons.map((a: any) => a.name).join(', '),
                          preferred_date: preferredDate,
                          client_email: clientEmail2 || user?.email,
                          draft_due: draftDue || null,
                          delivery_due: deliveryDue || null,
                          address: propertyAddress,
                          notes: [bookingNotes, accessNotes ? 'Access notes: ' + accessNotes : ''].filter(Boolean).join('\n'),
                          total: `$${((selectedShoot?.price || 0) + (selectedDel?.price || 0) + selectedAddons.reduce((s: number, a: any) => s + a.price, 0)).toLocaleString()} + GST`,
                          tc_accepted: true,
                          status: 'pending',
                        }])
                      } catch (e) { console.error('Booking save error:', e) }
                      try {
                        await supabase.from('clients1').upsert([{
                          email: clientEmail2 || user?.email,
                          name: clientContactName || '',
                          category: selectedCat === 'property' ? 'Property' : 'Commercial',
                          total_bookings: 1,
                        }], { onConflict: 'email', ignoreDuplicates: false })
                      } catch (e) { console.error('Client upsert error:', e) }
                      setBookingStep(6)
                    }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: tcAccepted ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: tcAccepted ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Submit booking request →</button>
                  </div>
                </div>
              )}

              {/* STEP 6: SUCCESS */}
              {bookingStep === 6 && (
                <div style={{ textAlign: 'center', padding: '60px 32px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid rgba(100,200,130,0.4)', background: 'rgba(100,200,130,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>✓</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', marginBottom: 10 }}>Booking request submitted</div>
                  <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 32px' }}>We've received your request and will confirm availability within 24 hours. You'll hear from the Example Content team shortly.</div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Back to dashboard</button>
                    <button onClick={() => { setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress('') }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Book another shoot</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== LIBRARY ===== */}
        {activeView === 'library' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>My Content Library</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>All deliverables via Google Drive — grouped by project, most recent first</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(200,194,187,0.09)', marginBottom: 24 }}>
                {['All (14)','Video (8)','Photo (6)'].map((tab, i) => (
                  <div key={tab} style={{ fontSize: 12, padding: '10px 16px', cursor: 'pointer', color: i === 0 ? '#C8C2BB' : 'rgba(200,194,187,0.38)', borderBottom: i === 0 ? '1.5px solid #C8C2BB' : '1.5px solid transparent', marginBottom: -0.5 }}>{tab}</div>
                ))}
              </div>
              {[
                { project: '14 Clifton Road — Jun 2026', items: [
                  { title: 'Hero Highlights Film', date: '14 Jun 2026', type: 'Video', isNew: true, bg: 'linear-gradient(145deg,#1e2d3a,#0d1620)' },
                  { title: 'Stills Pack (24 images)', date: '14 Jun 2026', type: 'Photo', isNew: true, bg: 'linear-gradient(145deg,#2a2016,#140e08)' },
                  { title: 'Social Reels Pack (4x)', date: '14 Jun 2026', type: 'Video', isNew: true, bg: 'linear-gradient(145deg,#1a2418,#0c1408)' },
                ]},
                { project: 'Orchard Lane Development — Jun 2026', items: [
                  { title: 'Drone Reel', date: '2 Jun 2026', type: 'Video', isNew: false, bg: 'linear-gradient(145deg,#262018,#140e08)' },
                  { title: 'Stills Pack (18 images)', date: '2 Jun 2026', type: 'Photo', isNew: false, bg: 'linear-gradient(145deg,#1e1e2a,#0c0c16)' },
                ]},
              ].map(group => (
                <div key={group.project} style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>{group.project}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {group.items.map((item, i) => (
                      <div key={i} style={{ ...s.panel, overflow: 'hidden', cursor: 'pointer' }}>
                        <div style={{ aspectRatio: '16/9', background: item.bg, position: 'relative' }}>
                          <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.5)', color: '#C8C2BB', padding: '4px 8px', borderRadius: 2 }}>{item.type}</span>
                          {item.isNew && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, background: 'rgba(120,200,140,0.2)', color: 'rgba(120,200,140,0.9)', border: '0.5px solid rgba(120,200,140,0.3)', padding: '3px 8px', borderRadius: 2 }}>New</span>}
                        </div>
                        <div style={{ padding: '10px 14px 6px' }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{item.title}</div>
                          <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)' }}>{item.date}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, padding: '6px 14px 12px' }}>
                          <button style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.09)', color: 'rgba(200,194,187,0.4)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Preview</button>
                          <button style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.09)', color: 'rgba(200,194,187,0.4)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PITCH DECKS ===== */}
        {activeView === 'pitches' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Pitch Decks</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Review and accept proposals from Example Content</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Awaiting review</div>
              <div style={{ ...s.panel, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 5, background: 'rgba(61,71,86,0.4)', border: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>▤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>Orchard Lane — Social Content Campaign Proposal</div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Sent 13 Jun 2026 · 5 sections · Scope, timeline & pricing</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: 'rgba(25,45,80,0.5)', color: 'rgba(100,150,220,0.85)', border: '0.5px solid rgba(100,150,220,0.2)' }}>Awaiting review</span>
                    <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Open deck</button>
                    <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Accept</button>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Previously accepted</div>
              <div style={s.panel}>
                {[
                  { title: '14 Clifton Rd — Property Film & Photography', sub: 'Accepted 4 May 2026 · Project complete' },
                  { title: 'Orchard Lane — Hero Film & Aerial Package', sub: 'Accepted 10 Apr 2026 · Project complete' },
                ].map((deck, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i === 0 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 5, background: 'rgba(61,71,86,0.4)', border: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>▤</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{deck.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{deck.sub}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: 'rgba(30,70,45,0.5)', color: 'rgba(100,200,130,0.85)', border: '0.5px solid rgba(100,200,130,0.2)' }}>Accepted</span>
                      <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== UPCOMING / INVOICES STUBS ===== */}
        {activeView === 'upcoming' && (() => {
          const now = new Date()
          const confirmedShoots = clientProjects.filter((p: any) => p.shoot_date && new Date(p.shoot_date) >= now)
          const projectShootDates = new Set(clientProjects.map((p: any) => p.shoot_date).filter(Boolean))
          const pendingShootBookings = clientBookings.filter((b: any) => b.preferred_date && new Date(b.preferred_date) >= now && (b.status === 'pending' || b.status === 'confirmed') && !projectShootDates.has(b.preferred_date)).map((b: any) => ({ id: b.id, title: b.address || b.shoot_package || 'Booking', shoot_date: b.preferred_date, stage: b.status === 'confirmed' ? 'Confirmed' : 'Pending', address: b.address, isPending: true, shoot_package: b.shoot_package, deliverables_type: b.deliverables, addons: b.addons, total: b.total, progress: 0 }))
          const upcomingAll = [...confirmedShoots, ...pendingShootBookings].sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime())
          const deliveredProjects = clientProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' || p.archived === true).sort((a: any, b: any) => new Date(b.delivery_due || b.created_at).getTime() - new Date(a.delivery_due || a.created_at).getTime())
          const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'}, 'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}, 'Pending': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Confirmed': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'} }
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Our Shoots</div>
                <button onClick={() => setActiveView('book')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ Book new</button>
              </div>
              <div style={{ padding: 28 }}>
                {upcomingAll.length > 0 && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Upcoming</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {upcomingAll.map((p: any) => {
                        const d = new Date(p.shoot_date + 'T12:00:00')
                        const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                        return (
                          <div key={p.id} onClick={() => setSelectedProject(p)} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                            <div style={{ width: 50, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '6px 4px' }}>
                              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                              <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                              <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)' }}>{d.getFullYear()}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{d.toLocaleDateString('en-NZ',{weekday:'long', day:'numeric', month:'long'})}</div>
                              {p.address && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', marginTop: 2 }}>{p.address}</div>}
                            </div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {deliveredProjects.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Delivered</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {deliveredProjects.map((p: any) => {
                        const delivDate = p.delivery_due ? new Date(p.delivery_due + 'T12:00:00') : null
                        return (
                          <div key={p.id} onClick={() => setSelectedProject(p)} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', cursor: 'pointer' }}>
                            {delivDate ? (
                              <div style={{ width: 50, flexShrink: 0, textAlign: 'center', background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, padding: '6px 4px' }}>
                                <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(100,200,130,0.9)', lineHeight: 1 }}>{delivDate.getDate()}</div>
                                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(100,200,130,0.6)', marginTop: 2 }}>{delivDate.toLocaleDateString('en-NZ',{month:'short'})}</div>
                                <div style={{ fontSize: 9, color: 'rgba(100,200,130,0.4)' }}>{delivDate.getFullYear()}</div>
                              </div>
                            ) : (
                              <div style={{ width: 50, flexShrink: 0, textAlign: 'center', background: 'rgba(100,200,130,0.05)', border: '0.5px solid rgba(100,200,130,0.15)', borderRadius: 6, padding: '6px 4px' }}>
                                <div style={{ fontSize: 20 }}>✓</div>
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{delivDate ? 'Delivered ' + delivDate.toLocaleDateString('en-NZ',{weekday:'long', day:'numeric', month:'long'}) : 'Delivered'}</div>
                              {p.address && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', marginTop: 2 }}>{p.address}</div>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              {p.drive_url && <a href={p.drive_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.3)', color: 'rgba(100,200,130,0.8)', background: 'rgba(100,200,130,0.08)', textDecoration: 'none', whiteSpace: 'nowrap' }}>📁 View</a>}
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, background: 'rgba(100,200,130,0.15)', color: 'rgba(100,200,130,0.9)', whiteSpace: 'nowrap' }}>Delivered</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {upcomingAll.length === 0 && deliveredProjects.length === 0 && (
                  <div style={{ textAlign: 'center', paddingTop: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>📅</div>
                    <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>No shoots yet</div>
                    <button onClick={() => setActiveView('book')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Book your first shoot</button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}
        {activeView === 'invoices' && (
          <div>
            <div style={{ padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Invoices</div>
            </div>
            <div style={{ padding: 28, textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🧾</div>
              <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>Coming soon</div>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Invoice and payment history will appear here once connected.</div>
            </div>
          </div>
        )}

      </div>

      {/* PROJECT DETAIL MODAL */}
      {selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setSelectedProject(null); setChangeRequest(''); setChangeRequestSent(false) } }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', position: 'sticky', top: 0, background: '#1A1F28', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selectedProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selectedProject.stage}</div>
              </div>
              <button onClick={() => { setSelectedProject(null); setChangeRequest(''); setChangeRequestSent(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              {/* PROGRESS */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Progress</span>
                  <span style={{ fontSize: 12, color: '#C8C2BB' }}>{selectedProject.progress || 0}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(200,194,187,0.07)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: (selectedProject.progress || 0) + '%', background: selectedProject.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 3 }} />
                </div>
              </div>

              {/* DETAILS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Shoot date', value: selectedProject.shoot_date ? new Date(selectedProject.shoot_date + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—' },
                  { label: 'Delivery date', value: selectedProject.delivery_due ? new Date(selectedProject.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'}) : '—' },
                  { label: 'Location', value: selectedProject.address || '—' },
                  { label: 'Category', value: selectedProject.category || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#C8C2BB' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* DELIVERABLES */}
              {(selectedProject.deliverables || selectedProject.shoot_package) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Packages & deliverables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProject.shoot_package && (
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Package</div>
                        <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.shoot_package}</div>
                      </div>
                    )}
                    {selectedProject.deliverables_type && (
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deliverables</div>
                        <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.deliverables_type}</div>
                      </div>
                    )}
                    {selectedProject.addons && (
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Add-ons</div>
                        <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.addons}</div>
                      </div>
                    )}
                    {selectedProject.total && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(100,200,130,0.05)', borderRadius: 4, border: '0.5px solid rgba(100,200,130,0.15)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(100,200,130,0.9)' }}>{selectedProject.total}</span>
                      </div>
                    )}
                    {selectedProject.deliverables && selectedProject.deliverables.split('\n').filter(Boolean).map((d: string, i: number) => {
                      const value = d.replace(/^(PACKAGE|DELIVERABLES|ADD-ONS): /, '')
                      const label = d.startsWith('PACKAGE: ') ? 'Package' : d.startsWith('DELIVERABLES: ') ? 'Deliverables' : d.startsWith('ADD-ONS: ') ? 'Add-ons' : null
                      return label ? (
                        <div key={i}>
                          <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{value}</div>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* DRIVE LINK */}
              {selectedProject.drive_url && (
                <div style={{ marginBottom: 20 }}>
                  <a href={selectedProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(100,200,130,0.06)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, textDecoration: 'none' }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,200,130,0.9)' }}>View project files</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Opens Google Drive folder</div>
                    </div>
                  </a>
                </div>
              )}

              {/* CHANGE REQUEST */}
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 20 }}>
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 6 }}>Cancel booking</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 12 }}>Need to cancel? Send us a request and our team will be in touch.</div>
                {cancellationSent ? (
                  <div style={{ padding: '12px 16px', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 6, fontSize: 12, color: 'rgba(210,175,80,0.9)' }}>Cancellation request received — awaiting confirmation from our team</div>
                ) : (
                  <button onClick={() => setShowCancelModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.7)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Request cancellation</button>
                )}
              </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 6 }}>Request a change</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 12 }}>Let us know if you'd like to change any dates, packages or deliverables.</div>
                {changeRequestSent ? (
                  <div style={{ padding: '14px 16px', background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, fontSize: 12, color: 'rgba(100,200,130,0.9)', textAlign: 'center' }}>✓ Request sent — we'll be in touch shortly</div>
                ) : (
                  <div>
                    <textarea value={changeRequest} onChange={e => setChangeRequest(e.target.value)} placeholder="e.g. Can we move the shoot date to 15th August? Or add a twilight shoot..." style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.65, resize: 'vertical' as const, minHeight: 80 }} />
                    <button onClick={async () => {
                      if (!changeRequest.trim()) return
                      await supabase.from('change_requests').insert([{
                        project_id: selectedProject.id || null,
                        client_email: user?.email,
                        client_name: clientProfile?.name || user?.email,
                        message: changeRequest,
                        status: 'pending',
                        project_title: selectedProject.title || '',
                      }])
                      setChangeRequestSent(true)
                      setChangeRequest('')
                    }} disabled={!changeRequest.trim()} style={{ marginTop: 10, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: changeRequest.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: changeRequest.trim() ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: changeRequest.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Send request</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION POPUP */}
      {showNotifications && notifications.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 12, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>You have updates</div>
              <button onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('user_email', user?.email); setNotifications([]); setShowNotifications(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {notifications.map((n: any, i: number) => (
                <div key={n.id} style={{ padding: '18px 24px', borderBottom: i < notifications.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: n.type === 'booking_confirmed' ? 'rgba(100,200,130,0.15)' : 'rgba(210,175,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {n.type === 'booking_confirmed' ? '✓' : '📅'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: n.type === 'booking_confirmed' ? 'rgba(100,200,130,0.9)' : 'rgba(210,175,80,0.9)', marginBottom: 5 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'})}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('user_email', user?.email); setNotifications([]); setShowNotifications(false) }} style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 28px', borderRadius: 4, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL REASON MODAL */}
      {showCancelModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Reason for cancellation</div>
              <button onClick={() => setShowCancelModal(false)} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 16 }}>Please let us know why you need to cancel so we can assist you better.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {['Weather conditions', 'Property sold or taken off market', 'Date no longer works', 'Other'].map((reason) => (
                  <div key={reason} onClick={() => setCancelReason(reason)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 6, border: `0.5px solid ${cancelReason === reason ? 'rgba(200,194,187,0.3)' : 'rgba(200,194,187,0.09)'}`, background: cancelReason === reason ? 'rgba(200,194,187,0.06)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${cancelReason === reason ? '#C8C2BB' : 'rgba(200,194,187,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {cancelReason === reason && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8C2BB' }} />}
                    </div>
                    <span style={{ fontSize: 13, color: cancelReason === reason ? '#C8C2BB' : 'rgba(200,194,187,0.5)' }}>{reason}</span>
                  </div>
                ))}
              </div>
              {cancelReason === 'Other' && (
                <textarea value={cancelOther} onChange={e => setCancelOther(e.target.value)} placeholder="Please describe your reason..." style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.65, resize: 'vertical' as const, minHeight: 80, marginBottom: 16 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                <button onClick={() => setShowCancelModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={async () => {
                  if (!cancelReason) return
                  const message = 'CANCELLATION REQUEST\nReason: ' + cancelReason + (cancelReason === 'Other' && cancelOther ? '\nDetails: ' + cancelOther : '')
                  await supabase.from('change_requests').insert([{
                    project_id: selectedProject.id || null,
                    client_email: user?.email,
                    client_name: clientProfile?.name || user?.email,
                    message,
                    status: 'pending',
                    project_title: selectedProject.title || '',
                    type: 'cancellation',
                  }])
                  setShowCancelModal(false)
                  setCancellationSent(true)
                  setCancelReason('')
                  setCancelOther('')
                }} disabled={!cancelReason || (cancelReason === 'Other' && !cancelOther.trim())} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: cancelReason && (cancelReason !== 'Other' || cancelOther.trim()) ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: cancelReason && (cancelReason !== 'Other' || cancelOther.trim()) ? '#111' : 'rgba(200,194,187,0.3)', border: 'none', cursor: cancelReason ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Send cancellation request</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
