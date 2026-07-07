'use client'
import StudioSidebar from '../StudioSidebar'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.toLocaleDateString('en-NZ', { weekday: 'long' })
  const date = d.getDate()
  const suffix = date === 1 || date === 21 || date === 31 ? 'st' : date === 2 || date === 22 ? 'nd' : date === 3 || date === 23 ? 'rd' : 'th'
  const month = d.toLocaleDateString('en-NZ', { month: 'long' })
  const year = d.getFullYear()
  return `${day} ${date}${suffix} ${month} ${year}`
}

const STAGES = ['Pre-Production', 'Shooting', 'Post-Production', 'Revisions', 'Awaiting Confirmation']

const STAGE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)', border: 'rgba(100,150,220,0.25)' },
  'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)', border: 'rgba(210,175,80,0.25)' },
  'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)', border: 'rgba(160,100,220,0.25)' },
  'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)', border: 'rgba(220,120,60,0.25)' },
  'Awaiting Confirmation': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)', border: 'rgba(100,200,130,0.25)' },
}

type Project = {
  id: string
  title: string
  client: string
  contact: string
  email: string
  category: string
  address: string
  stage: string
  shoot_date: string
  draft_due: string
  delivery_due: string
  drive_url: string
  progress: number
  from_booking: boolean
  general_notes: string
  editor_notes: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showNewModal, setShowNewModal] = useState(false)
  const [filterCat, setFilterCat] = useState('All')
  const [dragId, setDragId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const [modalProject, setModalProject] = useState<Project | null>(null)
  const [modalEditing, setModalEditing] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalSaved, setModalSaved] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [groupByStage, setGroupByStage] = useState(false)
  const [saving, setSaving] = useState(false)

  const [newForm, setNewForm] = useState({
    title: '', client: '', contact: '', email: '',
    category: 'Property', stage: 'Pre-Production',
    shoot_date: '', draft_due: '', delivery_due: '', address: ''
  })

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    const { data, error } = await supabase.from('projects1').select('*').order('created_at', { ascending: false })
    if (!error && data) {
      setProjects(data)
      const openId = searchParams.get('open')
      if (openId) {
        const proj = data.find((p: Project) => p.id === openId)
        if (proj) { setModalProject(proj); setModalEditing(false) }
      }
    }
    setLoading(false)
  }

  async function moveProject(id: string, stage: string) {
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, stage } : proj))
    await supabase.from('projects1').update({ stage }).eq('id', id)
  }

  const STAGE_PROGRESS: Record<string, number> = {
    'Pre-Production': 10,
    'Shooting': 35,
    'Post-Production': 65,
    'Revisions': 85,
    'Awaiting Confirmation': 100,
  }

  async function saveModalProject() {
    if (!modalProject) return
    setModalSaving(true)
    const { error } = await supabase.from('projects1').update({
      title: modalProject.title,
      client: modalProject.client,
      email: modalProject.email,
      category: modalProject.category,
      address: modalProject.address,
      stage: modalProject.stage,
      shoot_date: modalProject.shoot_date || null,
      draft_due: modalProject.draft_due || null,
      delivery_due: modalProject.delivery_due || null,
      drive_url: modalProject.drive_url,
      progress: modalProject.progress,
    }).eq('id', modalProject.id)
    if (!error) {
      setProjects(p => p.map(proj => proj.id === modalProject.id ? { ...proj, ...modalProject } : proj))
      setModalSaved(true)
      setModalEditing(false)
      setTimeout(() => setModalSaved(false), 2000)
    }
    setModalSaving(false)
  }

  async function archiveProject(id: string, archived: boolean) {
    await supabase.from('projects1').update({ archived }).eq('id', id)
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, archived } : proj))
    setModalProject(null)
  }

  async function archiveProject(id: string, archived: boolean) {
    await supabase.from('projects1').update({ archived }).eq('id', id)
    setProjects(p => p.map(proj => proj.id === id ? { ...proj, archived } : proj))
    setModalProject(null)
  }

  async function addProject() {
    if (!newForm.title || !newForm.client) return
    setSaving(true)
    const { data, error } = await supabase.from('projects1').insert([{
      ...newForm,
      progress: 0,
      from_booking: false,
      general_notes: '',
      editor_notes: '',
    }]).select().single()
    if (error) {
      console.error('Insert error:', error)
      alert('Error saving: ' + error.message)
    }
    if (!error && data) {
      setProjects(p => [data, ...p])
      setShowNewModal(false)
      setNewForm({ title: '', client: '', contact: '', email: '', category: 'Property', stage: 'Pre-Production', shoot_date: '', draft_due: '', delivery_due: '', address: '' })
      router.push(`/portal/studio/projects/${data.id}`)
    }
    setSaving(false)
  }

  const filtered = projects.filter(p => {
    const matchesCat = filterCat === 'All' || p.category === filterCat
    const matchesArchived = showArchived ? p.archived === true : !p.archived
    return matchesCat && matchesArchived
  }).sort((a, b) => {
    if (sortBy === 'shoot_date') return (a.shoot_date || '9999') < (b.shoot_date || '9999') ? -1 : 1
    if (sortBy === 'delivery_due') return (a.delivery_due || '9999') < (b.delivery_due || '9999') ? -1 : 1
    if (sortBy === 'client') return (a.client || '').localeCompare(b.client || '')
    if (sortBy === 'progress') return b.progress - a.progress
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  function StagePill({ stage }: { stage: string }) {
    const c = STAGE_COLORS[stage] || { color: '#C8C2BB', bg: 'rgba(200,194,187,0.1)', border: 'rgba(200,194,187,0.2)' }
    return <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: c.bg, color: c.color, border: `0.5px solid ${c.border}`, whiteSpace: 'nowrap' }}>{stage}</span>
  }

  function ProjectCard({ project }: { project: Project }) {
    return (
      <div
        draggable
        onDragStart={() => setDragId(project.id)}
        onDragEnd={() => { setDragId(null); setDragOverStage(null) }}
        onClick={() => { if (!dragId) { setModalProject(project); setModalEditing(false) } }}
        style={{ background: '#1A1F28', border: `0.5px solid ${dragId === project.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '14px 16px', cursor: 'pointer', opacity: dragId === project.id ? 0.5 : 1, transition: 'all 0.15s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{project.title}</div>
          {project.from_booking && <span style={{ fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 6px', background: 'rgba(100,150,220,0.15)', color: 'rgba(100,150,220,0.8)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 2, flexShrink: 0 }}>Booking</span>}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>{project.client}</div>
        <div style={{ height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)' }}>{project.shoot_date ? formatDate(project.shoot_date) : 'No shoot date'}</span>
          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.4)', border: '0.5px solid rgba(200,194,187,0.1)' }}>{project.category}</span>
        </div>
      </div>
    )
  }
  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading projects...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <StudioSidebar active="projects" />
      <div style={{ flex: 1, overflowX: 'hidden' }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Projects</div>
          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{projects.length} projects · {projects.filter(p => p.stage === 'Awaiting Confirmation').length} invoicing</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 12px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
              {['All', 'Property', 'Commercial', 'Events', 'Socials'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <button onClick={() => setShowArchived(!showArchived)} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${showArchived ? 'rgba(210,175,80,0.4)' : 'rgba(200,194,187,0.15)'}`, background: showArchived ? 'rgba(210,175,80,0.08)' : 'transparent', color: showArchived ? 'rgba(210,175,80,0.9)' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>📦 Archived</button>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '6px 12px', fontSize: 11, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
            <option value="created_at">Sort: Recent</option>
            <option value="shoot_date">Sort: Shoot date</option>
            <option value="delivery_due">Sort: Delivery date</option>
            <option value="client">Sort: Client</option>
            <option value="title">Sort: Project name</option>
            <option value="progress">Sort: Progress</option>
          </select>
          {viewMode === 'list' && (
            <button onClick={() => setGroupByStage(!groupByStage)} style={{ fontSize: 11, padding: '6px 12px', borderRadius: 4, border: `0.5px solid ${groupByStage ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: groupByStage ? 'rgba(200,194,187,0.08)' : 'transparent', color: groupByStage ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>Group by stage</button>
          )}
          <div style={{ display: 'flex', background: 'rgba(200,194,187,0.06)', borderRadius: 4, padding: 2 }}>
            {(['kanban', 'list'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 3, background: viewMode === mode ? 'rgba(200,194,187,0.12)' : 'transparent', color: viewMode === mode ? '#C8C2BB' : 'rgba(200,194,187,0.35)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{mode === 'kanban' ? '⬛ Kanban' : '☰ List'}</button>
            ))}
          </div>
          <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New project</button>
        </div>
      </div>

      {/* KANBAN */}
      {viewMode === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', height: 'calc(100vh - 57px)', overflow: 'auto' }}>
          {STAGES.map(stage => {
            const stageProjects = filtered.filter(p => p.stage === stage)
            const c = STAGE_COLORS[stage]
            const isOver = dragOverStage === stage
            return (
              <div key={stage} onDragOver={e => { e.preventDefault(); setDragOverStage(stage) }} onDrop={() => { if (dragId) { moveProject(dragId, stage); setDragId(null); setDragOverStage(null) } }} style={{ borderRight: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', flexDirection: 'column', background: isOver ? 'rgba(200,194,187,0.03)' : 'transparent', transition: 'background 0.15s', height: '100%' }}>
                <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB' }}>{stage}</span>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', background: 'rgba(200,194,187,0.07)', padding: '2px 7px', borderRadius: 10 }}>{stageProjects.length}</span>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
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

      {/* LIST */}
      {viewMode === 'list' && (
        <div style={{ padding: 28 }}>
          {groupByStage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(stage => {
                const stageProjects = filtered.filter(p => p.stage === stage)
                if (stageProjects.length === 0) return null
                const sc = STAGE_COLORS[stage] || { color: '#C8C2BB', border: 'rgba(200,194,187,0.2)' }
                return (
                  <div key={stage}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.color }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: sc.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stage}</span>
                      <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>— {stageProjects.length} project{stageProjects.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ background: '#1A1F28', border: `0.5px solid ${sc.color}33`, borderRadius: 7, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          {stageProjects.map((project, i) => (
                            <tr key={project.id} onClick={() => { setModalProject(project); setModalEditing(false) }} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{project.title}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}>{project.client}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.shoot_date)}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.delivery_due)}</td>
                              <td style={{ padding: '11px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 80, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                                    <div style={{ height: '100%', width: `${project.progress}%`, background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                                  </div>
                                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.progress}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Project', 'Client', 'Category', 'Stage', 'Shoot date', 'Draft due', 'Delivery', 'Progress'].map(h => (
                  <th key={h} style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', padding: '10px 16px', textAlign: 'left', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontWeight: 400 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filtered.map((project, i) => (
                  <tr key={project.id} onClick={() => { setModalProject(project); setModalEditing(false) }} style={{ cursor: 'pointer', background: i % 2 === 0 ? 'transparent' : 'rgba(200,194,187,0.02)' }}>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{project.title}</div>
                      {project.from_booking && <span style={{ fontSize: 9, color: 'rgba(100,150,220,0.7)' }}>From booking</span>}
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}>{project.client}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}><span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 2, background: 'rgba(200,194,187,0.08)', color: 'rgba(200,194,187,0.5)', border: '0.5px solid rgba(200,194,187,0.1)' }}>{project.category}</span></td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}><StagePill stage={project.stage} /></td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.shoot_date)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.draft_due)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)', fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{formatDate(project.delivery_due)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${project.progress}%`, background: project.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{project.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No projects yet — create one above</td></tr>
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 500, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>New project</div>
            {/* Category toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['Property', 'Commercial', 'Events', 'Socials'].map(cat => (
                <button key={cat} onClick={() => setNewForm(f => ({ ...f, category: cat, title: cat === 'Property' ? f.address || '' : f.title }))} style={{ fontSize: 11, padding: '7px 14px', borderRadius: 3, border: `0.5px solid ${newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newForm.category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              {newForm.category === 'Property' ? (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Property address (used as project name)</label>
                  <input style={inp} value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value, title: e.target.value }))} placeholder="e.g. 14 Clifton Rd, Havelock North" />
                </div>
              ) : (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Project name</label>
                  <input style={inp} value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Black Barn Brand Film 2026" />
                </div>
              )}
              <div><label style={lbl}>Client</label><input style={inp} value={newForm.client} onChange={e => setNewForm(f => ({ ...f, client: e.target.value }))} placeholder="e.g. Blackwell Properties" /></div>
              <div><label style={lbl}>Contact person</label><input style={inp} value={newForm.contact} onChange={e => setNewForm(f => ({ ...f, contact: e.target.value }))} placeholder="e.g. James Blackwell" /></div>
              <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Email</label><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="client@email.com" /></div>
              {newForm.category !== 'Property' && (
                <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Shoot location</label><input style={inp} value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Auckland CBD, client studio, outdoor location..." /></div>
              )}
              <div><label style={lbl}>Starting stage</label>
                <select style={inp} value={newForm.stage} onChange={e => setNewForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Shoot date</label><input style={inp} type="date" value={newForm.shoot_date} onChange={e => setNewForm(f => ({ ...f, shoot_date: e.target.value }))} /></div>
              <div><label style={lbl}>Draft due</label><input style={inp} type="date" value={newForm.draft_due} onChange={e => setNewForm(f => ({ ...f, draft_due: e.target.value }))} /></div>
              <div><label style={lbl}>Delivery date</label><input style={inp} type="date" value={newForm.delivery_due} onChange={e => setNewForm(f => ({ ...f, delivery_due: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addProject} disabled={saving || !newForm.title || !newForm.client} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: saving || !newForm.title || !newForm.client ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: saving || !newForm.title || !newForm.client ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: saving || !newForm.title || !newForm.client ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{saving ? 'Saving...' : 'Create project'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT MODAL */}
      {modalProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={async e => { if (e.target === e.currentTarget) { await saveModalProject(); setModalProject(null); setModalEditing(false) } }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', position: 'sticky', top: 0, background: '#1A1F28', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{modalProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{modalProject.client} · {modalProject.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!modalEditing ? (
                  <>
                    <button onClick={() => setModalEditing(true)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Edit</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModalEditing(false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveModalProject} disabled={modalSaving} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: modalSaved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: modalSaved ? 'rgba(100,200,130,0.9)' : '#111', border: modalSaved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{modalSaving ? 'Saving...' : modalSaved ? '✓ Saved' : 'Save'}</button>
                  </>
                )}
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(160,100,220,0.9)','Revisions':'rgba(220,120,60,0.9)','Awaiting Confirmation':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].indexOf(modalProject.stage)
                    const isDone = idx < stageIdx; const isCurrent = idx === stageIdx
                    return (
                      <div key={stage} onClick={() => setModalProject(p => p ? { ...p, stage, progress: STAGE_PROGRESS[stage] } : p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? 'rgba(100,200,130,0.15)' : isCurrent ? 'rgba(200,194,187,0.08)' : 'transparent', border: `1.5px solid ${isDone ? 'rgba(100,200,130,0.5)' : isCurrent ? SC[stage] : 'rgba(200,194,187,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: isDone ? 'rgba(100,200,130,0.8)' : isCurrent ? SC[stage] : 'rgba(200,194,187,0.2)' }}>{isDone ? '✓' : idx+1}</div>
                        <span style={{ fontSize: 9, color: isCurrent ? '#C8C2BB' : 'rgba(200,194,187,0.3)', textAlign: 'center', lineHeight: 1.3 }}>{stage}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{modalProject.progress}%</span>
                </div>
                <input type="range" min="0" max="100" value={modalProject.progress} onChange={e => {
                  const val = parseInt(e.target.value)
                  const stage = val >= 100 ? 'Awaiting Confirmation' : val >= 85 ? 'Revisions' : val >= 65 ? 'Post-Production' : val >= 35 ? 'Shooting' : 'Pre-Production'
                  setModalProject(p => p ? { ...p, progress: val, stage } : p)
                }} style={{ width: '100%', accentColor: '#C8C2BB', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Client', key: 'client' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: modalProject.category === 'Property' ? 'Property address' : 'Shoot location', key: 'address' as const },
                ].map(({ label, key }) => (
                  <div key={key} style={{ gridColumn: key === 'address' ? 'span 2' : 'span 1' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input value={modalProject[key] || ''} onChange={e => setModalProject(p => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] || '—'}</div>}
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Stage</div>
                  {modalEditing ? (
                    <select value={modalProject.stage} onChange={e => setModalProject(p => p ? { ...p, stage: e.target.value, progress: STAGE_PROGRESS[e.target.value] } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.stage}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[{ label: 'Shoot date', key: 'shoot_date' as const }, { label: 'Draft due', key: 'draft_due' as const }, { label: 'Delivery date', key: 'delivery_due' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input type="date" value={modalProject[key] || ''} onChange={e => setModalProject(p => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] ? new Date(modalProject[key]).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>}
                  </div>
                ))}
              </div>
              {modalProject.deliverables && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Packages & deliverables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modalProject.deliverables.split('\n').filter(Boolean).map((d: string, i: number) => {
                      const isPackage = d.startsWith('PACKAGE: ')
                      const isDeliverables = d.startsWith('DELIVERABLES: ')
                      const isAddons = d.startsWith('ADD-ONS: ')
                      const label = isPackage ? 'Shoot package' : isDeliverables ? 'Deliverables' : isAddons ? 'Add-ons' : null
                      const value = d.replace(/^(PACKAGE|DELIVERABLES|ADD-ONS): /, '')
                      if (label) return (
                        <div key={i}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 5 }}>{label}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {value.split(',').map((v: string, j: number) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                                <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', flexShrink: 0 }}>✓</span>
                                <span style={{ fontSize: 12, color: '#C8C2BB' }}>{v.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                          <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 12, color: '#C8C2BB' }}>{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Google Drive</div>
                {modalEditing ? <input value={modalProject.drive_url || ''} onChange={e => setModalProject(p => p ? { ...p, drive_url: e.target.value } : p)} placeholder="https://drive.google.com/drive/folders/..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : modalProject.drive_url ? <a href={modalProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>📁 Open project folder →</a> : <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.25)' }}>No folder linked</div>}
              </div>
              {(modalProject.general_notes || modalProject.editor_notes) && (
                <div style={{ marginBottom: 20 }}>
                  {modalProject.general_notes && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(200,194,187,0.04)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(200,194,187,0.08)' }}>{modalProject.general_notes}</div>
                    </div>
                  )}
                  {modalProject.editor_notes && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Editor notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(100,150,220,0.05)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(100,150,220,0.15)' }}>{modalProject.editor_notes}</div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                {modalProject.stage === 'Awaiting Confirmation' && !modalProject.archived && (
                  <button onClick={() => archiveProject(modalProject.id, true)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,175,80,0.3)', color: 'rgba(210,175,80,0.8)', background: 'rgba(210,175,80,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>📦 Archive project</button>
                )}
                {modalProject.archived && (
                  <button onClick={() => archiveProject(modalProject.id, false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.3)', color: 'rgba(100,200,130,0.8)', background: 'rgba(100,200,130,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>↩ Unarchive</button>
                )}
                {!modalProject.archived && modalProject.stage !== 'Awaiting Confirmation' && <div />}
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false); router.push('/portal/studio/projects') }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>← Back to projects</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT MODAL */}
      {modalProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={async e => { if (e.target === e.currentTarget) { await saveModalProject(); setModalProject(null); setModalEditing(false) } }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', position: 'sticky', top: 0, background: '#1A1F28', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{modalProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{modalProject.client} · {modalProject.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {!modalEditing ? (
                  <>
                    <button onClick={() => setModalEditing(true)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Edit</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setModalEditing(false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                    <button onClick={saveModalProject} disabled={modalSaving} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: modalSaved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: modalSaved ? 'rgba(100,200,130,0.9)' : '#111', border: modalSaved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{modalSaving ? 'Saving...' : modalSaved ? '✓ Saved' : 'Save'}</button>
                  </>
                )}
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map((stage, idx) => {
                    const SC: Record<string,string> = {'Pre-Production':'rgba(100,150,220,0.9)','Shooting':'rgba(210,175,80,0.9)','Post-Production':'rgba(160,100,220,0.9)','Revisions':'rgba(220,120,60,0.9)','Awaiting Confirmation':'rgba(100,200,130,0.9)'}
                    const stageIdx = ['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].indexOf(modalProject.stage)
                    const isDone = idx < stageIdx; const isCurrent = idx === stageIdx
                    return (
                      <div key={stage} onClick={() => setModalProject(p => p ? { ...p, stage, progress: STAGE_PROGRESS[stage] } : p)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: isDone ? 'rgba(100,200,130,0.15)' : isCurrent ? 'rgba(200,194,187,0.08)' : 'transparent', border: `1.5px solid ${isDone ? 'rgba(100,200,130,0.5)' : isCurrent ? SC[stage] : 'rgba(200,194,187,0.15)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: isDone ? 'rgba(100,200,130,0.8)' : isCurrent ? SC[stage] : 'rgba(200,194,187,0.2)' }}>{isDone ? '✓' : idx+1}</div>
                        <span style={{ fontSize: 9, color: isCurrent ? '#C8C2BB' : 'rgba(200,194,187,0.3)', textAlign: 'center', lineHeight: 1.3 }}>{stage}</span>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{modalProject.progress}%</span>
                </div>
                <input type="range" min="0" max="100" value={modalProject.progress} onChange={e => {
                  const val = parseInt(e.target.value)
                  const stage = val >= 100 ? 'Awaiting Confirmation' : val >= 85 ? 'Revisions' : val >= 65 ? 'Post-Production' : val >= 35 ? 'Shooting' : 'Pre-Production'
                  setModalProject(p => p ? { ...p, progress: val, stage } : p)
                }} style={{ width: '100%', accentColor: '#C8C2BB', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Client', key: 'client' as const },
                  { label: 'Email', key: 'email' as const },
                  { label: modalProject.category === 'Property' ? 'Property address' : 'Shoot location', key: 'address' as const },
                ].map(({ label, key }) => (
                  <div key={key} style={{ gridColumn: key === 'address' ? 'span 2' : 'span 1' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input value={modalProject[key] || ''} onChange={e => setModalProject(p => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] || '—'}</div>}
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Stage</div>
                  {modalEditing ? (
                    <select value={modalProject.stage} onChange={e => setModalProject(p => p ? { ...p, stage: e.target.value, progress: STAGE_PROGRESS[e.target.value] } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }}>
                      {['Pre-Production','Shooting','Post-Production','Revisions','Awaiting Confirmation'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  ) : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject.stage}</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[{ label: 'Shoot date', key: 'shoot_date' as const }, { label: 'Draft due', key: 'draft_due' as const }, { label: 'Delivery date', key: 'delivery_due' as const }].map(({ label, key }) => (
                  <div key={key}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>{label}</div>
                    {modalEditing ? <input type="date" value={modalProject[key] || ''} onChange={e => setModalProject(p => p ? { ...p, [key]: e.target.value } : p)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : <div style={{ fontSize: 13, color: '#C8C2BB' }}>{modalProject[key] ? new Date(modalProject[key]).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : '—'}</div>}
                  </div>
                ))}
              </div>
              {modalProject.deliverables && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Packages & deliverables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {modalProject.deliverables.split('\n').filter(Boolean).map((d: string, i: number) => {
                      const isPackage = d.startsWith('PACKAGE: ')
                      const isDeliverables = d.startsWith('DELIVERABLES: ')
                      const isAddons = d.startsWith('ADD-ONS: ')
                      const label = isPackage ? 'Shoot package' : isDeliverables ? 'Deliverables' : isAddons ? 'Add-ons' : null
                      const value = d.replace(/^(PACKAGE|DELIVERABLES|ADD-ONS): /, '')
                      if (label) return (
                        <div key={i}>
                          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 5 }}>{label}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {value.split(',').map((v: string, j: number) => (
                              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                                <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', flexShrink: 0 }}>✓</span>
                                <span style={{ fontSize: 12, color: '#C8C2BB' }}>{v.trim()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                          <span style={{ fontSize: 10, color: 'rgba(100,200,130,0.7)', flexShrink: 0 }}>✓</span>
                          <span style={{ fontSize: 12, color: '#C8C2BB' }}>{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Google Drive</div>
                {modalEditing ? <input value={modalProject.drive_url || ''} onChange={e => setModalProject(p => p ? { ...p, drive_url: e.target.value } : p)} placeholder="https://drive.google.com/drive/folders/..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} /> : modalProject.drive_url ? <a href={modalProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>📁 Open project folder →</a> : <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.25)' }}>No folder linked</div>}
              </div>
              {(modalProject.general_notes || modalProject.editor_notes) && (
                <div style={{ marginBottom: 20 }}>
                  {modalProject.general_notes && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(200,194,187,0.04)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(200,194,187,0.08)' }}>{modalProject.general_notes}</div>
                    </div>
                  )}
                  {modalProject.editor_notes && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Editor notes</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, background: 'rgba(100,150,220,0.05)', borderRadius: 4, padding: '10px 12px', border: '0.5px solid rgba(100,150,220,0.15)' }}>{modalProject.editor_notes}</div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                {modalProject.stage === 'Awaiting Confirmation' && !modalProject.archived && (
                  <button onClick={() => archiveProject(modalProject.id, true)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,175,80,0.3)', color: 'rgba(210,175,80,0.8)', background: 'rgba(210,175,80,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>📦 Archive project</button>
                )}
                {modalProject.archived && (
                  <button onClick={() => archiveProject(modalProject.id, false)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.3)', color: 'rgba(100,200,130,0.8)', background: 'rgba(100,200,130,0.06)', cursor: 'pointer', fontFamily: 'inherit' }}>↩ Unarchive</button>
                )}
                {!modalProject.archived && modalProject.stage !== 'Awaiting Confirmation' && <div />}
                <button onClick={async () => { await saveModalProject(); setModalProject(null); setModalEditing(false); router.push('/portal/studio/projects') }} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>← Back to projects</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  )
}
