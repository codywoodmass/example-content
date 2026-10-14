import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type ActiveTimer = { id: string; project_id: string; person: string; phase: string; started_at: string }

export async function getCurrentPerson(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return ''
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
  return profile?.full_name || session.user.email || ''
}

export async function startTimer(person: string, projectId: string, phase: string = 'Editing') {
  const { data: existing } = await supabase.from('active_timers').select('*').eq('person', person).maybeSingle()
  if (existing) await stopTimer(existing)
  await supabase.from('active_timers').upsert([{ person, project_id: projectId, phase, started_at: new Date().toISOString() }], { onConflict: 'person' })
}

// The elapsed duration is always computed from the DB-stored started_at to now,
// never from client-side state — so time is recorded correctly even if the
// browser was closed and reopened while the timer kept running.
export async function stopTimer(timer: ActiveTimer) {
  const startedMs = new Date(timer.started_at).getTime()
  const hours = Math.max(0.01, Math.round(((Date.now() - startedMs) / 3600000) * 100) / 100)
  await supabase.from('time_entries').insert([{
    project_id: timer.project_id,
    phase: timer.phase,
    hours,
    person: timer.person,
    entry_date: new Date().toISOString().split('T')[0],
    started_at: timer.started_at,
    ended_at: new Date().toISOString(),
  }])
  await supabase.from('active_timers').delete().eq('id', timer.id)
}

export function elapsedLabel(startedAt: string, now: number): string {
  const ms = Math.max(0, now - new Date(startedAt).getTime())
  const totalMin = Math.floor(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function mondayOf(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = x.getDay() === 0 ? 6 : x.getDay() - 1
  x.setDate(x.getDate() - dow)
  return x
}

// Shared by the dashboard's live status bar, the Projects page highlight logic
// and the per-project Time tab — one polling loop per page rather than one per
// component avoids redundant active_timers fetches on the same screen.
export function useTimeTracking() {
  const [person, setPerson] = useState('')
  const [timers, setTimers] = useState<ActiveTimer[]>([])
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)

  useEffect(() => { getCurrentPerson().then(setPerson) }, [])

  const refresh = useCallback(() => {
    supabase.from('active_timers').select('*').then(({ data }) => setTimers(data || []))
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const mine = timers.find(t => t.person === person) || null
  const others = timers.filter(t => t.person !== person)

  async function start(projectId: string, phase: string = 'Editing') {
    if (!projectId || !person) return
    setBusy(true)
    try { await startTimer(person, projectId, phase); refresh() } finally { setBusy(false) }
  }
  async function stop() {
    if (!mine) return
    setBusy(true)
    try { await stopTimer(mine); refresh() } finally { setBusy(false) }
  }

  return { person, timers, mine, others, now, busy, start, stop, refresh }
}
