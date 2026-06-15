'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClientPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [bookingStep, setBookingStep] = useState(1)
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedShoot, setSelectedShoot] = useState<any>(null)
  const [selectedDel, setSelectedDel] = useState<any>(null)
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [tcAccepted, setTcAccepted] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setLoading(false)
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
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
    { name: 'Full Property Highlights', price: 890, includes: ['Up to 3 hrs on-site', 'Exterior & interior coverage', 'Aerial drone included', 'Edited highlight reel', 'Colour graded'] },
    { name: 'Full Property Walkthrough', price: 1190, includes: ['Up to 5 hrs on-site', 'Room-by-room walkthrough', 'Aerial drone included', 'Full walkthrough film', 'Behind-the-scenes stills'] },
    { name: 'Social Content Highlights', price: 590, includes: ['Up to 2 hrs on-site', 'Vertical & square formats', 'Instagram & TikTok ready', '48hr turnaround'] },
  ]

  const commercialShootPackages = [
    { name: 'Brand Film', price: 1490, includes: ['Full production day', 'Director-led shoot', 'Script & shot list included', 'Colour grade & sound mix'] },
    { name: 'Social Content Day', price: 890, includes: ['Up to 6 hrs on-site', 'Multi-format capture', 'Platform-optimised', '48hr turnaround'] },
    { name: 'Event Coverage', price: 1190, includes: ['Full event duration', 'Video + photo coverage', 'Highlight reel included', 'Same-day social cuts available'] },
  ]

  const propertyDeliverables = [
    { name: 'Walkthrough + Highlights', price: 290, includes: ['1x full walkthrough video', '1x 60-90 sec highlight reel', 'Google Drive delivery'] },
    { name: 'Social Reels Pack (4x)', price: 390, includes: ['4x social highlight reels', 'Vertical & landscape cuts', 'Cover frames included', 'Google Drive delivery'] },
    { name: 'Single Social Reel', price: 140, includes: ['1x social highlight reel', 'Vertical or landscape', 'Google Drive delivery'] },
    { name: 'Stills Pack', price: 240, includes: ['20-30 edited stills', 'High-res + web-res exports', 'Google Drive delivery'] },
  ]

  const commercialDeliverables = [
    { name: 'Hero Film + Social Cut', price: 290, includes: ['1x hero film (2-3 min)', '1x 60 sec social cut', 'Google Drive delivery'] },
    { name: 'Social Reels Pack (4x)', price: 390, includes: ['4x social reels', 'Multi-format', 'Cover frames included', 'Google Drive delivery'] },
    { name: 'Single Social Reel', price: 140, includes: ['1x social reel', 'Vertical or landscape', 'Google Drive delivery'] },
    { name: 'Stills Pack', price: 240, includes: ['20-30 edited stills', 'High-res + web-res', 'Google Drive delivery'] },
  ]

  const propertyAddons = [
    { name: 'Twilight Shoot', price: 350, desc: 'Golden hour & dusk exterior coverage' },
    { name: 'Lifestyle Property', price: 280, desc: 'Directed lifestyle shots with supplied talent' },
    { name: 'Additional Talent', price: 220, desc: 'Extra model sourced by Example Content' },
    { name: 'Rush Delivery (48hr)', price: 180, desc: 'Priority edit and delivery within 48 hours' },
    { name: 'Floor Plan Graphics', price: 140, desc: 'Branded 2D floor plan overlay added to video' },
    { name: 'Virtual Tour Integration', price: 200, desc: '360° photography embedded as virtual tour link' },
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
          <svg width="20" height="20" viewBox="0 0 120 120" fill="none">
            <path d="M25 15 L75 15 L95 40 L75 40 L75 28 L42 28 L42 92 L75 92 L75 80 L95 105 L25 105 Z" fill="#C8C2BB" opacity="0.85"/>
            <path d="M52 46 L95 46 L95 74 L52 74 L52 63 L84 63 L84 57 L52 57 Z" fill="#C8C2BB" opacity="0.55"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8C2BB' }}>Example</span>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(61,71,86,0.6)', color: '#C8C2BB', padding: '3px 7px', borderRadius: 2, marginLeft: 'auto' }}>Client</span>
        </div>

        <div style={{ margin: '14px 14px 8px', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#C8C2BB', flexShrink: 0 }}>SB</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Sarah Blackwell</div>
            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>Blackwell Properties</div>
          </div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'book', label: 'Book a Shoot' },
            { id: 'upcoming', label: 'Upcoming Shoots' },
            { id: 'library', label: 'My Library' },
            { id: 'pitches', label: 'Pitch Decks' },
            { id: 'invoices', label: 'Invoices' },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id); setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false) }} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 10px', borderRadius: 5, fontSize: 12, color: activeView === item.id ? '#C8C2BB' : 'rgba(200,194,187,0.38)', background: activeView === item.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: activeView === item.id ? '0.5px solid rgba(200,194,187,0.09)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 2, textAlign: 'left', fontFamily: 'inherit' }}>
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
        {activeView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Good morning, Sarah</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Monday 16 June 2026 · Blackwell Properties</div>
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
                  { label: 'Upcoming shoots', value: '2', sub: 'Next: 20 June' },
                  { label: 'Deliverables ready', value: '14', sub: '3 new since last visit' },
                  { label: 'Pitch decks', value: '1', sub: 'Awaiting your review' },
                  { label: 'Projects complete', value: '6', sub: 'Since Jan 2025' },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ ...s.panel, padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)', marginBottom: 8 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.28)', marginTop: 4 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* TWO COL */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, marginBottom: 20 }}>

                {/* UPCOMING SHOOTS */}
                <div style={s.panel}>
                  <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Upcoming shoots</span>
                    <button onClick={() => setActiveView('book')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Book new</button>
                  </div>
                  {[
                    { day: '20', month: 'Jun', title: '14 Clifton Rd — Full Property Highlights', meta: '8:00am · Havelock North', status: 'Confirmed', statusColor: 'rgba(100,200,130,0.85)', statusBg: 'rgba(30,70,45,0.5)' },
                    { day: '28', month: 'Jun', title: 'Orchard Lane — Walkthrough + Twilight', meta: '7:00am · Napier', status: 'Pending', statusColor: 'rgba(210,175,80,0.85)', statusBg: 'rgba(65,52,18,0.5)' },
                  ].map((shoot, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                      <div style={{ width: 38, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '5px 3px' }}>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1 }}>{shoot.day}</div>
                        <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{shoot.month}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{shoot.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{shoot.meta}</div>
                      </div>
                      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: shoot.statusBg, color: shoot.statusColor, border: `0.5px solid ${shoot.statusColor}33`, flexShrink: 0 }}>{shoot.status}</span>
                    </div>
                  ))}
                </div>

                {/* MINI CALENDAR */}
                <div style={s.panel}>
                  <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>June 2026</span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                      {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                        <div key={d} style={{ fontSize: 9, color: 'rgba(200,194,187,0.25)', textAlign: 'center', padding: '3px 0' }}>{d}</div>
                      ))}
                      {['26','27','28','29','30','31','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30'].map((d, i) => (
                        <div key={i} style={{ fontSize: 11, textAlign: 'center', padding: '6px 2px', borderRadius: 3, color: i < 6 || i > 35 ? 'rgba(200,194,187,0.15)' : d === '15' ? '#fff' : 'rgba(200,194,187,0.5)', background: d === '20' && i === 25 ? '#C8C2BB' : d === '15' ? 'rgba(61,71,86,0.5)' : 'transparent', fontWeight: d === '20' && i === 25 ? 500 : 400, position: 'relative' }}>
                          {d}
                          {(d === '28' && i === 32) && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C8C2BB', opacity: 0.7, position: 'absolute', bottom: 1, left: '50%', transform: 'translateX(-50%)' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT DELIVERABLES */}
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Recent deliverables</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 8 }}>
                {[
                  { title: 'Hero Highlights Film', project: '14 Clifton Rd', date: '14 Jun 2026', type: 'Video', isNew: true, bg: 'linear-gradient(145deg,#1e2d3a,#0d1620)' },
                  { title: 'Stills Pack (24 images)', project: '14 Clifton Rd', date: '14 Jun 2026', type: 'Photo', isNew: true, bg: 'linear-gradient(145deg,#2a2016,#140e08)' },
                  { title: 'Social Reels Pack (4x)', project: '14 Clifton Rd', date: '14 Jun 2026', type: 'Video', isNew: true, bg: 'linear-gradient(145deg,#1a2418,#0c1408)' },
                ].map((item, i) => (
                  <div key={i} style={{ ...s.panel, overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ aspectRatio: '16/9', background: item.bg, position: 'relative' }}>
                      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.5)', color: '#C8C2BB', padding: '4px 8px', borderRadius: 2 }}>{item.type}</span>
                      {item.isNew && <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(120,200,140,0.2)', color: 'rgba(120,200,140,0.9)', border: '0.5px solid rgba(120,200,140,0.3)', padding: '3px 8px', borderRadius: 2 }}>New</span>}
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
              <div style={{ textAlign: 'right', marginBottom: 24 }}>
                <button onClick={() => setActiveView('library')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View full library →</button>
              </div>

              {/* PITCH DECK ALERT */}
              <div style={{ background: 'rgba(61,71,86,0.25)', border: '0.5px solid rgba(200,194,187,0.18)', borderRadius: 8, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(61,71,86,0.5)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: '#C8C2BB' }}>▤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>Pitch deck ready for review</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Example Content has sent you a proposal for the Orchard Lane social campaign.</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setActiveView('pitches')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>View deck</button>
                  <button onClick={() => setActiveView('pitches')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Accept</button>
                </div>
              </div>

            </div>
          </div>
        )}

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
            <div style={{ padding: 28, maxWidth: 780 }}>

              {/* STEP INDICATOR */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
                {['Category','Packages','Add-ons','Details','Confirm'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < 4 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${bookingStep > i + 1 ? 'rgba(100,200,130,0.5)' : bookingStep === i + 1 ? '#C8C2BB' : 'rgba(200,194,187,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: bookingStep > i + 1 ? 'rgba(100,200,130,0.8)' : bookingStep === i + 1 ? '#C8C2BB' : 'rgba(200,194,187,0.3)', background: bookingStep > i + 1 ? 'rgba(30,70,45,0.5)' : bookingStep === i + 1 ? 'rgba(200,194,187,0.08)' : 'transparent', flexShrink: 0 }}>{bookingStep > i + 1 ? '✓' : i + 1}</div>
                      <span style={{ fontSize: 11, color: bookingStep === i + 1 ? '#C8C2BB' : bookingStep > i + 1 ? 'rgba(100,200,130,0.7)' : 'rgba(200,194,187,0.3)', whiteSpace: 'nowrap' }}>{step}</span>
                    </div>
                    {i < 4 && <div style={{ flex: 1, height: 0.5, background: 'rgba(200,194,187,0.09)', margin: '0 10px' }} />}
                  </div>
                ))}
              </div>

              {/* STEP 1: CATEGORY */}
              {bookingStep === 1 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>What type of shoot are you booking?</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                    {[
                      { id: 'property', icon: '🏠', title: 'Property & Architecture', desc: 'Real estate listings, luxury residential, architectural documentation, development campaigns and rural land.', tags: ['Residential','Development','Architecture','Aerial included'] },
                      { id: 'commercial', icon: '🎬', title: 'Commercial & Events', desc: 'Brand films, social content, product shoots, events, hospitality, tourism and corporate work.', tags: ['Brand Film','Social Content','Events','Hospitality'] },
                    ].map(cat => (
                      <div key={cat.id} onClick={() => setSelectedCat(cat.id)} style={{ border: `0.5px solid ${selectedCat === cat.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, padding: 22, cursor: 'pointer', background: selectedCat === cat.id ? 'rgba(200,194,187,0.06)' : '#1A1F28', position: 'relative', transition: 'all 0.15s' }}>
                        {selectedCat === cat.id && <span style={{ position: 'absolute', top: 14, right: 16, color: '#C8C2BB' }}>✓</span>}
                        <div style={{ fontSize: 24, marginBottom: 12 }}>{cat.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#C8C2BB', marginBottom: 8 }}>{cat.title}</div>
                        <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', lineHeight: 1.65, marginBottom: 14 }}>{cat.desc}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {cat.tags.map(tag => <span key={tag} style={{ fontSize: 10, letterSpacing: '0.08em', background: 'rgba(61,71,86,0.4)', color: 'rgba(200,194,187,0.4)', padding: '3px 9px', borderRadius: 2 }}>{tag}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)' }}>Aerial is included in all property packages</span>
                    <button onClick={() => selectedCat && setBookingStep(2)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: selectedCat ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedCat ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: selectedCat ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Continue →</button>
                  </div>
                </div>
              )}

              {/* STEP 2: PACKAGES */}
              {bookingStep === 2 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Shoot package — select one</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
                    {shootPackages.map(pkg => (
                      <div key={pkg.name} onClick={() => setSelectedShoot(pkg)} style={{ border: `0.5px solid ${selectedShoot?.name === pkg.name ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, padding: '16px 18px', cursor: 'pointer', background: selectedShoot?.name === pkg.name ? 'rgba(200,194,187,0.05)' : '#1A1F28', position: 'relative' }}>
                        {selectedShoot?.name === pkg.name && <span style={{ position: 'absolute', top: 12, right: 14, color: '#C8C2BB', fontSize: 12 }}>✓</span>}
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 6, paddingRight: 16 }}>{pkg.name}</div>
                        <div style={{ fontSize: 19, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 10 }}>${pkg.price.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(200,194,187,0.4)' }}>+ GST</span></div>
                        <ul style={{ listStyle: 'none' }}>
                          {pkg.includes.map(item => <li key={item} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', display: 'flex', gap: 7, marginBottom: 5 }}><span style={{ color: 'rgba(200,194,187,0.25)' }}>—</span>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Deliverable package — select one</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
                    {deliverables.map(pkg => (
                      <div key={pkg.name} onClick={() => setSelectedDel(pkg)} style={{ border: `0.5px solid ${selectedDel?.name === pkg.name ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, padding: '14px 16px', cursor: 'pointer', background: selectedDel?.name === pkg.name ? 'rgba(200,194,187,0.05)' : '#1A1F28', position: 'relative' }}>
                        {selectedDel?.name === pkg.name && <span style={{ position: 'absolute', top: 10, right: 12, color: '#C8C2BB', fontSize: 12 }}>✓</span>}
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 5, paddingRight: 14 }}>{pkg.name}</div>
                        <div style={{ fontSize: 17, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 8 }}>${pkg.price} <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(200,194,187,0.4)' }}>+ GST</span></div>
                        <ul style={{ listStyle: 'none' }}>
                          {pkg.includes.map(item => <li key={item} style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: 'rgba(200,194,187,0.25)' }}>—</span>{item}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(1)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => selectedShoot && selectedDel && setBookingStep(3)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: selectedShoot && selectedDel ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedShoot && selectedDel ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: selectedShoot && selectedDel ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Continue →</button>
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
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Shoot details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    {selectedCat === 'property' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property address</label><input placeholder="e.g. 22 Mission Road, Havelock North" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Listing agent</label><input placeholder="Name & phone number" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Preferred date</label><input type="date" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Preferred time</label><select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}><option>Early morning (7:00–9:00am)</option><option>Morning (9:00am–12:00pm)</option><option>Afternoon (12:00–4:00pm)</option><option>Golden hour (flexible)</option></select></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Access / key notes</label><input placeholder="e.g. Key in lockbox, call owner" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property type</label><select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}><option>Luxury residential</option><option>Standard residential</option><option>Multi-unit development</option><option>Commercial property</option><option>Lifestyle / rural</option><option>Land</option></select></div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Business / brand name</label><input placeholder="e.g. Black Barn Retreats" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Industry</label><select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}><option>Hospitality & tourism</option><option>Retail & product</option><option>Corporate</option><option>Not-for-profit</option><option>Health & wellness</option><option>Other</option></select></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Shoot location</label><input placeholder="Full address or venue name" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Preferred date</label><input type="date" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} /></div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}><label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Brief & special requirements</label><textarea rows={3} placeholder="Style references, key features, specific deliverable requirements, timeline notes..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.65 }} /></div>
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
                    <button onClick={() => tcAccepted && setBookingStep(6)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: tcAccepted ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: tcAccepted ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Submit booking request →</button>
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
                    <button onClick={() => { setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Book another shoot</button>
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
        {(activeView === 'upcoming' || activeView === 'invoices') && (
          <div>
            <div style={{ padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', textTransform: 'capitalize' }}>{activeView === 'upcoming' ? 'Upcoming Shoots' : 'Invoices'}</div>
            </div>
            <div style={{ padding: 28, textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>{activeView === 'upcoming' ? '📅' : '🧾'}</div>
              <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>Coming soon</div>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>This section will show your {activeView === 'upcoming' ? 'confirmed shoot schedule' : 'invoices and payment history'} once connected to live data.</div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
