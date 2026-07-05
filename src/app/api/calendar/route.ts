import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'auth_url') {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent',
    })
    return NextResponse.json({ url })
  }

  const accessToken = req.cookies.get('google_access_token')?.value
  const refreshToken = req.cookies.get('google_refresh_token')?.value

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  if (action === 'availability') {
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]
    const timeMin = new Date(`${date}T00:00:00+12:00`).toISOString()
    const timeMax = new Date(`${date}T23:59:59+12:00`).toISOString()

    try {
      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin, timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const busy = (events.data.items || []).map(e => ({
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        title: e.summary,
      }))

      return NextResponse.json({ busy, date })
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
  const { title, date, startTime, endTime, clientEmail, location, description } = body

  try {
    const event = await calendar.events.insert({
      calendarId: 'primary',
      sendUpdates: 'all',
      requestBody: {
        summary: title,
        location: location || '',
        description: description || '',
        start: {
          dateTime: new Date(`${date}T${startTime}:00+12:00`).toISOString(),
          timeZone: 'Pacific/Auckland',
        },
        end: {
          dateTime: new Date(`${date}T${endTime}:00+12:00`).toISOString(),
          timeZone: 'Pacific/Auckland',
        },
        attendees: [
          { email: 'cody@examplecontent.co.nz', displayName: 'Example Content' },
          ...(clientEmail ? [{ email: clientEmail, displayName: 'Client' }] : []),
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      },
    })

    return NextResponse.json({ success: true, eventId: event.data.id, eventLink: event.data.htmlLink })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
