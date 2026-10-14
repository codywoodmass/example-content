'use client'
import { useEffect, useRef, useState } from 'react'
import { elapsedLabel, ActiveTimer } from '@/lib/timeTracking'

type TrackableProject = { id: string; title: string; stage: string; archived?: boolean }

const ACTIVE_STAGES = ['Post-Production']

export default function TimeTrackerBar({
  projects, person, mine, others, now, busy, onStart, onStop,
}: {
  projects: TrackableProject[]
  person: string
  mine: ActiveTimer | null
  others: ActiveTimer[]
  now: number
  busy: boolean
  onStart: (projectId: string) => void
  onStop: () => void
}) {
  const trackable = projects.filter(p => ACTIVE_STAGES.includes(p.stage) && !p.archived)
  const titleOf = (id: string) => projects.find(p => p.id === id)?.title || 'Project'
  const ready = !!person

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const matches = trackable.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))

  function pick(projectId: string) {
    onStart(projectId)
    setOpen(false)
    setQuery('')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
      {mine ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 5, background: 'rgba(210,90,90,0.08)', border: '0.5px solid rgba(210,90,90,0.25)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,90,90,0.9)', boxShadow: '0 0 6px rgba(210,90,90,0.7)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#C8C2BB', whiteSpace: 'nowrap' as const }}>{person || 'You'} tracking <strong style={{ fontWeight: 500 }}>{titleOf(mine.project_id)}</strong> · {elapsedLabel(mine.started_at, now)}</span>
          <button disabled={busy} onClick={onStop} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: 'none', background: '#C8C2BB', color: '#111', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Stop</button>
        </div>
      ) : (
        <div ref={wrapRef} style={{ position: 'relative' }}>
          <button
            disabled={busy || !ready || trackable.length === 0}
            onClick={() => setOpen(o => !o)}
            style={{ fontSize: 11, padding: '7px 10px', borderRadius: 5, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', fontFamily: 'inherit', outline: 'none', cursor: !ready || trackable.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            {!ready ? 'Loading...' : trackable.length === 0 ? 'No post-production projects' : `▾ Start tracking (${trackable.length})`}
          </button>
          {open && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 320, maxHeight: 360, display: 'flex', flexDirection: 'column', background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50, overflow: 'hidden' }}>
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search projects..."
                style={{ fontSize: 12, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(200,194,187,0.1)', color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}
              />
              <div style={{ overflowY: 'auto' }}>
                {matches.length === 0 ? (
                  <div style={{ padding: '14px 12px', fontSize: 12, color: 'rgba(200,194,187,0.3)' }}>No matching projects</div>
                ) : matches.map(p => (
                  <div key={p.id} onClick={() => pick(p.id)} style={{ padding: '9px 12px', fontSize: 12, color: '#C8C2BB', cursor: 'pointer', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {p.title} <span style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginLeft: 6 }}>{p.stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {others.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 5, background: 'rgba(210,90,90,0.06)', border: '0.5px solid rgba(210,90,90,0.2)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,90,90,0.8)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', whiteSpace: 'nowrap' as const }}>{t.person} tracking <strong style={{ fontWeight: 500, color: '#C8C2BB' }}>{titleOf(t.project_id)}</strong> · {elapsedLabel(t.started_at, now)}</span>
        </div>
      ))}
    </div>
  )
}
