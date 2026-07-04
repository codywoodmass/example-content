'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAGES = ['Pre-Production', 'Shooting', 'Post-Production', 'Revisions', 'Invoicing']

const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
  'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)' },
  'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)' },
  'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)' },
  'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)' },
  'Invoicing': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' },
}

const SAMPLE_PROJECT = {
  id: '1',
  title: '14 Clifton Rd',
  client: 'Blackwell Properties',
  contact: 'James Blackwell',
  email: 'james@blackwell.co.nz',
  category: 'Property',
  address: '14 Clifton Rd, Havelock North',
  stage: 'Post-Production',
  shootDate: '2026-06-14',
  draftDue: '2026-06-21',
  deliveryDue: '2026-06-28',
  driveUrl: '',
  progress: 75,
  fromBooking: true,
  deliverables: [
    { id: '1', name: 'Full property walkthrough', done: true },
    { id: '2', name: 'Social reel — 9:16', done: true },
    { id: '3', name: 'Social reel — 4:5', done: false },
    { id: '4', name: 'Twilight highlights', done: false },
  ],
}

export default function ProjectDetailPage() {
  const router = useRouter()
  const [project, setProject] = useState(SAMPLE_PROJECT)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'editor' | 'brief'>('overview')
  const [generalNotes, setGeneralNotes] = useState('')
  const [editorNotes, setEditorNotes] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [briefLoading, setBriefLoading] = useState(false)
  const [brief, setBrief] = useState<any>(null)
  const [newDeliverable, setNewDeliverable] = useState('')

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  const completedCount = project.deliverables.filter(d => d.done).length
  const stageIdx = STAGES.indexOf(project.stage)

  async function generateBrief() {
    setBriefLoading(true)
    try {
      const res = await fetch('/api/property-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: project.address, propertyType: 'Luxury residential', shootDate: project.shootDate }),
      })
      const data = await res.json()
      setBrief(data)
    } catch (e) { console.error(e) }
    setBriefLoading(false)
  }

  function toggleDeliverable(id: string) {
    setProject(p => ({ ...p, deliverables: p.deliverables.map(d => d.id === id ? { ...d, done: !d.done } : d) }))
  }

  function addDeliverable() {
    if (!newDeliverable.trim()) return
    setProject(p => ({ ...p, deliverables: [...p.deliverables, { id: Date.now().toString(), name: newDeliverable.trim(), done: false }] }))
    setNewDeliverable('')
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13 }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/portal/studio/projects')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em' }}>← Projects</button>
          <div style={{ width: 1, height: 16, background: 'rgba(200,194,187,0.12)' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{project.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{project.client} · {project.category}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select value={project.stage} onChange={e => setProject(p => ({ ...p, stage: e.target.value }))} style={{ ...inp, width: 'auto', padding: '6px 12px', fontSize: 11, background: STAGE_COLORS[project.stage]?.bg, color: STAGE_COLORS[project.stage]?.color, border: `0.5px solid ${STAGE_COLORS[project.stage]?.color}44` }}>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: 'calc(100vh - 57px)' }}>

        {/* MAIN CONTENT */}
        <div style={{ overflowY: 'auto' }}>

          {/* STAGE PROGRESS */}
          <div style={{ padding: '20px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {STAGES.map((stage, idx) => {
                const isDone = idx < stageIdx
                const isCurrent = idx === stageIdx
                const c = STAGE_COLORS[stage]
                return (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: idx < STAGES.length - 1 ? 1 : 'none' }}>
                    <div onClick={() => setProject(p => ({ ...p, stage }))} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: isDone ? 'rgba(100,200,130,0.2)' : isCurrent ? c.bg : 'rgba(200,194,187,0.05)', border: `1.5px solid ${isDone ? 'rgba(100,200,130,0.5)' : isCurrent ? c.color : 'rgba(200,194,187,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: isDone ? 'rgba(100,200,130,0.8)' : isCurrent ? c.color : 'rgba(200,194,187,0.2)' }}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span style={{ fontSize: 10, color: isCurrent ? '#C8C2BB' : 'rgba(200,194,187,0.3)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{stage}</span>
                    </div>
                    {idx < STAGES.length - 1 && <div style={{ flex: 1, height: 1.5, background: isDone ? 'rgba(100,200,130,0.3)' : 'rgba(200,194,187,0.08)', margin: '0 8px', marginBottom: 22 }} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(200,194,187,0.09)', padding: '0 28px', background: '#14181F' }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'notes', label: 'General notes' },
              { id: 'editor', label: 'Editor notes' },
              ...(project.category === 'Property' ? [{ id: 'brief', label: 'Property brief' }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{ fontSize: 12, padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? '#C8C2BB' : 'transparent'}`, color: activeTab === tab.id ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>{tab.label}</button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div style={{ padding: 28 }}>

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Project info */}
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Project details</div>
                  <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div><label style={lbl}>Client</label><input style={inp} defaultValue={project.client} /></div>
                    <div><label style={lbl}>Contact</label><input style={inp} defaultValue={project.contact} /></div>
                    <div><label style={lbl}>Email</label><input style={inp} defaultValue={project.email} /></div>
                    <div><label style={lbl}>Category</label>
                      <select style={inp} defaultValue={project.category}>
                        <option>Property</option><option>Commercial</option><option>Architectural</option><option>Events</option>
                      </select>
                    </div>
                    {project.category === 'Property' && (
                      <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Property address</label><input style={inp} defaultValue={project.address} onChange={e => setProject(p => ({ ...p, address: e.target.value }))} /></div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Timeline</div>
                  <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div><label style={lbl}>Shoot date</label><input style={inp} type="date" defaultValue={project.shootDate} /></div>
                    <div><label style={lbl}>Draft due</label><input style={inp} type="date" defaultValue={project.draftDue} /></div>
                    <div><label style={lbl}>Delivery date</label><input style={inp} type="date" defaultValue={project.deliveryDue} /></div>
                  </div>
                </div>

                {/* Google Drive */}
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Google Drive</div>
                  <div style={{ padding: 18 }}>
                    <label style={lbl}>Project folder link</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input style={{ ...inp, flex: 1 }} value={driveUrl} onChange={e => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/drive/folders/..." />
                      {driveUrl && (
                        <a href={driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap' }}>Open →</a>
                      )}
                    </div>
                    {!driveUrl && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)', marginTop: 8 }}>Paste the Google Drive folder link for this project</div>}
                  </div>
                </div>

                {/* Deliverables */}
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Deliverables</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{completedCount} / {project.deliverables.length} complete</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {project.deliverables.map(d => (
                        <div key={d.id} onClick={() => toggleDeliverable(d.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 5, background: d.done ? 'rgba(100,200,130,0.05)' : 'rgba(200,194,187,0.03)', border: `0.5px solid ${d.done ? 'rgba(100,200,130,0.2)' : 'rgba(200,194,187,0.08)'}`, cursor: 'pointer' }}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${d.done ? 'rgba(100,200,130,0.6)' : 'rgba(200,194,187,0.2)'}`, background: d.done ? 'rgba(100,200,130,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {d.done && <span style={{ fontSize: 11, color: 'rgba(100,200,130,0.8)' }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 12, color: d.done ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: d.done ? 'line-through' : 'none' }}>{d.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input style={{ ...inp, flex: 1 }} value={newDeliverable} onChange={e => setNewDeliverable(e.target.value)} onKeyDown={e => e.key === 'Enter' && addDeliverable()} placeholder="Add deliverable..." />
                      <button onClick={addDeliverable} style={{ fontSize: 11, padding: '9px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* GENERAL NOTES */}
            {activeTab === 'notes' && (
              <div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>General notes</div>
                  <div style={{ padding: 18 }}>
                    <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.75, minHeight: 400, fontSize: 13 }} placeholder="Project notes, client feedback, shoot day observations..." />
                  </div>
                </div>
              </div>
            )}

            {/* EDITOR NOTES */}
            {activeTab === 'editor' && (
              <div>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Editor notes</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>Visible to editors only</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    <div style={{ background: 'rgba(100,150,220,0.07)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 5, padding: '10px 14px', marginBottom: 14, fontSize: 11, color: 'rgba(100,150,220,0.8)', lineHeight: 1.6 }}>
                      Include: colour grade references, music preferences, pacing notes, specific clip selections, client revision requests, export specs.
                    </div>
                    <textarea value={editorNotes} onChange={e => setEditorNotes(e.target.value)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.75, minHeight: 400, fontSize: 13 }} placeholder="e.g. Grade — warm, filmic. Music — something cinematic, no lyrics. Cut the wide establishing shot at 0:14. Client wants the kitchen featured prominently..." />
                  </div>
                </div>
              </div>
            )}

            {/* PROPERTY BRIEF */}
            {activeTab === 'brief' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Property research</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.address}</span>
                  </div>
                  <div style={{ padding: 18 }}>
                    {!brief && (
                      <button onClick={generateBrief} disabled={briefLoading} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 3, background: briefLoading ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: briefLoading ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', cursor: briefLoading ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                        {briefLoading ? '✦ Researching property...' : '✦ Generate property brief'}
                      </button>
                    )}
                    {brief && (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
                          {[
                            { label: 'Bedrooms', value: brief.property?.bedrooms },
                            { label: 'Bathrooms', value: brief.property?.bathrooms },
                            { label: 'Garage', value: brief.property?.garageSpaces },
                            { label: 'Floor size', value: brief.property?.floorSize },
                            { label: 'Land size', value: brief.property?.landSize },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ background: 'rgba(61,71,86,0.3)', borderRadius: 5, padding: '12px 14px', border: '0.5px solid rgba(200,194,187,0.09)' }}>
                              <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{value || '—'}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                          {[
                            { label: 'Rateable value', value: brief.property?.rateableValue },
                            { label: 'Last sale', value: brief.property?.lastSalePrice },
                            { label: 'Sale year', value: brief.property?.lastSaleDate },
                          ].map(({ label, value }) => (
                            <div key={label} style={{ background: 'rgba(61,71,86,0.2)', borderRadius: 5, padding: '10px 14px', border: '0.5px solid rgba(200,194,187,0.09)' }}>
                              <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 13, color: '#C8C2BB' }}>{value || '—'}</div>
                            </div>
                          ))}
                        </div>
                        {brief.property?.description && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, marginBottom: 16 }}>{brief.property.description}</div>}
                        {brief.mapboxImageUrl && (
                          <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 16, border: '0.5px solid rgba(200,194,187,0.09)' }}>
                            <img src={brief.mapboxImageUrl} alt="Satellite view" style={{ width: '100%', display: 'block' }} />
                          </div>
                        )}
                        {brief.weather && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'rgba(61,71,86,0.2)', borderRadius: 5, border: '0.5px solid rgba(200,194,187,0.09)' }}>
                            <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Shoot day weather</span>
                            <span style={{ fontSize: 12, color: '#C8C2BB' }}>{brief.weather.condition}</span>
                            <span style={{ fontSize: 12, color: '#C8C2BB' }}>{brief.weather.minTemp}°–{brief.weather.maxTemp}°C</span>
                            <span style={{ fontSize: 12, color: 'rgba(100,150,220,0.85)' }}>{brief.weather.rainChance}% rain</span>
                          </div>
                        )}
                        <button onClick={() => setBrief(null)} style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }}>↻ Regenerate</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ background: '#0F1216', borderLeft: '0.5px solid rgba(200,194,187,0.09)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)' }}>Project summary</div>

          {/* Progress */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Overall progress</span>
              <span style={{ fontSize: 11, color: '#C8C2BB' }}>{project.progress}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>Deliverables: {completedCount} / {project.deliverables.length}</div>
          </div>

          {/* Key dates */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Key dates</div>
            {[
              { label: 'Shoot', value: project.shootDate, icon: '📷' },
              { label: 'Draft due', value: project.draftDue, icon: '✏️' },
              { label: 'Delivery', value: project.deliveryDue, icon: '📦' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{icon} {label}</span>
                <span style={{ fontSize: 11, color: '#C8C2BB' }}>{value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Client info */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Client</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{project.client}</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 2 }}>{project.contact}</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{project.email}</div>
          </div>

          {/* Drive link */}
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Google Drive</div>
            {driveUrl ? (
              <a href={driveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'rgba(100,150,220,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📁</span> Open project folder →
              </a>
            ) : (
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)' }}>No folder linked yet</div>
            )}
          </div>

          {/* Stage mover */}
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Move to stage</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STAGES.map(stage => {
                const c = STAGE_COLORS[stage]
                const isCurrent = project.stage === stage
                return (
                  <button key={stage} onClick={() => setProject(p => ({ ...p, stage }))} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 4, border: `0.5px solid ${isCurrent ? c.color : 'rgba(200,194,187,0.09)'}`, background: isCurrent ? c.bg : 'transparent', color: isCurrent ? c.color : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isCurrent && <span style={{ fontSize: 10 }}>✓</span>}
                    {stage}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
