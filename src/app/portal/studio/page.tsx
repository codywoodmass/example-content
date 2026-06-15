'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StudioPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)
      setLoading(false)
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13, letterSpacing: '0.1em' }}>Loading...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="22" height="22" viewBox="0 0 120 120" fill="none">
            <path d="M25 15 L75 15 L95 40 L75 40 L75 28 L42 28 L42 92 L75 92 L75 80 L95 105 L25 105 Z" fill="#C8C2BB" opacity="0.85"/>
            <path d="M52 46 L95 46 L95 74 L52 74 L52 63 L84 63 L84 57 L52 57 Z" fill="#C8C2BB" opacity="0.55"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8C2BB' }}>Example Content</span>
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(61,71,86,0.7)', color: '#C8C2BB', padding: '3px 7px', borderRadius: 2 }}>Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{user?.email}</span>
          <button onClick={handleSignOut} style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.45)', background: 'transparent', padding: '7px 14px', borderRadius: 3, cursor: 'pointer' }}>Sign out</button>
        </div>
      </div>
      <div style={{ padding: 28 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: '#fff', marginBottom: 4 }}>Studio Dashboard</h1>
          <p style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>Welcome back — here's what's happening at Example Content.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Active projects', value: '—', sub: 'Loading from database' },
            { label: 'Pending bookings', value: '—', sub: 'Awaiting review' },
            { label: 'Revenue this month', value: '—', sub: 'From invoiced projects' },
            { label: 'Hours logged', value: '—', sub: 'Across all team' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
              <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)', marginBottom: 8 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Booking Requests', desc: 'Review and confirm new shoot requests', href: '/portal/studio/bookings' },
            { label: 'Projects', desc: 'Track active projects and milestones', href: '/portal/studio/projects' },
            { label: 'Pitch Decks', desc: 'Create and send client proposals', href: '/portal/studio/pitches' },
            { label: 'Team & Time', desc: 'Log hours and manage your team', href: '/portal/studio/team' },
            { label: 'Equipment', desc: 'Track your gear and service schedule', href: '/portal/studio/equipment' },
            { label: 'P&L Overview', desc: 'Revenue, expenses and profit', href: '/portal/studio/finance' },
          ].map(({ label, desc, href }) => (
            <a key={label} href={href} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '18px 20px', textDecoration: 'none', display: 'block' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.38)', lineHeight: 1.6 }}>{desc}</div>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)', marginTop: 12 }}>→</div>
            </a>
          ))}
        </div>
        <div style={{ background: 'rgba(100,200,130,0.06)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 7, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(100,200,130,0.85)', flex: 'none' }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,200,130,0.85)', marginBottom: 2 }}>Database connected</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.38)' }}>Supabase is live · All tables created · Logged in as {user?.email}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
