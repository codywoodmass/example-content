'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'
import { localDateKey } from '@/lib/time'
import { mondayOf } from '@/lib/timeTracking'
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

type MemberTimeEntry = {
  id: string
  project_id: string | null
  label: string | null
  phase: string
  hours: number
  entry_date: string
  note: string | null
  billable: boolean
  projects1: { title: string } | null
}

// Fin's KPI (and the general target for billable utilisation) is 85% of a
// 40-hour week spent on billable work — shown as a reference for everyone
// rather than a per-person configurable number, since that's the only
// target actually asked for.
const TARGET_WEEKLY_HOURS = 40
const TARGET_BILLABLE_PCT = 85
const INTERNAL_LABELS = ['Meeting', 'Admin', 'Training', 'Other']

export default function TeamPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      // Team & Time is studio-only — an editor (e.g. Fin) navigating here directly
      // gets bounced back to the dashboard rather than just having the nav link hidden.
      if (profile?.role !== 'studio') { router.push('/portal/studio'); return }
      setAuthorized(true)
    })
  }, [])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', role: '', email: '', phone: '', photo_url: '', bio: '', active: true })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoBroken, setPhotoBroken] = useState<Record<string, boolean>>({})

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  useEffect(() => { if (authorized) loadTeam() }, [authorized])

  const [previewBroken, setPreviewBroken] = useState(false)
  useEffect(() => { setPreviewBroken(false) }, [selected?.id])

  const [memberWeekOffset, setMemberWeekOffset] = useState(0)
  const [memberEntries, setMemberEntries] = useState<MemberTimeEntry[]>([])
  const [memberEntriesLoading, setMemberEntriesLoading] = useState(false)
  const [newInternal, setNewInternal] = useState({ label: 'Meeting', hours: '', entry_date: localDateKey(new Date()), note: '', billable: false })
  const [addingInternal, setAddingInternal] = useState(false)

  useEffect(() => { setMemberWeekOffset(0) }, [selected?.id])

  const weekStart = (() => {
    const monday = mondayOf(new Date())
    monday.setDate(monday.getDate() + memberWeekOffset * 7)
    return monday
  })()
  const weekEnd = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d })()

  async function loadMemberEntries() {
    if (!selected) return
    setMemberEntriesLoading(true)
    const { data, error } = await supabase.from('time_entries')
      .select('id, project_id, label, phase, hours, entry_date, note, billable, projects1(title)')
      .eq('person', selected.name)
      .gte('entry_date', localDateKey(weekStart))
      .lte('entry_date', localDateKey(weekEnd))
      .order('entry_date', { ascending: false })
    if (!error) setMemberEntries((data as any) || [])
    setMemberEntriesLoading(false)
  }
  useEffect(() => { if (selected) loadMemberEntries() }, [selected?.id, memberWeekOffset])

  async function addInternalEntry() {
    if (!selected) return
    const hours = parseFloat(newInternal.hours)
    if (!Number.isFinite(hours) || hours <= 0) { notify('Enter a valid number of hours', 'error'); return }
    setAddingInternal(true)
    try {
      const { data, error } = await supabase.from('time_entries').insert([{
        project_id: null,
        label: newInternal.label,
        phase: 'Internal',
        hours,
        person: selected.name,
        entry_date: newInternal.entry_date,
        note: newInternal.note || null,
        billable: newInternal.billable,
      }]).select('id, project_id, label, phase, hours, entry_date, note, billable, projects1(title)').single()
      if (error) { notify('Error logging time: ' + error.message, 'error'); return }
      if (data && localDateKey(weekStart) <= newInternal.entry_date && newInternal.entry_date <= localDateKey(weekEnd)) {
        setMemberEntries(p => [data as any, ...p])
      }
      setNewInternal(p => ({ ...p, hours: '', note: '' }))
    } finally {
      setAddingInternal(false)
    }
  }

  async function deleteMemberEntry(id: string) {
    if (!(await confirmDialog('Delete this time entry?'))) return
    await supabase.from('time_entries').delete().eq('id', id)
    setMemberEntries(p => p.filter(e => e.id !== id))
  }

  async function uploadTeamPhoto(file: File, apply: (url: string) => void) {
    setUploadingPhoto(true)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
      const path = `${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('team-photos').upload(path, file, { upsert: true })
      if (error) { console.error('Photo upload error:', error); return }
      const { data: { publicUrl } } = supabase.storage.from('team-photos').getPublicUrl(path)
      apply(publicUrl)
    } finally {
      setUploadingPhoto(false)
    }
  }

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

  if (!authorized) return <main style={{ background: '#0E1014', minHeight: '100vh' }} />

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="team" />
      <div className="ec-studio-main ec-split-pane" style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh', minWidth: 0 }}>

        {/* TEAM LIST */}
        <div className="ec-split-list" style={{ width: 280, borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
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
                {member.photo_url && !photoBroken[member.id] ? (
                  <img src={member.photo_url} alt={member.name} onError={() => setPhotoBroken(p => ({ ...p, [member.id]: true }))} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
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
                <button onClick={saveMember} disabled={saving || uploadingPhoto} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: saving || uploadingPhoto ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              </div>
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Profile</div>
                <div className="ec-form-grid-2" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={lbl}>Full name</label><input style={inp} value={selected.name} onChange={e => setSelected(s => s ? { ...s, name: e.target.value } : s)} /></div>
                  <div><label style={lbl}>Role / title</label><input style={inp} value={selected.role} onChange={e => setSelected(s => s ? { ...s, role: e.target.value } : s)} placeholder="e.g. Director / Shooter" /></div>
                  <div><label style={lbl}>Email</label><input style={inp} type="email" value={selected.email || ''} onChange={e => setSelected(s => s ? { ...s, email: e.target.value } : s)} /></div>
                  <div><label style={lbl}>Phone</label><input style={inp} value={selected.phone || ''} onChange={e => setSelected(s => s ? { ...s, phone: e.target.value } : s)} /></div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={lbl}>Photo</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...inp, flex: 1 }} value={selected.photo_url || ''} onChange={e => { setSelected(s => s ? { ...s, photo_url: e.target.value } : s); setPreviewBroken(false) }} placeholder="Upload a photo, or paste a URL" />
                      <label style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: uploadingPhoto ? 'rgba(200,194,187,0.25)' : 'rgba(200,194,187,0.5)', cursor: uploadingPhoto ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {uploadingPhoto ? 'Uploading...' : 'Upload'}
                        <input type="file" accept="image/*" disabled={uploadingPhoto} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadTeamPhoto(f, url => { setSelected(s => s ? { ...s, photo_url: url } : s); setPreviewBroken(false) }); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Bio (shown in pitch decks)</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 80 }} value={selected.bio || ''} onChange={e => setSelected(s => s ? { ...s, bio: e.target.value } : s)} placeholder="Short bio for pitch decks and client-facing materials..." /></div>
                </div>
              </div>

              {(() => {
                const totalHours = memberEntries.reduce((s, e) => s + e.hours, 0)
                const billableHours = memberEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0)
                const billablePct = TARGET_WEEKLY_HOURS ? Math.round((billableHours / TARGET_WEEKLY_HOURS) * 100) : 0
                const onTarget = billablePct >= TARGET_BILLABLE_PCT
                return (
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Time tracking</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => setMemberWeekOffset(o => o - 1)} style={{ background: 'transparent', border: 'none', color: 'rgba(200,194,187,0.5)', cursor: 'pointer', fontSize: 13, padding: '2px 6px', fontFamily: 'inherit' }}>‹</button>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', whiteSpace: 'nowrap' as const }}>
                          {memberWeekOffset === 0 ? 'This week' : weekStart.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' }) + ' – ' + weekEnd.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                        </span>
                        <button onClick={() => setMemberWeekOffset(o => Math.min(0, o + 1))} disabled={memberWeekOffset === 0} style={{ background: 'transparent', border: 'none', color: memberWeekOffset === 0 ? 'rgba(200,194,187,0.15)' : 'rgba(200,194,187,0.5)', cursor: memberWeekOffset === 0 ? 'default' : 'pointer', fontSize: 13, padding: '2px 6px', fontFamily: 'inherit' }}>›</button>
                      </div>
                    </div>
                    <div style={{ padding: 18 }}>
                      <div className="ec-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
                        <div style={{ background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '12px 14px' }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Total hours</div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: '#C8C2BB' }}>{totalHours.toFixed(1)}h</div>
                        </div>
                        <div style={{ background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '12px 14px' }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Billable hours</div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: '#C8C2BB' }}>{billableHours.toFixed(1)}h</div>
                        </div>
                        <div style={{ background: onTarget ? 'rgba(100,200,130,0.06)' : 'rgba(210,175,80,0.06)', border: `0.5px solid ${onTarget ? 'rgba(100,200,130,0.25)' : 'rgba(210,175,80,0.25)'}`, borderRadius: 6, padding: '12px 14px' }}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Billable % (target {TARGET_BILLABLE_PCT}%)</div>
                          <div style={{ fontSize: 20, fontWeight: 600, color: onTarget ? 'rgba(100,200,130,0.9)' : 'rgba(210,175,80,0.9)' }}>{billablePct}%</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 16, padding: '10px 12px', background: 'rgba(200,194,187,0.03)', borderRadius: 6, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                        <select value={newInternal.label} onChange={e => setNewInternal(p => ({ ...p, label: e.target.value }))} style={{ flex: '1 1 110px', minWidth: 0, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          {INTERNAL_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <input type="number" min="0" step="0.25" placeholder="Hours" value={newInternal.hours} onChange={e => setNewInternal(p => ({ ...p, hours: e.target.value }))} style={{ flex: '0 1 70px', minWidth: 0, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                        <input type="date" value={newInternal.entry_date} onChange={e => setNewInternal(p => ({ ...p, entry_date: e.target.value }))} style={{ flex: '1 1 130px', minWidth: 0, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                        <input placeholder="Note (optional)" value={newInternal.note} onChange={e => setNewInternal(p => ({ ...p, note: e.target.value }))} style={{ flex: '2 1 140px', minWidth: 0, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '7px 8px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(200,194,187,0.5)', flex: '0 0 auto', cursor: 'pointer' }}>
                          <input type="checkbox" checked={newInternal.billable} onChange={e => setNewInternal(p => ({ ...p, billable: e.target.checked }))} />
                          Billable
                        </label>
                        <button onClick={addInternalEntry} disabled={addingInternal || !newInternal.hours} style={{ flexShrink: 0, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 4, background: newInternal.hours ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: newInternal.hours ? '#111' : 'rgba(200,194,187,0.3)', border: 'none', cursor: newInternal.hours ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontWeight: 500 }}>+ Log</button>
                      </div>

                      {memberEntriesLoading ? (
                        <div style={{ padding: '14px 0', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Loading...</div>
                      ) : memberEntries.length === 0 ? (
                        <div style={{ padding: '14px 0', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Nothing logged this week yet</div>
                      ) : (
                        <div style={{ background: 'rgba(200,194,187,0.02)', border: '0.5px solid rgba(200,194,187,0.08)', borderRadius: 6, overflow: 'hidden' }}>
                          {memberEntries.map((e, i) => (
                            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < memberEntries.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', width: 60, flexShrink: 0 }}>{new Date(e.entry_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', width: 44, flexShrink: 0 }}>{e.hours}h</span>
                              <span style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: e.billable ? 'rgba(100,200,130,0.1)' : 'rgba(200,194,187,0.08)', color: e.billable ? 'rgba(100,200,130,0.8)' : 'rgba(200,194,187,0.4)', flexShrink: 0 }}>{e.billable ? 'Billable' : 'Non-billable'}</span>
                              <span style={{ fontSize: 12, color: '#C8C2BB', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                {e.projects1?.title || e.label || e.phase}{e.note ? ' — ' + e.note : ''}
                              </span>
                              <button onClick={() => deleteMemberEntry(e.id)} style={{ fontSize: 14, color: 'rgba(200,194,187,0.25)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}>×</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {selected.photo_url && (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Photo preview</div>
                  <div style={{ padding: 18 }}>
                    {previewBroken ? (
                      <div style={{ background: 'rgba(210,90,90,0.08)', border: '0.5px solid rgba(210,90,90,0.25)', borderRadius: 6, padding: '12px 14px', fontSize: 12, color: 'rgba(210,90,90,0.85)', maxWidth: 320, lineHeight: 1.6 }}>
                        This image failed to load — the URL may be broken or expired (a Google Drive "share" link won't work here). Upload a file instead, or paste a direct image URL.
                      </div>
                    ) : (
                      <img src={selected.photo_url} alt={selected.name} onError={() => setPreviewBroken(true)} style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', objectPosition: 'top' }} />
                    )}
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
            <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={lbl}>Full name</label><input style={inp} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cody Woodmass" /></div>
              <div><label style={lbl}>Role</label><input style={inp} value={newForm.role} onChange={e => setNewForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Director" /></div>
              <div><label style={lbl}>Email</label><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Photo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} value={newForm.photo_url} onChange={e => setNewForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="Upload a photo, or paste a URL" />
                  <label style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: uploadingPhoto ? 'rgba(200,194,187,0.25)' : 'rgba(200,194,187,0.5)', cursor: uploadingPhoto ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {uploadingPhoto ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" disabled={uploadingPhoto} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadTeamPhoto(f, url => setNewForm(form => ({ ...form, photo_url: url }))); e.target.value = '' }} />
                  </label>
                </div>
              </div>
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
