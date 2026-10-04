import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getChangedCalendarEvents } from '@/lib/google'
import { nzLocalDateTime } from '@/lib/time'

// Google calls this on every change to the watched calendar (see
// startCalendarWatch in src/lib/google.ts) — the ping itself carries no
// details about what changed, just that *something* did, so this fetches
// the actual deltas via a sync token and reconciles each one against the
// project it belongs to.
export async function POST(req: NextRequest) {
  const resourceState = req.headers.get('x-goog-resource-state')
  // The very first call after watch() is registered is just a handshake
  // ("sync"), not an actual change — nothing to reconcile yet.
  if (resourceState === 'sync') return NextResponse.json({ ok: true })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { events, error } = await getChangedCalendarEvents()
  if (error) { console.error('Webhook sync error:', error); return NextResponse.json({ ok: false }) }

  for (const event of events) {
    if (!event.id) continue
    const { data: project } = await admin.from('projects1').select('id, shoot_date, shoot_window_start, shoot_window_end').eq('calendar_event_id', event.id).maybeSingle()
    if (!project) continue

    // A cancelled/deleted calendar event is left alone rather than un-scheduling
    // the project — too destructive to do automatically from a calendar-side
    // delete, which is as likely to be a mistake as an intentional one.
    if (event.status === 'cancelled') continue

    const startIso = event.start?.dateTime
    const endIso = event.end?.dateTime
    if (!startIso || !endIso) continue

    const start = nzLocalDateTime(startIso)
    const end = nzLocalDateTime(endIso)

    if (start.date === project.shoot_date && start.time === project.shoot_window_start && end.time === project.shoot_window_end) continue

    await admin.from('projects1').update({
      shoot_date: start.date,
      shoot_window_start: start.time,
      shoot_window_end: end.time,
    }).eq('id', project.id)
  }

  return NextResponse.json({ ok: true })
}
