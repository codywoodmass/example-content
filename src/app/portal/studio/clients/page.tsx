'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'

type Client = {
  id: string
  created_at: string
  user_id: string
  name: string
  email: string
  phone: string
  company: string
  category: string
  notes: string
  total_bookings: number
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientBookings, setClientBookings] = useState<any[]>([])
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', company: '', category: 'Property', notes: '' })

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clients1').select('*').order('created_at', { ascending: false })
    if (!error && data) setClients(data)
    setLoading(false)
  }

  async function loadClientDetails(client: Client) {
    setSelectedClient(client)
    const { data: bookings } = await supabase.from('bookings1').select('*').eq('client_email', client.email).order('created_at', { ascending: false })
    const { data: projects } = await supabase.from('projects1').select('*').eq('email', client.email).order('created_at', { ascending: false })
    if (bookings) setClientBookings(bookings)
    if (projects) setClientProjects(projects)
  }

  async function saveClient() {
    if (!selectedClient) return
    setSaving(true)
    const { error } = await supabase.from('clients1').update({
      name: selectedClient.name,
      email: selectedClient.email,
      phone: selectedClient.phone,
      company: selectedClient.company,
      category: selectedClient.category,
      notes: selectedClient.notes,
    }).eq('id', selectedClient.id)
    if (!error) {
      setClients(p => p.map(c => c.id === selectedClient.id ? selectedClient : c))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function addClient() {
    if (!newForm.name || !newForm.email) return
    setSaving(true)
    const { data, error } = await supabase.from('clients1').insert([{ ...newForm }]).select().single()
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    if (!error && data) {
      setClients(p => [data, ...p])
      setShowNewModal(false)
      setNewForm({ name: '', email: '', phone: '', company: '', category: 'Property', notes: '' })
      loadClientDetails(data)
    }
    setSaving(false)
  }

  const filtered = clients.filter(c => {
    const matchesCat = filterCat === 'All' || c.category === filterCat
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
    'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)' },
    'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)' },
    'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)' },
    'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)' },
    'Invoicing': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' },
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <StudioSidebar active="clients" />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh' }}>

        {/* CLIENT LIST */}
        <div style={{ width: 300, borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Clients</div>
              <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." style={{ ...inp, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'Property', 'Commercial', 'Events'].map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 3, border: `0.5px solid ${filterCat === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: filterCat === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: filterCat === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 20, color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No clients yet</div>}
            {filtered.map(client => (
              <div key={client.id} onClick={() => loadClientDetails(client)} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer', background: selectedClient?.id === client.id ? 'rgba(200,194,187,0.05)' : 'transparent', borderLeft: `2px solid ${selectedClient?.id === client.id ? '#C8C2BB' : 'transparent'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{client.name || client.email}</div>
                  <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: client.category === 'Property' ? 'rgba(100,150,220,0.15)' : 'rgba(160,100,220,0.15)', color: client.category === 'Property' ? 'rgba(100,150,220,0.8)' : 'rgba(160,100,220,0.8)' }}>{client.category}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{client.email}</div>
                {client.company && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', marginTop: 2 }}>{client.company}</div>}
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(200,194,187,0.09)', fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>{filtered.length} client{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {/* CLIENT DETAIL */}
        {!selectedClient ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'rgba(200,194,187,0.2)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 13 }}>Select a client to view details</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selectedClient.name || selectedClient.email}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selectedClient.category} client{selectedClient.company ? ` · ${selectedClient.company}` : ''}</div>
              </div>
              <button onClick={saveClient} disabled={saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
              </button>
            </div>
            <div style={{ padding: 28 }}>
              {(() => {
                const confirmed = clientBookings.filter((b: any) => b.status === 'confirmed')
                const totalSpend = confirmed.reduce((sum: number, b: any) => {
                  const match = b.total?.match(/\$([\d,]+)/)
                  return sum + (match ? parseInt(match[1].replace(',', '')) : 0)
                }, 0)
                const packages = clientBookings.map((b: any) => b.shoot_package).filter(Boolean)
                const topPackage = packages.length > 0 ? packages.sort((a: string, b: string) => packages.filter((p: string) => p === b).length - packages.filter((p: string) => p === a).length)[0] : null
                const deliverablesList = clientBookings.map((b: any) => b.deliverables).filter(Boolean)
                const topDeliverable = deliverablesList.length > 0 ? deliverablesList[0] : null
                if (!totalSpend && !topPackage) return null
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Total spend</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(100,200,130,0.9)', marginBottom: 4 }}>${totalSpend.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{confirmed.length} confirmed + GST</div>
                    </div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Most booked package</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{topPackage || '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{packages.filter((p: string) => p === topPackage).length}x booked</div>
                    </div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Most requested</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{topDeliverable || '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>Deliverable package</div>
                    </div>
                  </div>
                )
              })()}
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Client details</div>
                <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={lbl}>Full name</label><input style={inp} value={selectedClient.name || ''} onChange={e => setSelectedClient(p => p ? { ...p, name: e.target.value } : p)} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} value={selectedClient.email || ''} onChange={e => setSelectedClient(p => p ? { ...p, email: e.target.value } : p)} /></div>
                  <div><label style={lbl}>Phone</label><input style={inp} value={selectedClient.phone || ''} onChange={e => setSelectedClient(p => p ? { ...p, phone: e.target.value } : p)} placeholder="e.g. 021 123 4567" /></div>
                  <div><label style={lbl}>Company / agency</label><input style={inp} value={selectedClient.company || ''} onChange={e => setSelectedClient(p => p ? { ...p, company: e.target.value } : p)} placeholder="e.g. Blackwell Properties" /></div>
                  <div><label style={lbl}>Category</label>
                    <select style={inp} value={selectedClient.category} onChange={e => setSelectedClient(p => p ? { ...p, category: e.target.value } : p)}>
                      <option>Property</option><option>Commercial</option><option>Events</option><option>Socials</option>
                    </select>
                  </div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <label style={lbl}>Notes</label>
                  <textarea value={selectedClient.notes || ''} onChange={e => setSelectedClient(p => p ? { ...p, notes: e.target.value } : p)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 80 }} placeholder="Client preferences, working style, important notes..." />
                </div>
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Projects</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}</span>
                </div>
                {clientProjects.length === 0 ? (
                  <div style={{ padding: '20px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No projects yet</div>
                ) : clientProjects.map((p: any, i: number) => {
                  const sc = STAGE_COLORS[p.stage] || { color: '#C8C2BB', bg: 'rgba(200,194,187,0.1)' }
                  return (
                    <div key={p.id} onClick={() => router.push(`/portal/studio/projects/${p.id}`)} style={{ padding: '12px 18px', borderBottom: i < clientProjects.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No shoot date'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 60, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${p.progress}%`, background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color }}>{p.stage}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Booking history</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{clientBookings.length} booking{clientBookings.length !== 1 ? 's' : ''}</span>
                </div>
                {clientBookings.length === 0 ? (
                  <div style={{ padding: '20px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No bookings yet</div>
                ) : (() => {
                  const now = new Date()
                  const upcoming = clientBookings.filter((b: any) => b.preferred_date && new Date(b.preferred_date) >= now && b.status !== 'declined')
                  const past = clientBookings.filter((b: any) => !b.preferred_date || new Date(b.preferred_date) < now || b.status === 'declined')
                  return (
                    <>
                      {upcoming.length > 0 && (
                        <>
                          <div style={{ padding: '8px 18px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', background: 'rgba(200,194,187,0.02)' }}>Upcoming</div>
                          {upcoming.map((b: any) => (
                            <div key={b.id} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{b.address || b.shoot_package || 'Booking'}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{b.shoot_package}{b.preferred_date ? ` · ${new Date(b.preferred_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>
                                {b.total && <div style={{ fontSize: 11, color: 'rgba(100,200,130,0.7)', marginTop: 2 }}>{b.total}</div>}
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: b.status === 'confirmed' ? 'rgba(100,200,130,0.15)' : 'rgba(210,175,80,0.15)', color: b.status === 'confirmed' ? 'rgba(100,200,130,0.9)' : 'rgba(210,175,80,0.9)' }}>{b.status}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {past.length > 0 && (
                        <>
                          <div style={{ padding: '8px 18px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', background: 'rgba(200,194,187,0.02)' }}>Past</div>
                          {past.map((b: any, i: number) => (
                            <div key={b.id} style={{ padding: '12px 18px', borderBottom: i < past.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(200,194,187,0.5)', marginBottom: 2 }}>{b.address || b.shoot_package || 'Booking'}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>{b.shoot_package}{b.preferred_date ? ` · ${new Date(b.preferred_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>
                                {b.total && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{b.total}</div>}
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: b.status === 'confirmed' ? 'rgba(100,200,130,0.1)' : b.status === 'declined' ? 'rgba(210,90,90,0.1)' : 'rgba(200,194,187,0.08)', color: b.status === 'confirmed' ? 'rgba(100,200,130,0.7)' : b.status === 'declined' ? 'rgba(210,90,90,0.7)' : 'rgba(200,194,187,0.4)' }}>{b.status}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW CLIENT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>New client</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={lbl}>Full name</label><input style={inp} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. James Blackwell" /></div>
              <div><label style={lbl}>Email</label><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="james@example.co.nz" /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="021 123 4567" /></div>
              <div><label style={lbl}>Company</label><input style={inp} value={newForm.company} onChange={e => setNewForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Blackwell Properties" /></div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Category</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Property', 'Commercial', 'Events', 'Socials'].map(cat => (
                    <button key={cat} onClick={() => setNewForm(f => ({ ...f, category: cat }))} style={{ fontSize: 11, padding: '7px 14px', borderRadius: 3, border: `0.5px solid ${newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newForm.category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addClient} disabled={!newForm.name || !newForm.email} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: !newForm.name || !newForm.email ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: !newForm.name || !newForm.email ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: !newForm.name || !newForm.email ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Create client</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
