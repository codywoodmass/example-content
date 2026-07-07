'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'

type Equipment = {
  id: string
  name: string
  category: string
  serial: string
  purchased: string
  value: number
  status: string
  notes: string
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Equipment | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [newForm, setNewForm] = useState({ name: '', category: 'Camera', serial: '', purchased: '', value: 0, status: 'Operational', notes: '' })

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  const CATEGORIES = ['Camera', 'Drone', 'Lens', 'Audio', 'Lighting', 'Stabiliser', 'Accessory', 'Other']
  const STATUSES = ['Operational', 'Service due', 'In repair', 'Retired']

  useEffect(() => { loadEquipment() }, [])

  async function loadEquipment() {
    setLoading(true)
    const { data, error } = await supabase.from('equipment1').select('*').order('created_at', { ascending: true })
    if (!error && data) { setEquipment(data); if (data.length > 0) setSelected(data[0]) }
    setLoading(false)
  }

  async function saveEquipment() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('equipment1').update({
      name: selected.name, category: selected.category, serial: selected.serial,
      purchased: selected.purchased, value: selected.value, status: selected.status, notes: selected.notes,
    }).eq('id', selected.id)
    if (!error) {
      setEquipment(p => p.map(e => e.id === selected.id ? selected : e))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function addEquipment() {
    if (!newForm.name) return
    setSaving(true)
    const { data, error } = await supabase.from('equipment1').insert([newForm]).select().single()
    if (!error && data) {
      setEquipment(p => [...p, data])
      setSelected(data)
      setShowNewModal(false)
      setNewForm({ name: '', category: 'Camera', serial: '', purchased: '', value: 0, status: 'Operational', notes: '' })
    }
    setSaving(false)
  }

  async function removeEquipment(id: string) {
    if (!confirm('Remove this equipment item?')) return
    await supabase.from('equipment1').delete().eq('id', id)
    setEquipment(p => p.filter(e => e.id !== id))
    setSelected(null)
  }

  const filtered = filterCat === 'All' ? equipment : equipment.filter(e => e.category === filterCat)
  const totalValue = equipment.reduce((s, e) => s + (e.value || 0), 0)
  const serviceDue = equipment.filter(e => e.status === 'Service due').length

  const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    'Operational': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' },
    'Service due': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)' },
    'In repair': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)' },
    'Retired': { color: 'rgba(200,194,187,0.4)', bg: 'rgba(200,194,187,0.08)' },
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <StudioSidebar active="equipment" />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh' }}>

        {/* EQUIPMENT LIST */}
        <div style={{ width: 300, borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Equipment</div>
              <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ Add</button>
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inp, marginBottom: 8 }}>
              <option value="All">All categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>
              <span>{filtered.length} items</span>
              <span>Total: ${totalValue.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 20, color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No equipment yet</div>}
            {filtered.map(item => {
              const sc = STATUS_COLORS[item.status] || STATUS_COLORS['Operational']
              return (
                <div key={item.id} onClick={() => setSelected(item)} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer', background: selected?.id === item.id ? 'rgba(200,194,187,0.05)' : 'transparent', borderLeft: `2px solid ${selected?.id === item.id ? '#C8C2BB' : 'transparent'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', flex: 1, paddingRight: 8 }}>{item.name}</div>
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{item.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{item.category}</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>${(item.value || 0).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {serviceDue > 0 && (
            <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(210,175,80,0.2)', background: 'rgba(210,175,80,0.06)', fontSize: 11, color: 'rgba(210,175,80,0.8)' }}>⚠ {serviceDue} item{serviceDue !== 1 ? 's' : ''} due for service</div>
          )}
        </div>

        {/* EQUIPMENT DETAIL */}
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'rgba(200,194,187,0.2)', fontSize: 13 }}>Select an item to view details</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selected.category} · ${(selected.value || 0).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => removeEquipment(selected.id)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                <button onClick={saveEquipment} disabled={saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Equipment details</div>
                <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Name</label><input style={inp} value={selected.name} onChange={e => setSelected(s => s ? { ...s, name: e.target.value } : s)} /></div>
                  <div><label style={lbl}>Category</label>
                    <select style={inp} value={selected.category} onChange={e => setSelected(s => s ? { ...s, category: e.target.value } : s)}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Status</label>
                    <select style={inp} value={selected.status} onChange={e => setSelected(s => s ? { ...s, status: e.target.value } : s)}>
                      {STATUSES.map(st => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Serial number</label><input style={inp} value={selected.serial || ''} onChange={e => setSelected(s => s ? { ...s, serial: e.target.value } : s)} placeholder="e.g. FX3-00123" /></div>
                  <div><label style={lbl}>Purchase date</label><input style={inp} value={selected.purchased || ''} onChange={e => setSelected(s => s ? { ...s, purchased: e.target.value } : s)} placeholder="e.g. Jan 2024" /></div>
                  <div><label style={lbl}>Value ($)</label><input style={inp} type="number" value={selected.value || 0} onChange={e => setSelected(s => s ? { ...s, value: parseInt(e.target.value) || 0 } : s)} /></div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <label style={lbl}>Notes</label>
                  <textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 80 }} value={selected.notes || ''} onChange={e => setSelected(s => s ? { ...s, notes: e.target.value } : s)} placeholder="Service history, insurance details, accessories included..." />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW EQUIPMENT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 500, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>Add equipment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Name</label><input style={inp} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sony FX3 Body #1" /></div>
              <div><label style={lbl}>Category</label>
                <select style={inp} value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Status</label>
                <select style={inp} value={newForm.status} onChange={e => setNewForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(st => <option key={st}>{st}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Serial number</label><input style={inp} value={newForm.serial} onChange={e => setNewForm(f => ({ ...f, serial: e.target.value }))} placeholder="e.g. FX3-00123" /></div>
              <div><label style={lbl}>Purchase date</label><input style={inp} value={newForm.purchased} onChange={e => setNewForm(f => ({ ...f, purchased: e.target.value }))} placeholder="e.g. Jan 2024" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Value ($)</label><input style={inp} type="number" value={newForm.value} onChange={e => setNewForm(f => ({ ...f, value: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addEquipment} disabled={!newForm.name} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: !newForm.name ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: !newForm.name ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: !newForm.name ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Add equipment</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
