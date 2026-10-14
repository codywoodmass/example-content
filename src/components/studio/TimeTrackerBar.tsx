'use client'
import { elapsedLabel, ActiveTimer } from '@/lib/timeTracking'

type TrackableProject = { id: string; title: string; stage: string }

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
  // Scoped to active, confirmed work rather than literally just
  // "Post-Production" — restricting to one exact stage meant the picker was
  // disabled (and looked broken) whenever nothing happened to be in that
  // specific stage yet.
  const trackable = projects.filter(p => !['Enquiry', 'Completed'].includes(p.stage))
  const titleOf = (id: string) => projects.find(p => p.id === id)?.title || 'Project'
  const ready = !!person

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
      {mine ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 5, background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.25)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(100,200,130,0.9)', boxShadow: '0 0 6px rgba(100,200,130,0.7)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#C8C2BB', whiteSpace: 'nowrap' as const }}>{person || 'You'} tracking <strong style={{ fontWeight: 500 }}>{titleOf(mine.project_id)}</strong> · {elapsedLabel(mine.started_at, now)}</span>
          <button disabled={busy} onClick={onStop} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: 'none', background: '#C8C2BB', color: '#111', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Stop</button>
        </div>
      ) : (
        <select disabled={busy || !ready || trackable.length === 0} value="" onChange={e => { if (e.target.value) onStart(e.target.value) }} style={{ fontSize: 11, padding: '7px 10px', borderRadius: 5, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', color: 'rgba(200,194,187,0.6)', fontFamily: 'inherit', outline: 'none', cursor: !ready || trackable.length === 0 ? 'not-allowed' : 'pointer' }}>
          <option value="">{!ready ? 'Loading...' : trackable.length === 0 ? 'No active projects' : '▾ Start tracking...'}</option>
          {trackable.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      )}
      {others.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 5, background: 'rgba(100,150,220,0.06)', border: '0.5px solid rgba(100,150,220,0.2)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(100,150,220,0.8)', flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', whiteSpace: 'nowrap' as const }}>{t.person} tracking <strong style={{ fontWeight: 500, color: '#C8C2BB' }}>{titleOf(t.project_id)}</strong> · {elapsedLabel(t.started_at, now)}</span>
        </div>
      ))}
    </div>
  )
}
