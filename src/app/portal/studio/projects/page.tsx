'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAGES = ['Pre-Production', 'Shooting', 'Post-Production', 'Revisions', 'Invoicing']

const STAGE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)', border: 'rgba(100,150,220,0.25)' },
  'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)', border: 'rgba(210,175,80,0.25)' },
  'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)', border: 'rgba(160,100,220,0.25)' },
  'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)', border: 'rgba(220,120,60,0.25)' },
  'Invoicing': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)', border: 'rgba(100,200,130,0.25)' },
}

const SAMPLE_PROJECTS = [
  { id: '1', title: '14 Clifton Rd', client: 'Blackwell Properties', category: 'Property', stage: 'Post-Production', shootDate: '14 Jun 2026', draftDue: '21 Jun 2026', deliveryDue: '28 Jun 2026', driveUrl: '', progress: 75, fromBooking: true },
  { id: '2', title: 'Orchard Lane Development', client: 'Blackwell Properties', category: 'Property', stage: 'Shooting', shootDate: '28 Jun 2026', draftDue: '5 Jul 2026', deliveryDue: '12 Jul 2026', driveUrl: '', progress: 30, fromBooking: true },
  { id: '3', title: 'Black Barn — Brand Film', client: 'Black Barn Retreats', category: 'Commercial', stage: 'Pre-Production', shootDate: '19 Jun 2026', draftDue: '3 Jul 2026', deliveryDue: '17 Jul 2026', driveUrl: '', progress: 15, fromBooking: false },
  { id: '4', title: 'Elephant Hill — Harvest Film', client: 'Elephant Hill Winery', category: 'Commercial', stage: 'Revisions', shootDate: '2 Jun 2026', draftDue: '16 Jun 2026', deliveryDue: '23 Jun 2026', driveUrl: '', progress: 90, fromBooking: false },
  { id: '5', title: 'Mission Heights', client: "Bayleys Hawke's Bay", category: 'Property', stage: 'Pre-Production', shootDate: '17 Jun 2026', draftDue: '24 Jun 2026', deliveryDue: '1 Jul 2026', driveUrl: '', progress: 5, fromBooking: true },
  { id: '6', title: 'Studio Forma Portfolio', client: 'Studio Forma', category: 'Architectural', stage: 'Invoicing', shootDate: '28 May 2026', draftDue: '11 Jun 2026', deliveryDue: '18 Jun 2026', driveUrl: '', progress: 100, fromBooking: false },
]

export default function ProjectsPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [projects, setProjects] = useState(SAMPLE_PROJECTS)
  const [showNewModal, setShowNewModal] = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const [newForm, setNewForm] = useState({ title: '', client: '', category: 'Property', stage: 'Pre-Production', shootDate: '', draftDue: '', deliveryDue: '' })

  const filtered = filterCat === 'All' ? projects : projects.filter(p => p.category === filterCat)

  function moveProject(id: string, stage: string) {
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, stage } : proj))
  }

  function addProject() {
    if (!newForm.title || !newForm.client) return
    const newProj = { ...newForm, id: Date.now().toString(), driveUrl: '', progress: 0, fromBooking: false }
    setProjects(p => [...p, newProj])
    setShowNewModal(false)
    setNewForm({ title: '', client: '', category: 'Property', stage: 'Pre-Production', shootDate: '', draftDue: '', deliveryDue: '' })
  }

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  function StagePill({ stage }: { stage: string }) {
    const c = STAGE_COLORS[stage] || { color: '#C8C2BB', bg: 'rgba(200,194,187,0.1)', border: 'rgba(200,194,187,0.2)' }
    return <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, whiteSpace: 'nowrap' }}>{stage}</span>
  }

  function ProjectCard({ project }: { project: typeof SAMPLE_PROJECTS[0] }) {
    return (
      <div
        draggable
        onDragStart={() => setDragId(project.id)}
        onDragEnd={() => { setDragId(null); setDragOverStage(null) }}
        onClick={() => router.push(`/portal/studio/projects/${project.id}`)}
        style={{ background: '#1A1F28', border: `0.5px solid ${dragId === project.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '14px 16px', cursor: 'pointer', opacity: dragId === project.id ? 0.5 : 1, transition: 'all 0.15s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{project.title}</div>
          {project.fromBooking && <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(100,150,220,0.15)', color: 'rgba(100,150,220,0.8)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 2, flexShrink: 0 }}>Booking</span>}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>{project.client}</div>
        <div style={{ height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)' }}>Shoot: {project.shootDate}</span>
          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.4)', border: '0.5px solid rgba(200,194,187,0.1)' }}>{project.category}</span>
        </div>
      </div>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13 }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Projects</div>
          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{projects.length} active · {projects.filter(p => p.stage === 'Invoicing').length} invoicing</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Property', 'Commercial', 'Architectural'].map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 3, border: `0.5px solid ${filterCat === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: filterCat === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: filterCat === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
            ))}
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(200,194,187,0.06)', borderRadius: 4, padding: 2 }}>
            {(['kanban', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 3, background: viewMode === mode ? 'rgba(200,194,187,0.12)' : 'transparent', color: viewMode === mode ? '#C8C2BB' : 'rgba(200,194,187,0.35)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.06em' }}>{mode === 'kanban' ? '⬛ Kanban' : '☰ List'}</button>
            ))}
          </div>
          <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, height: 'calc(100vh - 57px)', overflow: 'hidden' }}>
          {STAGES.map(stage => {
            const stageProjects = filtered.filter(p => p.stage === stage)
            const c = STAGE_COLORS[stage]
            const isOver = dragOverStage === stage
            return (
              <div
                key={stage}
                onDragOver={e => { e.preventDefault(); setDragOverStage(stage) }}
                onDrop={() => { if (dragId) { moveProject(dragId, stage); setDragId(null); setDragOverStage(null) } }}
                style={{ borderRight: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', flexDirection: 'column', background: isOver ? 'rgba(200,194,187,0.03)' : 'transparent', transition: 'background 0.15s', height: '100%' }}
              >
                {/* Column header */}
                <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB', letterSpacing: '0.04em' }}>{stage}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', background: 'rgba(200,194,187,0.07)', padding: '2px 7px', borderRadius: 10 }}>{stageProjects.length}</span>
                  </div>
                </div>
                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stageProjects.map(project => <ProjectCard key={project.id} project={project} />)}
                  {stageProjects.length === 0 && (
                    <div style={{ border: '0.5px dashed rgba(200,194,187,0.1)', borderRadius: 6, padding: '24px 16px', textAlign: 'center', color: 'rgba(200,194,187,0.2)', fontSize: 12 }}>Drop here</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ padding: 28 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Project', 'Client', 'Category', 'Stage', 'Shoot date', 'Draft due', 'Delivery', 'Progress'].map(h => (
                    <th key={h} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', padding: '10px 16px', textAlign: 'left', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, i) => (
                  <tr key={project.id} onClick={() => router.push(`/portal/studio/projects/${project.id}`)} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{project.title}</div>
                      {project.fromBooking && <span style={{ fontSize: 9, color: 'rgba(100,150,220,0.7)' }}>From booking</span>}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}>{project.client}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.5)', border: '0.5px solid rgba(200,194,187,0.1)' }}>{project.category}</span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}><StagePill stage={project.stage} /></td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{project.shootDate || '—'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{project.draftDue || '—'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{project.deliveryDue || '—'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', minWidth: 30 }}>{project.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>New project</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Project / property name</label><input style={inp} value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. 14 Clifton Rd" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Client</label><input style={inp} value={newForm.client} onChange={e => setNewForm(f => ({ ...f, client: e.target.value }))} placeholder="e.g. Blackwell Properties" /></div>
              <div><label style={lbl}>Category</label>
                <select style={inp} value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))}>
                  <option>Property</option><option>Commercial</option><option>Architectural</option><option>Events</option><option>Social Content</option>
                </select>
              </div>
              <div><label style={lbl}>Starting stage</label>
                <select style={inp} value={newForm.stage} onChange={e => setNewForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Shoot date</label><input style={inp} type="date" value={newForm.shootDate} onChange={e => setNewForm(f => ({ ...f, shootDate: e.target.value }))} /></div>
              <div><label style={lbl}>Draft due</label><input style={inp} type="date" value={newForm.draftDue} onChange={e => setNewForm(f => ({ ...f, draftDue: e.target.value }))} /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Delivery date</label><input style={inp} type="date" value={newForm.deliveryDue} onChange={e => setNewForm(f => ({ ...f, deliveryDue: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addProject} disabled={!newForm.title || !newForm.client} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: newForm.title && newForm.client ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: newForm.title && newForm.client ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: newForm.title && newForm.client ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Create project</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
