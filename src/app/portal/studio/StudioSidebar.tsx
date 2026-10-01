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
  const [menuOpen, setMenuOpen] = useState(false)

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
    <>
      <style>{`
        .ec-studio-topbar { display: none; }
        .ec-studio-backdrop { display: none; }
        .ec-studio-sidebar-close { display: none; }
        .ec-studio-sidebar { width: 210px; flex-shrink: 0; position: sticky; top: 0; height: 100vh; transform: none; }
        @media (max-width: 860px) {
          .ec-studio-topbar { display: flex !important; }
          .ec-studio-backdrop.open { display: block !important; }
          .ec-studio-sidebar { position: fixed !important; top: 0; left: 0; height: 100vh; z-index: 60; transform: translateX(-100%); transition: transform 0.25s ease; }
          .ec-studio-sidebar.open { transform: translateX(0); }
          .ec-studio-sidebar-close { display: flex !important; }
          .ec-studio-main { padding-top: 56px; }
          .ec-split-pane { flex-direction: column !important; height: auto !important; overflow: visible !important; }
          .ec-split-list { width: 100% !important; height: auto !important; max-height: 280px; border-right: none !important; border-bottom: 0.5px solid rgba(200,194,187,0.09); }
        }
        @media (max-width: 640px) {
          .ec-form-grid-2 { grid-template-columns: 1fr !important; }
          .ec-form-grid-3 { grid-template-columns: 1fr !important; }
          .ec-form-grid-4 { grid-template-columns: 1fr !important; }
          .ec-form-grid-5 { grid-template-columns: repeat(2,1fr) !important; }
          .ec-shoot-date-row { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 900px) {
          .ec-dash-split { grid-template-columns: 1fr !important; }
          .ec-form-grid-4 { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 860px) {
          .ec-video-row { flex-direction: column !important; width: 94vw !important; height: auto !important; max-height: 92vh; overflow-y: auto; }
          .ec-video-row > div:first-child { width: 100% !important; height: 50vh !important; }
          .ec-video-row > div:first-child iframe { max-width: 100% !important; width: 100% !important; height: 100% !important; }
          .ec-video-row .ec-feedback-panel { width: 100% !important; height: 220px !important; flex-shrink: 0 !important; }
        }
        @media (max-width: 900px) {
          .ec-kanban { display: flex !important; overflow-x: auto !important; }
          .ec-kanban > div { min-width: 260px !important; flex-shrink: 0 !important; }
          .ec-deck-editor { display: flex !important; overflow-x: auto !important; }
          .ec-deck-editor > div { flex-shrink: 0 !important; }
          .ec-deck-editor > div:first-child { width: 210px !important; }
          .ec-deck-editor > div:nth-child(2) { width: 86vw !important; }
          .ec-deck-editor > div:last-child { width: 280px !important; }
        }
        @media (max-width: 860px) {
          .ec-toolbar-wrap { height: auto !important; flex-wrap: wrap !important; padding: 12px 16px !important; gap: 10px; row-gap: 10px; position: static !important; }
          .ec-toolbar-wrap > div:last-child { flex-wrap: wrap !important; width: 100%; }
        }
      `}</style>

      {/* MOBILE TOPBAR */}
      <div className="ec-studio-topbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 40, background: 'rgba(14,16,20,0.92)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 28, objectFit: 'contain' }} />
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={{ background: 'transparent', border: 'none', width: 28, height: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', padding: 0 }}>
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%' }} />
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%' }} />
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%' }} />
        </button>
      </div>

      {/* BACKDROP */}
      <div className={`ec-studio-backdrop ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 55 }} />

      <aside className={`ec-studio-sidebar ${menuOpen ? 'open' : ''}`} style={{ background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 44, objectFit: 'contain', maxWidth: 174 }} />
          <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="ec-studio-sidebar-close" style={{ background: 'transparent', border: 'none', color: 'rgba(200,194,187,0.5)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
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
                  setMenuOpen(false)
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
    </>
  )
}
