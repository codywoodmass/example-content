import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

// NZ alternates between NZST (+12:00) and NZDT (+13:00) — a hardcoded +12:00
// offset (the old behaviour here) is wrong for roughly half the year, currently
// included, and silently shifts every event/availability check by an hour.
function nzOffset(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', timeZoneName: 'longOffset' }).formatToParts(d)
  const tz = parts.find(p => p.type === 'timeZoneName')?.value
  return tz ? tz.replace('GMT', '') : '+12:00'
}

// Converts a UTC instant to its NZ-local calendar date (YYYY-MM-DD) — en-CA
// formats dates in ISO order, a reliable trick for this.
function nzLocalDate(isoOrDate: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date(isoOrDate))
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'auth_url') {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive'],
      prompt: 'consent',
    })
    return NextResponse.json({ url })
  }

  const accessToken = req.cookies.get('google_access_token')?.value
  const refreshToken = req.cookies.get('google_refresh_token')?.value

  if (action === 'status') {
    return NextResponse.json({ connected: !!refreshToken })
  }

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  if (action === 'availability') {
    // Accepts either a single `date` or a `from`/`to` range (e.g. a whole week) —
    // one Calendar API call either way, with results bucketed per local day.
    const dateParam = req.nextUrl.searchParams.get('date')
    const from = req.nextUrl.searchParams.get('from') || dateParam || new Date().toISOString().split('T')[0]
    const to = req.nextUrl.searchParams.get('to') || dateParam || from
    const timeMin = new Date(`${from}T00:00:00${nzOffset(from)}`).toISOString()
    const timeMax = new Date(`${to}T23:59:59${nzOffset(to)}`).toISOString()

    try {
      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin, timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const busyByDate: Record<string, { start: string; end: string; title?: string }[]> = {}
      for (const e of events.data.items || []) {
        const start = e.start?.dateTime || e.start?.date
        const end = e.end?.dateTime || e.end?.date
        if (!start || !end) continue
        const localDate = nzLocalDate(start)
        if (!busyByDate[localDate]) busyByDate[localDate] = []
        busyByDate[localDate].push({ start, end, title: e.summary || undefined })
      }

      return NextResponse.json({ busyByDate, from, to })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('google_access_token')?.value
  const refreshToken = req.cookies.get('google_refresh_token')?.value

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const body = await req.json()
  const { title, date, startTime, endTime, clientEmail, location, description, eventId } = body
  const validClientEmail = typeof clientEmail === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim()) ? clientEmail.trim() : null

  const requestBody = {
    summary: title,
    location: location || '',
    description: description || '',
    start: {
      dateTime: new Date(`${date}T${startTime}:00${nzOffset(date)}`).toISOString(),
      timeZone: 'Pacific/Auckland',
    },
    end: {
      dateTime: new Date(`${date}T${endTime}:00${nzOffset(date)}`).toISOString(),
      timeZone: 'Pacific/Auckland',
    },
    attendees: [
      { email: 'cody@examplecontent.co.nz', displayName: 'Example Content' },
      ...(validClientEmail ? [{ email: validClientEmail, displayName: 'Client' }] : []),
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  }

  try {
    // Update the existing event in place (e.g. the shoot date/time changed) when we
    // already have one, rather than creating a duplicate. If that event was since
    // deleted from the calendar, fall back to creating a fresh one.
    let event
    if (eventId) {
      try {
        event = await calendar.events.patch({ calendarId: 'primary', eventId, sendUpdates: 'all', requestBody })
      } catch (patchError: any) {
        if (patchError.code === 404 || patchError.code === 410) {
          event = await calendar.events.insert({ calendarId: 'primary', sendUpdates: 'all', requestBody })
        } else {
          throw patchError
        }
      }
    } else {
      event = await calendar.events.insert({ calendarId: 'primary', sendUpdates: 'all', requestBody })
    }

    return NextResponse.json({ success: true, eventId: event.data.id, eventLink: event.data.htmlLink })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
