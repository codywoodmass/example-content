import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { notify } from '@/lib/notify'

export type ActiveTimer = { id: string; project_id: string; person: string; phase: string; started_at: string }

// Resolves to the same name string the manual time-entry dropdown already uses
// (team1.name) wherever possible, so a live-tracked timer and a manually
// logged entry for the same person land under one name instead of splitting
// into two different "people" on the weekly totals and dashboard rings.
export async function getCurrentPerson(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return ''
  const email = session.user.email
  if (email) {
    const { data: teamMember } = await supabase.from('team1').select('name').ilike('email', email).maybeSingle()
    if (teamMember?.name) return teamMember.name
  }
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
  return profile?.full_name || email || ''
}

// Every write here reports its error back to the caller instead of being
// swallowed — a start/stop that silently fails (bad schema, RLS, a stale
// project id) looks identical to "nothing happened" otherwise, which is
// exactly what made this impossible to diagnose from the UI.
export async function startTimer(person: string, projectId: string, phase: string = 'Editing'): Promise<{ error: string | null }> {
  const { data: existing } = await supabase.from('active_timers').select('*').eq('person', person).maybeSingle()
  if (existing) {
    const res = await stopTimer(existing)
    if (res.error) return res
  }
  const { error } = await supabase.from('active_timers').upsert([{ person, project_id: projectId, phase, started_at: new Date().toISOString() }], { onConflict: 'person' })
  return { error: error ? error.message : null }
}

// The elapsed duration is always computed from the DB-stored started_at to now,
// never from client-side state — so time is recorded correctly even if the
// browser was closed and reopened while the timer kept running.
export async function stopTimer(timer: ActiveTimer): Promise<{ error: string | null }> {
  const startedMs = new Date(timer.started_at).getTime()
  const hours = Math.max(0.01, Math.round(((Date.now() - startedMs) / 3600000) * 100) / 100)
  const { error: insertError } = await supabase.from('time_entries').insert([{
    project_id: timer.project_id,
    phase: timer.phase,
    hours,
    person: timer.person,
    entry_date: new Date().toISOString().split('T')[0],
    started_at: timer.started_at,
    ended_at: new Date().toISOString(),
  }])
  if (insertError) return { error: insertError.message }
  const { error: deleteError } = await supabase.from('active_timers').delete().eq('id', timer.id)
  return { error: deleteError ? deleteError.message : null }
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
    return supabase.from('active_timers').select('*').then(({ data, error }) => {
      if (error) { notify('Could not load active timers: ' + error.message, 'error'); return }
      setTimers(data || [])
    })
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
    if (!projectId) return
    if (!person) { notify("Couldn't identify you — try refreshing the page", 'error'); return }
    setBusy(true)
    // Shows as tracking immediately rather than waiting on the next poll —
    // refresh() below reconciles with the real row (and its real id) right after.
    setTimers(prev => [...prev.filter(t => t.person !== person), { id: 'pending', project_id: projectId, person, phase, started_at: new Date().toISOString() }])
    try {
      const { error } = await startTimer(person, projectId, phase)
      if (error) notify('Could not start tracking: ' + error, 'error')
    } finally {
      await refresh()
      setBusy(false)
    }
  }
  async function stop() {
    if (!mine) return
    setBusy(true)
    setTimers(prev => prev.filter(t => t.person !== person))
    try {
      const { error } = await stopTimer(mine)
      if (error) notify('Could not stop tracking: ' + error, 'error')
      else notify('Time logged', 'success')
    } finally {
      await refresh()
      setBusy(false)
    }
  }

  return { person, timers, mine, others, now, busy, start, stop, refresh }
}
