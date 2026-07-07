'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const NAV = [
  { label: 'Overview', items: [
    { id: 'dashboard', label: 'Dashboard', href: '/portal/studio' },
  ]},
  { label: 'Work', items: [
    { id: 'projects', label: 'Projects', href: '/portal/studio/projects' },
    { id: 'schedule', label: 'Shoot Schedule', href: '/portal/studio?view=schedule' },
    { id: 'bookings', label: 'Booking Requests', href: '/portal/studio?view=bookings' },
    { id: 'brief', label: 'Property Brief', href: '/portal/studio/brief' },
  ]},
  { label: 'Team', items: [
    { id: 'team', label: 'Team & Time', href: '/portal/studio/team' },
    { id: 'equipment', label: 'Equipment', href: '/portal/studio/equipment' },
  ]},
  { label: 'Finance', items: [
    { id: 'finance', label: 'P&L Overview', href: '/portal/studio?view=finance' },
  ]},
  { label: 'Clients', items: [
    { id: 'clients', label: 'Clients', href: '/portal/studio/clients' },
    { id: 'pitches', label: 'Pitch Decks', href: '/portal/studio/pitches' },
  ]},
]

export default function StudioSidebar({ active, onViewChange }: { active?: string; onViewChange?: (view: string) => void }) {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{ width: 210, flexShrink: 0, background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
        <svg width="20" height="20" viewBox="0 0 120 120" fill="none">
          <path d="M25 15 L75 15 L95 40 L75 40 L75 28 L42 28 L42 92 L75 92 L75 80 L95 105 L25 105 Z" fill="#C8C2BB" opacity="0.85"/>
          <path d="M52 46 L95 46 L95 74 L52 74 L52 63 L84 63 L84 57 L52 57 Z" fill="#C8C2BB" opacity="0.55"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8C2BB' }}>Example</span>
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(61,71,86,0.7)', color: '#C8C2BB', padding: '3px 7px', borderRadius: 2, marginLeft: 'auto' }}>Studio</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0, color: '#C8C2BB' }}>JD</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Jordan D.</div>
          <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>Director</div>
        </div>
      </div>
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.label}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.22)', padding: '0 8px', margin: '14px 0 5px' }}>{group.label}</div>
            {group.items.map(item => (
              <button key={item.id} onClick={() => { if (onViewChange && item.href.includes('?view=')) { onViewChange(item.href.split('?view=')[1]) } else { router.push(item.href) } }} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 10px', borderRadius: 5, fontSize: 12, color: active === item.id ? '#C8C2BB' : 'rgba(200,194,187,0.38)', background: active === item.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: active === item.id ? '0.5px solid rgba(200,194,187,0.09)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 1, textAlign: 'left', fontFamily: 'inherit' }}>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div style={{ padding: 12, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
        <button onClick={handleSignOut} style={{ width: '100%', padding: '8px 10px', borderRadius: 5, fontSize: 12, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>Sign out</button>
      </div>
    </aside>
  )
}
