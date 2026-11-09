'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'
import { notify, ToastHost, ConfirmHost, confirmDialog } from '@/lib/notify'

type Agency = {
  id: string
  created_at: string
  name: string
  billing_email: string | null
  notes: string | null
}

type Client = {
  id: string
  name: string
  email: string
  phone: string
}

export default function AgenciesPage() {
  const router = useRouter()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null)
  const [agencyClients, setAgencyClients] = useState<Client[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  useEffect(() => { loadAgencies() }, [])

  async function loadAgencies() {
    setLoading(true)
    const { data, error } = await supabase.from('agencies').select('*').order('name', { ascending: true })
    if (!error && data) setAgencies(data)
    setLoading(false)
  }

  async function loadAgencyDetails(agency: Agency) {
    setSelectedAgency(agency)
    const { data } = await supabase.from('clients1').select('id, name, email, phone').eq('agency_id', agency.id).order('name', { ascending: true })
    setAgencyClients(data || [])
  }

  async function saveAgency() {
    if (!selectedAgency) return
    setSaving(true)
    const { error } = await supabase.from('agencies').update({
      name: selectedAgency.name,
      billing_email: selectedAgency.billing_email,
      notes: selectedAgency.notes,
    }).eq('id', selectedAgency.id)
    if (!error) {
      setAgencies(p => p.map(a => a.id === selectedAgency.id ? selectedAgency : a).sort((a, b) => a.name.localeCompare(b.name)))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      notify('Error saving: ' + error.message, 'error')
    }
    setSaving(false)
  }

  async function addAgency() {
    if (!newName.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('agencies').insert([{ name: newName.trim() }]).select().single()
    if (error) { notify('Error: ' + error.message, 'error'); setSaving(false); return }
    setAgencies(p => [...p, data].sort((a, b) => a.name.localeCompare(b.name)))
    setShowNewModal(false)
    setNewName('')
    loadAgencyDetails(data)
    setSaving(false)
  }

  async function deleteAgency() {
    if (!selectedAgency) return
    if (agencyClients.length > 0) { notify('This agency still has clients linked to it — move them to another agency first.', 'error'); return }
    if (!(await confirmDialog(`Delete "${selectedAgency.name}"? This can't be undone.`))) return
    const { error } = await supabase.from('agencies').delete().eq('id', selectedAgency.id)
    if (error) { notify('Error deleting: ' + error.message, 'error'); return }
    setAgencies(p => p.filter(a => a.id !== selectedAgency.id))
    setSelectedAgency(null)
  }

  const filtered = agencies.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Geist, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="agencies" />
      <div className="ec-studio-main ec-split-pane" style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh', minWidth: 0 }}>

        {/* AGENCY LIST */}
        <div className="ec-split-list" style={{ width: 300, borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Agencies</div>
              <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New</button>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agencies..." style={inp} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 20, color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No agencies yet</div>}
            {filtered.map(agency => (
              <div key={agency.id} onClick={() => loadAgencyDetails(agency)} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer', background: selectedAgency?.id === agency.id ? 'rgba(200,194,187,0.05)' : 'transparent', borderLeft: `2px solid ${selectedAgency?.id === agency.id ? '#C8C2BB' : 'transparent'}` }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{agency.name}</div>
                {agency.billing_email ? (
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{agency.billing_email}</div>
                ) : (
                  <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(210,175,80,0.1)', color: 'rgba(210,175,80,0.8)' }}>No billing email</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(200,194,187,0.09)', fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>{filtered.length} agenc{filtered.length !== 1 ? 'ies' : 'y'}</div>
        </div>

        {/* AGENCY DETAIL */}
        {!selectedAgency ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'rgba(200,194,187,0.2)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 13 }}>Select an agency to view details</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selectedAgency.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{agencyClients.length} agent{agencyClients.length !== 1 ? 's' : ''} linked</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={deleteAgency} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                <button onClick={saveAgency} disabled={saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Agency details</div>
                <div className="ec-form-grid-2" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={lbl}>Agency name</label><input style={inp} value={selectedAgency.name} onChange={e => setSelectedAgency(p => p ? { ...p, name: e.target.value } : p)} /></div>
                  <div>
                    <label style={lbl}>Billing email</label>
                    <input style={inp} type="email" value={selectedAgency.billing_email || ''} onChange={e => setSelectedAgency(p => p ? { ...p, billing_email: e.target.value } : p)} placeholder="accounts@agency.co.nz" />
                  </div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <label style={lbl}>Notes</label>
                  <textarea value={selectedAgency.notes || ''} onChange={e => setSelectedAgency(p => p ? { ...p, notes: e.target.value } : p)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 70 }} placeholder="PO requirements, invoicing preferences, billing contact name..." />
                </div>
                {!selectedAgency.billing_email && (
                  <div style={{ margin: '0 18px 18px', padding: '10px 14px', borderRadius: 4, fontSize: 11, lineHeight: 1.6, background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.25)', color: 'rgba(210,175,80,0.9)' }}>No billing email set — property invoices for this agency's agents can't be sent until one's added here.</div>
                )}
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Agents at this agency</div>
                {agencyClients.length === 0 ? (
                  <div style={{ padding: '20px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No agents linked yet — assign this agency from a client's details page.</div>
                ) : agencyClients.map((c, i) => (
                  <div key={c.id} onClick={() => router.push('/portal/studio/clients')} style={{ padding: '12px 18px', borderBottom: i < agencyClients.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{c.name || c.email}</div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW AGENCY MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 18 }}>New agency</div>
            <label style={lbl}>Agency name</label>
            <input autoFocus style={{ ...inp, marginBottom: 20 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Harcourts" onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) addAgency() }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowNewModal(false); setNewName('') }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addAgency} disabled={!newName.trim() || saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: newName.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: newName.trim() ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Create agency</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
