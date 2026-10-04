import { NextRequest, NextResponse } from 'next/server'
import { googleOAuthClient, getGoogleClients, isGoogleConnected, GOOGLE_SCOPES } from '@/lib/google'
import { nzOffset } from '@/lib/time'

// Converts a UTC instant to its NZ-local calendar date (YYYY-MM-DD) — en-CA
// formats dates in ISO order, a reliable trick for this.
function nzLocalDate(isoOrDate: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(new Date(isoOrDate))
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'auth_url') {
    const oauth2Client = googleOAuthClient()
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_SCOPES,
      prompt: 'consent',
    })
    return NextResponse.json({ url })
  }

  if (action === 'status') {
    return NextResponse.json({ connected: await isGoogleConnected() })
  }

  const clients = await getGoogleClients()
  if (!clients) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { calendar } = clients

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
  const clients = await getGoogleClients()
  if (!clients) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { calendar } = clients

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
