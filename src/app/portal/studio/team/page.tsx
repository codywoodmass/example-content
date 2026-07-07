'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'

type TeamMember = {
  id: string
  name: string
  role: string
  email: string
  phone: string
  photo_url: string
  bio: string
  active: boolean
}

export default function TeamPage() {
  const router = useRouter()
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', role: '', email: '', phone: '', photo_url: '', bio: '', active: true })

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  useEffect(() => { loadTeam() }, [])

  async function loadTeam() {
    setLoading(true)
    const { data, error } = await supabase.from('team1').select('*').order('created_at', { ascending: true })
    if (!error && data) { setTeam(data); if (data.length > 0) setSelected(data[0]) }
    setLoading(false)
  }

  async function saveMember() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase.from('team1').update({
      name: selected.name, role: selected.role, email: selected.email,
      phone: selected.phone, photo_url: selected.photo_url, bio: selected.bio, active: selected.active,
    }).eq('id', selected.id)
    if (!error) {
      setTeam(p => p.map(m => m.id === selected.id ? selected : m))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function addMember() {
    if (!newForm.name || !newForm.role) return
    setSaving(true)
    const { data, error } = await supabase.from('team1').insert([newForm]).select().single()
    if (!error && data) {
      setTeam(p => [...p, data])
      setSelected(data)
      setShowNewModal(false)
      setNewForm({ name: '', role: '', email: '', phone: '', photo_url: '', bio: '', active: true })
    }
    setSaving(false)
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from('team1').update({ active }).eq('id', id)
    setTeam(p => p.map(m => m.id === id ? { ...m, active } : m))
    if (selected?.id === id) setSelected(s => s ? { ...s, active } : s)
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <StudioSidebar active="team" />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh' }}>

        {/* TEAM LIST */}
        <div style={{ width: 280, borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Team</div>
              <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ Add</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>Loading...</div>}
            {!loading && team.length === 0 && <div style={{ padding: 20, color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No team members yet</div>}
            {team.map(member => (
              <div key={member.id} onClick={() => setSelected(member)} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer', background: selected?.id === member.id ? 'rgba(200,194,187,0.05)' : 'transparent', borderLeft: `2px solid ${selected?.id === member.id ? '#C8C2BB' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0, color: '#C8C2BB' }}>{member.name.split(' ').map(n => n[0]).join('')}</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: member.active ? '#C8C2BB' : 'rgba(200,194,187,0.4)' }}>{member.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{member.role}</div>
                </div>
                {!member.active && <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.3)' }}>Inactive</span>}
              </div>
            ))}
          </div>
        </div>

        {/* MEMBER DETAIL */}
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'rgba(200,194,187,0.2)', fontSize: 13 }}>Select a team member</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selected.role}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleActive(selected.id, !selected.active)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: `0.5px solid ${selected.active ? 'rgba(210,90,90,0.3)' : 'rgba(100,200,130,0.3)'}`, color: selected.active ? 'rgba(210,90,90,0.8)' : 'rgba(100,200,130,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {selected.active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={saveMember} disabled={saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Profile</div>
                <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={lbl}>Full name</label><input style={inp} value={selected.name} onChange={e => setSelected(s => s ? { ...s, name: e.target.value } : s)} /></div>
                  <div><label style={lbl}>Role / title</label><input style={inp} value={selected.role} onChange={e => setSelected(s => s ? { ...s, role: e.target.value } : s)} placeholder="e.g. Director / Shooter" /></div>
                  <div><label style={lbl}>Email</label><input style={inp} type="email" value={selected.email || ''} onChange={e => setSelected(s => s ? { ...s, email: e.target.value } : s)} /></div>
                  <div><label style={lbl}>Phone</label><input style={inp} value={selected.phone || ''} onChange={e => setSelected(s => s ? { ...s, phone: e.target.value } : s)} /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Photo URL</label><input style={inp} value={selected.photo_url || ''} onChange={e => setSelected(s => s ? { ...s, photo_url: e.target.value } : s)} placeholder="https://... or /images/name.jpg" /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Bio (shown in pitch decks)</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 80 }} value={selected.bio || ''} onChange={e => setSelected(s => s ? { ...s, bio: e.target.value } : s)} placeholder="Short bio for pitch decks and client-facing materials..." /></div>
                </div>
              </div>
              {selected.photo_url && (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Photo preview</div>
                  <div style={{ padding: 18 }}>
                    <img src={selected.photo_url} alt={selected.name} style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', objectPosition: 'top' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* NEW MEMBER MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>Add team member</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={lbl}>Full name</label><input style={inp} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cody Woodmass" /></div>
              <div><label style={lbl}>Role</label><input style={inp} value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Director" /></div>
              <div><label style={lbl}>Email</label><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Photo URL</label><input style={inp} value={newForm.photo_url} onChange={e => setNewForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="/images/name.jpg or https://..." /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Bio</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 60 }} value={newForm.bio} onChange={e => setNewForm(f => ({ ...f, bio: e.target.value }))} placeholder="Short bio for pitch decks..." /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addMember} disabled={!newForm.name || !newForm.role} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: !newForm.name || !newForm.role ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: !newForm.name || !newForm.role ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: !newForm.name || !newForm.role ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Add member</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
