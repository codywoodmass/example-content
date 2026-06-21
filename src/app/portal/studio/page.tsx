'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StudioPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [briefData, setBriefData] = useState<Record<number, any>>({})
  const [briefLoading, setBriefLoading] = useState<Record<number, boolean>>({})


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
      { id: 'bookings', label: 'Booking Requests', badge: '3' },
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
      <aside style={{ width: 210, flexShrink: 0, background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
          <svg width="20" height="20" viewBox="0 0 120 120" fill="none">
            <path d="M25 15 L75 15 L95 40 L75 40 L75 28 L42 28 L42 92 L75 92 L75 80 L95 105 L25 105 Z" fill="#C8C2BB" opacity="0.85"/>
            <path d="M52 46 L95 46 L95 74 L52 74 L52 63 L84 63 L84 57 L52 57 Z" fill="#C8C2BB" opacity="0.55"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Example</span>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(61,71,86,0.7)', color: '#C8C2BB', padding: '3px 7px', borderRadius: 2, marginLeft: 'auto' }}>Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>JD</div>
          <div><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Jordan D.</div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>Director</div></div>
        </div>
        <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
          {navGroups.map(group => (
            <div key={group.label}>
              <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.22)', padding: '0 8px', margin: '14px 0 5px' }}>{group.label}</div>
              {group.items.map(item => (
                <button key={item.id} onClick={() => item.id === 'brief' ? router.push('/portal/studio/brief') : item.id === 'pitches' ? router.push('/portal/studio/pitches') : setActiveView(item.id)} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 10px', borderRadius: 5, fontSize: 12, color: activeView === item.id ? '#C8C2BB' : 'rgba(200,194,187,0.38)', background: activeView === item.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: activeView === item.id ? '0.5px solid rgba(200,194,187,0.09)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 1, textAlign: 'left', fontFamily: 'inherit' }}>
                  {item.label}
                  {item.badge && <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(210,90,90,0.2)', color: 'rgba(210,90,90,0.9)', padding: '2px 7px', borderRadius: 10 }}>{item.badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
          <button onClick={handleSignOut} style={{ width: '100%', padding: '8px 10px', borderRadius: 5, fontSize: 12, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Studio Dashboard</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Monday 16 June 2026 · Week 25</div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setActiveView('bookings')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>3 new requests</button>
                <button onClick={() => setActiveView('projects')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>This month — June 2026</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Revenue', value: '$18,400', sub: '↑ 12% vs May', subColor: 'rgba(100,200,130,0.85)' },
                  { label: 'Active projects', value: '8', sub: '3 shooting this week', subColor: 'rgba(200,194,187,0.28)' },
                  { label: 'Hours logged', value: '94h', sub: 'Across 4 team members', subColor: 'rgba(200,194,187,0.28)' },
                  { label: 'Net profit', value: '$11,240', sub: '61% margin', subColor: 'rgba(100,200,130,0.85)' },
                ].map(({ label, value, sub, subColor }) => (
                  <div key={label} style={{ ...s.panel, padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
                    <div style={{ fontSize: 10, color: subColor, marginTop: 4 }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
                <div style={s.panel}>
                  <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Active projects</span>
                    <button onClick={() => setActiveView('projects')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>View all</button>
                  </div>
                  {[
                    { name: '14 Clifton Rd', client: 'Blackwell Properties', progress: 80, status: 'Editing', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)' },
                    { name: 'Orchard Lane Dev.', client: 'Blackwell Properties', progress: 45, status: 'Shooting', sc: 'rgba(210,175,80,0.85)', sb: 'rgba(65,52,18,0.5)' },
                    { name: 'Black Barn — Brand', client: 'Black Barn Retreats', progress: 20, status: 'Pre-prod', sc: 'rgba(100,150,220,0.85)', sb: 'rgba(25,45,80,0.5)' },
                    { name: 'Elephant Hill Winery', client: 'Elephant Hill', progress: 95, status: 'Review', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)' },
                  ].map((p, i) => (
                    <div key={i} onClick={() => setActiveView('projects')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < 3 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.client}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 120 }}>
                        <div style={{ flex: 1, height: 3, background: 'rgba(200,194,187,0.08)', borderRadius: 2 }}><div style={{ height: '100%', width: `${p.progress}%`, background: '#C8C2BB', opacity: 0.6, borderRadius: 2 }} /></div>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.progress}%</span>
                      </div>
                      {pill(p.status, p.sc, p.sb)}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={s.panel}>
                    <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>This week's shoots</span>
                      <button onClick={() => setActiveView('schedule')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Schedule</button>
                    </div>
                    {[
                      { day: '17', month: 'Jun', title: 'Mission Heights', meta: '7:30am · Taradale', status: 'Confirmed' },
                      { day: '19', month: 'Jun', title: 'Black Barn Day 1', meta: '9:00am · Havelock North', status: 'Pending' },
                    ].map((sh, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 18px', borderBottom: i === 0 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                        <div style={{ width: 34, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '4px 2px', flexShrink: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{sh.day}</div>
                          <div style={{ fontSize: 8, color: 'rgba(200,194,187,0.4)' }}>{sh.month}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{sh.title}</div>
                          <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{sh.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(210,175,80,0.07)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 7, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(210,175,80,0.85)', marginBottom: 8 }}>3 booking requests pending</div>
                    <button onClick={() => setActiveView('bookings')} style={{ width: '100%', fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Review requests</button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(100,200,130,0.06)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 7, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(100,200,130,0.85)' }} />
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Logged in as {user?.email} · Database connected</div>
              </div>
            </div>
          </div>
        )}

        {/* ===== PROJECTS ===== */}
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
              <div><div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Booking Requests</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>3 new requests awaiting review</div></div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { title: '20A Emerson Street — St Heliers Auckland', address: '20A Emerson Street, St Heliers, Auckland', propertyType: 'Luxury residential', cat: 'Property', shoot: 'Full Property Highlights', del: 'Social Reels Pack (4x)', addons: 'Twilight Shoot', date: '2026-06-24', dateLabel: '24 Jun (morning)', total: '$1,630 + GST' },
                { title: 'Harcourts — 14 Te Mata Rd, Havelock North', address: '14 Te Mata Rd, Havelock North', propertyType: 'Standard residential', cat: 'Property', shoot: 'Social Content Highlights', del: 'Single Social Reel', addons: 'None', date: '2026-06-27', dateLabel: '27 Jun (golden hour)', total: '$730 + GST' },
                { title: 'Napier City Brewers — Brand Film', address: 'Napier City Brewers, Napier', propertyType: 'Commercial property', cat: 'Commercial', shoot: 'Brand Film', del: 'Hero Film + Social Cut', addons: 'Additional Talent', date: '', dateLabel: 'TBC — flexible', total: '$2,000 + GST' },
              ].map((req, i) => (
                <div key={i} style={{ ...s.panel, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{req.title}</span>
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: 'rgba(200,194,187,0.1)', color: '#C8C2BB', border: '0.5px solid rgba(200,194,187,0.2)' }}>{req.cat}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: req.cat === 'Property' ? 14 : 0 }}>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Shoot package</div><div style={{ fontSize: 12 }}>{req.shoot}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Deliverables</div><div style={{ fontSize: 12 }}>{req.del}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Add-ons</div><div style={{ fontSize: 12 }}>{req.addons}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Preferred date</div><div style={{ fontSize: 12 }}>{req.dateLabel}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>Total</div><div style={{ fontSize: 12, color: 'rgba(100,200,130,0.85)' }}>{req.total}</div></div>
                        <div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>T&Cs accepted</div>{pill('Yes', 'rgba(100,200,130,0.85)', 'rgba(30,70,45,0.5)')}</div>
                      </div>

                      {req.cat === 'Property' && (
                        <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.08)', paddingTop: 14 }}>
                          {!briefData[i] && (
                            <button
                              onClick={() => generateBriefForBooking(i, req.address, req.propertyType, req.date)}
                              disabled={briefLoading[i]}
                              style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(100,150,220,0.4)', color: 'rgba(100,150,220,0.9)', background: 'rgba(100,150,220,0.08)', cursor: briefLoading[i] ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: briefLoading[i] ? 0.6 : 1 }}
                            >
                              {briefLoading[i] ? 'Researching property...' : '✦ Generate Property Brief'}
                            </button>
                          )}

                          {briefData[i] && !briefData[i].error && (
                            <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '14px 16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB', letterSpacing: '0.04em' }}>PROPERTY BRIEF</span>
                                <button onClick={() => generateBriefForBooking(i, req.address, req.propertyType, req.date)} style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>↻ Regenerate</button>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 12 }}>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Bedrooms</div><div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{briefData[i].property?.bedrooms || '—'}</div></div>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Bathrooms</div><div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{briefData[i].property?.bathrooms || '—'}</div></div>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Garage</div><div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{briefData[i].property?.garageSpaces || '—'}</div></div>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Floor size</div><div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{briefData[i].property?.floorSize || '—'}</div></div>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Land size</div><div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{briefData[i].property?.landSize || '—'}</div></div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Rateable value</div><div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,200,130,0.85)' }}>{briefData[i].property?.rateableValue || '—'}</div></div>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Last sale price</div><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{briefData[i].property?.lastSalePrice || '—'}</div></div>
                                <div><div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 2 }}>Last sale year</div><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{briefData[i].property?.lastSaleDate || '—'}</div></div>
                              </div>
                              {briefData[i].property?.suburbCharacter && (
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>SUBURB — {briefData[i].property?.suburb}</div>
                                  <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.6 }}>{briefData[i].property?.suburbCharacter}</div>
                                </div>
                              )}
                              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.7)', lineHeight: 1.6, borderTop: '0.5px solid rgba(200,194,187,0.08)', paddingTop: 10, marginBottom: 12 }}>{briefData[i].property?.description || 'No description available.'}</div>
                              {briefData[i].mapboxImageUrl && (
                                <div style={{ marginBottom: 12, borderRadius: 5, overflow: 'hidden', border: '0.5px solid rgba(200,194,187,0.09)' }}>
                                  <img src={briefData[i].mapboxImageUrl} alt="Property satellite view" style={{ width: '100%', display: 'block' }} />
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: briefData[i].weather ? 12 : 0 }}>
                                {briefData[i].property?.listingUrl && briefData[i].property.listingUrl !== 'null' && (
                                  <a href={briefData[i].property.listingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', textDecoration: 'none', background: 'transparent' }}>View listing →</a>
                                )}
                                <a href={`https://www.homes.co.nz/search?q=${encodeURIComponent(briefData[i].property?.suburb || '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', textDecoration: 'none' }}>homes.co.nz →</a>
                              </div>
                              {briefData[i].weather && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 12, borderTop: '0.5px solid rgba(200,194,187,0.08)' }}>
                                  <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)' }}>WEATHER ON SHOOT DAY</span>
                                  <span style={{ fontSize: 12, color: '#C8C2BB' }}>{briefData[i].weather.condition}</span>
                                  <span style={{ fontSize: 12, color: '#C8C2BB' }}>{briefData[i].weather.minTemp}° – {briefData[i].weather.maxTemp}°C</span>
                                  <span style={{ fontSize: 12, color: 'rgba(100,150,220,0.85)' }}>{briefData[i].weather.rainChance}% rain chance</span>
                                </div>
                              )}
                            </div>
                          )}

                          {briefData[i]?.error && (
                            <div style={{ fontSize: 12, color: 'rgba(210,90,90,0.85)' }}>Could not generate brief. Try again.</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                      <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Confirm & schedule</button>
                      <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Request changes</button>
                      <button style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.4)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Decline</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== TEAM ===== */}
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
    </main>
  )
}
