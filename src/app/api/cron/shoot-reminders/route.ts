import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatTime12 } from '@/lib/time'
import { getWeatherForAddress, WEATHER_CODE_ICONS } from '@/lib/weather'

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

// Vercel Cron on the Hobby plan only allows one run per day, invoked
// anywhere within the scheduled UTC hour (not the exact minute) — see
// vercel.json, which picks the UTC hour that lines up with 6am NZT for
// whichever DST state NZ is more often in; the other state lands ~an hour
// off. There's no way around that with a single static daily schedule, so
// this is an approximation of 6am rather than a guarantee of it.
function nzDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(d)
}
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to, subject, html,
      }),
    })
    if (!res.ok) console.error('Resend error:', await res.json().catch(() => ({})))
    return res.ok
  } catch (e) {
    console.error('Email send error:', e)
    return false
  }
}

// A project's shoot can be its single shoot_date/window, or (for multi-day
// jobs) one entry in shoot_dates — finds whichever one actually falls on
// the given date, since either shape can be the one that matches.
function shootOn(p: any, dateStr: string): { date: string; start: string | null; end: string | null } | null {
  if (p.shoot_date === dateStr) return { date: dateStr, start: p.shoot_window_start || null, end: p.shoot_window_end || null }
  const sd = (p.shoot_dates || []).find((s: any) => s.date === dateStr)
  if (sd) return { date: dateStr, start: sd.start_time || null, end: sd.end_time || null }
  return null
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const now = new Date()
  const todayStr = nzDateKey(now)
  // Safety net against double-sending, e.g. a redeploy or manual trigger
  // hitting this on top of the one scheduled run Vercel already guarantees.
  const { data: marker } = await admin.from('studio_settings').select('value').eq('key', 'last_shoot_digest_date').maybeSingle()
  if (marker?.value === todayStr) return NextResponse.json({ skipped: 'Already sent for today' })

  const tomorrowStr = addDays(todayStr, 1)

  const { data: projects, error } = await admin
    .from('projects1')
    .select('id, title, client, email, address, category, shoot_date, shoot_window_start, shoot_window_end, shoot_dates, archived, client_confirmed')
    .eq('archived', false)
    .eq('client_confirmed', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const todayShoots = (projects || []).map(p => ({ p, shoot: shootOn(p, todayStr) })).filter(x => x.shoot)
  const tomorrowShoots = (projects || []).map(p => ({ p, shoot: shootOn(p, tomorrowStr) })).filter(x => x.shoot)

  // Studio digest: everything on today, sent as one email at 6am rather than
  // Google Calendar's native per-event reminder (which fires 24h before each
  // event's own start time — i.e. at a different, unpredictable hour every day).
  let studioSent = false
  if (todayShoots.length > 0) {
    const rows = todayShoots
      .sort((a, b) => (a.shoot!.start || '99:99').localeCompare(b.shoot!.start || '99:99'))
      .map(({ p, shoot }) => `
        <tr>
          <td style="padding:8px 14px 8px 0;font-size:13px;color:#444;white-space:nowrap;vertical-align:top;">${shoot!.start ? formatTime12(shoot!.start) + (shoot!.end ? '–' + formatTime12(shoot!.end) : '') : 'Time TBC'}</td>
          <td style="padding:8px 0;font-size:13px;vertical-align:top;"><strong>${p.title}</strong> — ${p.client || ''}${p.address ? `<br><span style="color:#888;font-size:12px;">${p.address}</span>` : ''}</td>
        </tr>`)
      .join('')
    studioSent = await sendEmail(
      STUDIO_EMAIL,
      `${todayShoots.length} shoot${todayShoots.length !== 1 ? 's' : ''} today`,
      `<h2 style="font-family:sans-serif;font-size:18px;">Today's shoots</h2><table style="border-collapse:collapse;width:100%;font-family:sans-serif;">${rows}</table>`
    )
  }
  // Mark today as handled either way (including a quiet day with nothing on) so
  // this doesn't keep re-checking and potentially double-sending across the
  // other ~23 hourly runs today.
  await admin.from('studio_settings').upsert({ key: 'last_shoot_digest_date', value: todayStr, updated_at: new Date().toISOString() })

  // Client reminders: everything on tomorrow, one email per client with a
  // weather forecast for the shoot's actual address where there is one.
  let clientsSent = 0
  for (const { p, shoot } of tomorrowShoots) {
    if (!p.email) continue
    const weather = p.address ? await getWeatherForAddress(tomorrowStr, p.address) : null
    const weatherHtml = weather
      ? `<p style="font-family:sans-serif;font-size:13px;color:#444;">Forecast for tomorrow: ${WEATHER_CODE_ICONS[weather.code] || ''} ${weather.condition}, ${Math.round(weather.minTemp)}–${Math.round(weather.maxTemp)}°C, ${weather.rainChance}% chance of rain.</p>`
      : ''
    const ok = await sendEmail(
      p.email,
      `Reminder: your shoot is tomorrow`,
      `
        <p style="font-family:sans-serif;font-size:14px;">Hi ${p.client || 'there'}, just a reminder that your shoot — <strong>${p.title}</strong> — is scheduled for tomorrow${shoot!.start ? ' at ' + formatTime12(shoot!.start) : ''}${p.address ? ` at ${p.address}` : ''}.</p>
        ${weatherHtml}
      `
    )
    if (ok) clientsSent++
  }

  return NextResponse.json({ studioSent, todayCount: todayShoots.length, tomorrowCount: tomorrowShoots.length, clientsSent })
}
