import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { startCalendarWatch } from '@/lib/google'

// Google Calendar watch channels expire after at most 7 days — this renews
// one proactively whenever it's within 24h of expiring (or missing, e.g. the
// very first registration failed), rather than waiting for sync to silently
// stop working. Runs daily via Vercel Cron (see vercel.json).
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: conn } = await admin.from('google_connection').select('calendar_channel_expiration').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return NextResponse.json({ skipped: 'Not connected' })

  const expiresAt = conn.calendar_channel_expiration ? new Date(conn.calendar_channel_expiration).getTime() : 0
  if (expiresAt - Date.now() > 24 * 60 * 60 * 1000) return NextResponse.json({ skipped: 'Not due yet' })

  const result = await startCalendarWatch(req.nextUrl.origin)
  return NextResponse.json(result)
}
