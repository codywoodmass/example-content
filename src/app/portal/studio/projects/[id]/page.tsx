'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../../StudioSidebar'

const STAGES = ['Pre-Production', 'Shooting', 'Post-Production', 'Revisions', 'Invoicing']
const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
  'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)' },
  'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)' },
  'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)' },
  'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)' },
  'Invoicing': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' },
}
type Project = {
  id: string; title: string; client: string; contact: string; email: string
  category: string; address: string; stage: string; shoot_date: string
  draft_due: string; delivery_due: string; drive_url: string; progress: number
  from_booking: boolean; general_notes: string; editor_notes: string
}
export default function ProjectDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'editor' | 'brief'>('overview')
  const [briefLoading, setBriefLoading] = useState(false)
  const [brief, setBrief] = useState<any>(null)
  const [newDeliverable, setNewDeliverable] = useState('')
  const [deliverables, setDeliverables] = useState<{ id: string; name: string; done: boolean }[]>([])
  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }
  useEffect(() => { if (id) loadProject() }, [id])
  async function loadProject() {
    setLoading(true)
    const { data, error } = await supabase.from('projects1').select('*').eq('id', id).single()
    if (!error && data) {
      setProject(data)
      try { const s = localStorage.getItem(`deliverables_${id}`); if (s) setDeliverables(JSON.parse(s)) } catch {}
    }
    setLoading(false)
  }
  function updateField<K extends keyof Project>(field: K, value: Project[K]) {
    setProject(p => p ? { ...p, [field]: value } : p)
  }
  async function saveProject() {
    if (!project) return
    setSaving(true)
    const { error } = await supabase.from('projects1').update({
      title: project.title, client: project.client, contact: project.contact,
      email: project.email, category: project.category, address: project.address,
      stage: project.stage, shoot_date: project.shoot_date || null,
      draft_due: project.draft_due || null, delivery_due: project.delivery_due || null,
      drive_url: project.drive_url, progress: project.progress,
      general_notes: project.general_notes, editor_notes: project.editor_notes,
    }).eq('id', id)
    localStorage.setItem(`deliverables_${id}`, JSON.stringify(deliverables))
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }
  function toggleDeliverable(did: string) {
    const u = deliverables.map(d => d.id === did ? { ...d, done: !d.done } : d)
    setDeliverables(u); localStorage.setItem(`deliverables_${id}`, JSON.stringify(u))
  }
  function addDeliverable() {
    if (!newDeliverable.trim()) return
    const u = [...deliverables, { id: Date.now().toString(), name: newDeliverable.trim(), done: false }]
    setDeliverables(u); localStorage.setItem(`deliverables_${id}`, JSON.stringify(u)); setNewDeliverable('')
  }
  function removeDeliverable(did: string) {
    const u = deliverables.filter(d => d.id !== did)
    setDeliverables(u); localStorage.setItem(`deliverables_${id}`, JSON.stringify(u))
  }
  async function generateBrief() {
    if (!project) return
    setBriefLoading(true)
    try {
      const res = await fetch('/api/property-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: project.address, propertyType: 'Luxury residential', shootDate: project.shoot_date }) })
      setBrief(await res.json())
    } catch (e) { console.error(e) }
    setBriefLoading(false)
  }
  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <StudioSidebar active="projects" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading project...</div>
      </div>
    </main>
  )
  if (!project) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif' }}>
      <StudioSidebar active="projects" />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>
          Project not found.
          <button onClick={() => router.push('/portal/studio/projects')} style={{ color: '#C8C2BB', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 8 }}>← Back</button>
        </div>
      </div>
    </main>
  )
  const stageIdx = STAGES.indexOf(project.stage)
  const completedCount = deliverables.filter(d => d.done).length
  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <StudioSidebar active="projects" />
      <div style={{ flex: 1, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* TOPBAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/portal/studio/projects')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>← Projects</button>
            <div style={{ width: 1, height: 16, background: 'rgba(200,194,187,0.12)' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{project.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{project.client} · {project.category}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select value={project.stage} onChange={e => updateField('stage', e.target.value)} style={{ ...inp, width: 'auto', padding: '6px 12px', fontSize: 11, background: STAGE_COLORS[project.stage]?.bg, color: STAGE_COLORS[project.stage]?.color, border: `0.5px solid ${STAGE_COLORS[project.stage]?.color}44` }}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={saveProject} disabled={saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
            </button>
          </div>
        </div>
        {/* STAGE PROGRESS */}
        <div style={{ padding: '20px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {STAGES.map((stage, idx) => {
              const isDone = idx < stageIdx; const isCurrent = idx === stageIdx; const c = STAGE_COLORS[stage]
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: idx < STAGES.length - 1 ? 1 : 'none' }}>
                  <div onClick={() => updateField('stage', stage)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? 'rgba(100,200,130,0.2)' : isCurrent ? c.bg : 'rgba(200,194,187,0.05)', border: `1.5px solid ${isDone ? 'rgba(100,200,130,0.5)' : isCurrent ? c.color : 'rgba(200,194,187,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: isDone ? 'rgba(100,200,130,0.8)' : isCurrent ? c.color : 'rgba(200,194,187,0.2)' }}>{isDone ? '✓' : idx + 1}</div>
                    <span style={{ fontSize: 10, color: isCurrent ? '#C8C2BB' : 'rgba(200,194,187,0.3)', whiteSpace: 'nowrap' }}>{stage}</span>
                  </div>
                  {idx < STAGES.length - 1 && <div style={{ flex: 1, height: 1.5, background: isDone ? 'rgba(100,200,130,0.3)' : 'rgba(200,194,187,0.08)', margin: '0 8px', marginBottom: 22 }} />}
                </div>
              )
            })}
          </div>
        </div>
        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(200,194,187,0.09)', padding: '0 28px', background: '#14181F', flexShrink: 0 }}>
          {[{ id: 'overview', label: 'Overview' }, { id: 'notes', label: 'General notes' }, { id: 'editor', label: 'Editor notes' }, ...(project.category === 'Property' ? [{ id: 'brief', label: 'Property brief' }] : [])].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ fontSize: 12, padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#C8C2BB' : 'transparent'}`, color: activeTab === tab.id ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>{tab.label}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, overflow: 'hidden' }}>
          {/* MAIN */}
          <div style={{ overflowY: 'auto', padding: 28 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Project details</div>
                  <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div><label style={lbl}>Client</label><input style={inp} value={project.client} onChange={e => updateField('client', e.target.value)} /></div>
                    <div><label style={lbl}>Email</label><input style={inp} value={project.email} onChange={e => updateField('email', e.target.value)} /></div>
                    <div><label style={lbl}>Category</label>
                      <select style={inp} value={project.category} onChange={e => updateField('category', e.target.value)}>
                        <option>Property</option><option>Commercial</option><option>Events</option><option>Socials</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: project.category === 'Property' ? 'span 1' : 'span 1' }}><label style={lbl}>{project.category === 'Property' ? 'Property address' : 'Shoot location'}</label><input style={inp} value={project.address} onChange={e => updateField('address', e.target.value)} /></div>
                  </div>
                </div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Timeline</div>
                  <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div><label style={lbl}>Shoot date</label><input style={inp} type="date" value={project.shoot_date || ''} onChange={e => updateField('shoot_date', e.target.value)} /></div>
                    <div><label style={lbl}>Draft due</label><input style={inp} type="date" value={project.draft_due || ''} onChange={e => updateField('draft_due', e.target.value)} /></div>
                    <div><label style={lbl}>Delivery date</label><input style={inp} type="date" value={project.delivery_due || ''} onChange={e => updateField('delivery_due', e.target.value)} /></div>
                  </div>
                </div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Progress</div>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                      <div style={{ flex: 1, height: 6, background: 'rgba(200,194,187,0.07)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', minWidth: 35 }}>{project.progress}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={project.progress} onChange={e => updateField('progress', parseInt(e.target.value))} style={{ width: '100%', accentColor: '#C8C2BB' }} />
                  </div>
                </div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Google Drive</div>
                  <div style={{ padding: 18 }}>
                    <label style={lbl}>Project folder link</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input style={{ ...inp, flex: 1 }} value={project.drive_url} onChange={e => updateField('drive_url', e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
                      {project.drive_url && <a href={project.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', fontWeight: 500, fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' }}>Open →</a>}
                    </div>
                  </div>
                </div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Deliverables</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{completedCount} / {deliverables.length} complete</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {deliverables.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div onClick={() => toggleDeliverable(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, padding: '10px 14px', borderRadius: 5, background: d.done ? 'rgba(100,200,130,0.05)' : 'rgba(200,194,187,0.03)', border: `0.5px solid ${d.done ? 'rgba(100,200,130,0.2)' : 'rgba(200,194,187,0.08)'}`, cursor: 'pointer' }}>
                            <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${d.done ? 'rgba(100,200,130,0.6)' : 'rgba(200,194,187,0.2)'}`, background: d.done ? 'rgba(100,200,130,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {d.done && <span style={{ fontSize: 11, color: 'rgba(100,200,130,0.8)' }}>✓</span>}
                            </div>
                            <span style={{ fontSize: 12, color: d.done ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</span>
                          </div>
                          <button onClick={() => removeDeliverable(d.id)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.5)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                      {deliverables.length === 0 && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)', padding: '8px 0' }}>No deliverables yet</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input style={{ ...inp, flex: 1 }} value={newDeliverable} onChange={e => setNewDeliverable(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDeliverable()} placeholder="Add deliverable..." />
                      <button onClick={addDeliverable} style={{ fontSize: 11, padding: '9px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'notes' && (
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>General notes</div>
                <div style={{ padding: 18 }}>
                  <textarea value={project.general_notes} onChange={e => updateField('general_notes', e.target.value)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.75, minHeight: 420, fontSize: 13 }} placeholder="Project notes, client feedback, shoot day observations..." />
                </div>
              </div>
            )}
            {activeTab === 'editor' && (
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Editor notes</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>For the edit team</span>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ background: 'rgba(100,150,220,0.07)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 5, padding: '10px 14px', marginBottom: 14, fontSize: 11, color: 'rgba(100,150,220,0.8)', lineHeight: 1.6 }}>Include: colour grade references, music preferences, pacing notes, specific clip selections, client revision requests, export specs.</div>
                  <textarea value={project.editor_notes} onChange={e => updateField('editor_notes', e.target.value)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.75, minHeight: 380, fontSize: 13 }} placeholder="e.g. Grade — warm, filmic. Music — cinematic, no lyrics..." />
                </div>
              </div>
            )}
            {activeTab === 'brief' && (
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Property research</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.address || 'No address set'}</span>
                </div>
                <div style={{ padding: 18 }}>
                  {!brief ? (
                    <button onClick={generateBrief} disabled={briefLoading || !project.address} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 3, background: briefLoading || !project.address ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: briefLoading || !project.address ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', cursor: briefLoading || !project.address ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                      {briefLoading ? '✦ Researching property...' : '✦ Generate property brief'}
                    </button>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
                        {[['Bedrooms', brief.property?.bedrooms], ['Bathrooms', brief.property?.bathrooms], ['Garage', brief.property?.garageSpaces], ['Floor size', brief.property?.floorSize], ['Land size', brief.property?.landSize]].map(([label, value]) => (
                          <div key={label as string} style={{ background: 'rgba(61,71,86,0.3)', borderRadius: 5, padding: '12px 14px', border: '0.5px solid rgba(200,194,187,0.09)' }}>
                            <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{value || '—'}</div>
                          </div>
                        ))}
                      </div>
                      {brief.property?.description && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, marginBottom: 16 }}>{brief.property.description}</div>}
                      {brief.mapboxImageUrl && <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}><img src={brief.mapboxImageUrl} alt="Satellite" style={{ width: '100%', display: 'block' }} /></div>}
                      {brief.weather && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'rgba(61,71,86,0.2)', borderRadius: 5 }}>
                          <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Shoot day weather</span>
                          <span style={{ fontSize: 12, color: '#C8C2BB' }}>{brief.weather.condition}</span>
                          <span style={{ fontSize: 12, color: '#C8C2BB' }}>{brief.weather.minTemp}°–{brief.weather.maxTemp}°C</span>
                          <span style={{ fontSize: 12, color: 'rgba(100,150,220,0.85)' }}>{brief.weather.rainChance}% rain</span>
                        </div>
                      )}
                      <button onClick={() => setBrief(null)} style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 }}>↻ Regenerate</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* RIGHT SIDEBAR */}
          <div style={{ background: '#0F1216', borderLeft: '0.5px solid rgba(200,194,187,0.09)', overflowY: 'auto' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)' }}>Summary</div>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Progress</span>
                <span style={{ fontSize: 11, color: '#C8C2BB' }}>{project.progress}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
              </div>
              {deliverables.length > 0 && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>Deliverables: {completedCount} / {deliverables.length}</div>}
            </div>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Key dates</div>
              {[{ label: 'Shoot', value: project.shoot_date, icon: '📷' }, { label: 'Draft due', value: project.draft_due, icon: '✏️' }, { label: 'Delivery', value: project.delivery_due, icon: '📦' }].map(({ label, value, icon }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{icon} {label}</span>
                  <span style={{ fontSize: 11, color: '#C8C2BB' }}>{value || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Client</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{project.client}</div>
              {project.email && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{project.email}</div>}
            </div>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Google Drive</div>
              {project.drive_url ? (
                <a href={project.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>📁 Open project folder →</a>
              ) : (
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)' }}>No folder linked yet</div>
              )}
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Move to stage</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {STAGES.map(stage => {
                  const c = STAGE_COLORS[stage]; const isCurrent = project.stage === stage
                  return (
                    <button key={stage} onClick={() => updateField('stage', stage)} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 4, border: `0.5px solid ${isCurrent ? c.color : 'rgba(200,194,187,0.09)'}`, background: isCurrent ? c.bg : 'transparent', color: isCurrent ? c.color : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCurrent && <span style={{ fontSize: 10 }}>✓</span>}{stage}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
