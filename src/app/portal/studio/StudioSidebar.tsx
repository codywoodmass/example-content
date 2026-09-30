'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { label: 'Overview', items: [
    { id: 'dashboard', label: 'Example Content', href: '', view: 'dashboard' },
  ]},
  { label: 'Work', items: [
    { id: 'projects', label: 'Projects', href: '/portal/studio/projects', view: '' },
    { id: 'schedule', label: 'Shoot Schedule', href: '', view: 'schedule' },
    { id: 'bookings', label: 'Booking Requests', href: '', view: 'bookings' },
    { id: 'brief', label: 'Property Brief', href: '/portal/studio/brief', view: '' },
    { id: 'todos', label: 'To Do List', href: '/portal/studio/todos', view: '' },
  ]},
  { label: 'Team', items: [
    { id: 'team', label: 'Team & Time', href: '/portal/studio/team', view: '' },
    { id: 'equipment', label: 'Equipment', href: '/portal/studio/equipment', view: '' },
  ]},
  { label: 'Finance', items: [
    { id: 'finance', label: 'P&L Overview', href: '', view: 'finance' },
    { id: 'invoices', label: 'Invoices', href: '/portal/studio/invoices', view: '' },
  ]},
  { label: 'Clients', items: [
    { id: 'clients', label: 'Clients', href: '/portal/studio/clients' },
    { id: 'pitches', label: 'Brief Creator', href: '/portal/studio/pitches' },
  ]},
]

export default function StudioSidebar({ active, onViewChange }: { active?: string; onViewChange?: (view: string) => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', session.user.id).maybeSingle()
      setRole(profile?.role || null)
      setName(profile?.full_name || session.user.email || 'Studio')
    })
  }, [])

  // Editors get everything except Finance, Team & Time / Equipment, and booking
  // requests. Fail closed while role is still loading (null) so none of this
  // flashes for an editor account — it only appears once the role is confirmed
  // as exactly 'studio'.
  const nav = NAV
    .filter(group => role === 'studio' || (group.label !== 'Finance' && group.label !== 'Team'))
    .map(group => group.label === 'Work' && role !== 'studio'
      ? { ...group, items: group.items.filter(item => item.id !== 'bookings') }
      : group)
  const initial = (name || 'S').trim().charAt(0).toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{ width: 210, flexShrink: 0, background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 44, objectFit: 'contain', maxWidth: 174 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(200,194,187,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600, color: '#C8C2BB' }}>{initial}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{name}</div>
      </div>
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {nav.map(group => (
          <div key={group.label}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.22)', padding: '0 8px', margin: '14px 0 5px' }}>{group.label}</div>
            {group.items.map(item => (
              <button key={item.id} onClick={() => {
                if (onViewChange && (item as any).view) {
                  onViewChange((item as any).view)
                } else if ((item as any).view) {
                  router.push('/portal/studio#' + (item as any).view)
                } else if (item.href) {
                  router.push(item.href)
                }
              }} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 10px', borderRadius: 5, fontSize: 12, color: active === item.id ? '#C8C2BB' : 'rgba(200,194,187,0.38)', background: active === item.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: active === item.id ? '0.5px solid rgba(200,194,187,0.09)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 1, textAlign: 'left', fontFamily: 'inherit' }}>
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
