import { google } from 'googleapis'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Single persistent connection (one business Google account), stored in the
// DB instead of browser cookies — this is what lets every API route use it
// server-side regardless of whose browser is open, and is also what makes
// "connect once" actually mean once rather than once per browser/device.
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/drive']

export function googleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
}

function serviceClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

// Reads the stored connection, refreshing the access token first if it's near
// expiry. Google doesn't rotate the refresh token on every use (unlike Xero),
// so only access_token/expires_at normally change — but a new refresh_token
// is persisted too on the rare occasion Google does send one.
export async function getValidGoogleToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const supabase = serviceClient()
  const { data: conn } = await supabase.from('google_connection').select('*').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return null

  const expiresAt = new Date(conn.expires_at).getTime()
  if (expiresAt - Date.now() > 60_000) return { accessToken: conn.access_token, refreshToken: conn.refresh_token }

  const oauth2Client = googleOAuthClient()
  oauth2Client.setCredentials({ refresh_token: conn.refresh_token })
  try {
    const { credentials } = await oauth2Client.refreshAccessToken()
    const newExpiresAt = new Date(Date.now() + ((credentials.expiry_date ? credentials.expiry_date - Date.now() : 3600_000))).toISOString()
    await supabase.from('google_connection').update({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token || conn.refresh_token,
      expires_at: newExpiresAt,
    }).eq('id', conn.id)
    return { accessToken: credentials.access_token!, refreshToken: credentials.refresh_token || conn.refresh_token }
  } catch (e) {
    console.error('Google token refresh error:', e)
    return null
  }
}

export async function getGoogleClients(): Promise<{ calendar: ReturnType<typeof google.calendar>; drive: ReturnType<typeof google.drive> } | null> {
  const token = await getValidGoogleToken()
  if (!token) return null
  const oauth2Client = googleOAuthClient()
  oauth2Client.setCredentials({ access_token: token.accessToken, refresh_token: token.refreshToken })
  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    drive: google.drive({ version: 'v3', auth: oauth2Client }),
  }
}

export async function saveGoogleConnection(tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) {
  const supabase = serviceClient()
  const { data: existing } = await supabase.from('google_connection').select('id, refresh_token').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  const expires_at = new Date(tokens.expiry_date || Date.now() + 3600_000).toISOString()
  // Google only sends a refresh_token on the very first consent (or when
  // prompt=consent forces re-issue) — keep the existing one if this grant
  // didn't include a fresh one.
  const refresh_token = tokens.refresh_token || existing?.refresh_token
  if (!refresh_token) throw new Error('No refresh token returned and none stored previously — reconnect with prompt=consent')
  if (existing) {
    await supabase.from('google_connection').update({ access_token: tokens.access_token, refresh_token, expires_at }).eq('id', existing.id)
  } else {
    await supabase.from('google_connection').insert([{ access_token: tokens.access_token, refresh_token, expires_at, connected_at: new Date().toISOString() }])
  }
}

export async function isGoogleConnected(): Promise<boolean> {
  const supabase = serviceClient()
  const { data } = await supabase.from('google_connection').select('id').limit(1).maybeSingle()
  return !!data
}

// Registers (or renews) a push-notification channel on the primary calendar
// so Google calls our webhook whenever an event changes — this is what lets
// a date/time moved directly in Google Calendar flow back into the portal.
// Requires the webhook URL's domain to be verified in Google Search Console
// under the same Cloud project as the OAuth client — without that, Google
// rejects the watch() call with a 403, which this surfaces rather than throws
// so a failed/missing verification doesn't break the rest of the connection.
export async function startCalendarWatch(baseUrl: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = serviceClient()
  const { data: conn } = await supabase.from('google_connection').select('*').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return { ok: false, error: 'Not connected' }

  const clients = await getGoogleClients()
  if (!clients) return { ok: false, error: 'Not connected' }

  // Stop the previous channel first (if any) — Google allows multiple
  // concurrent channels on the same calendar, and leaving old ones running
  // would otherwise just pile up silently.
  if (conn.calendar_channel_id && conn.calendar_resource_id) {
    try {
      await clients.calendar.channels.stop({ requestBody: { id: conn.calendar_channel_id, resourceId: conn.calendar_resource_id } })
    } catch (e) { /* already expired/stopped — fine */ }
  }

  const channelId = randomUUID()
  try {
    const res = await clients.calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: new URL('/api/google/webhook', baseUrl).toString(),
      },
    })
    await supabase.from('google_connection').update({
      calendar_channel_id: res.data.resourceId ? channelId : null,
      calendar_resource_id: res.data.resourceId || null,
      calendar_channel_expiration: res.data.expiration ? new Date(Number(res.data.expiration)).toISOString() : null,
    }).eq('id', conn.id)
    return { ok: true }
  } catch (e: any) {
    console.error('Calendar watch registration error:', e)
    return { ok: false, error: e.message }
  }
}

// Fetches events changed since the last sync token (bootstrapping one via a
// full sync on first run) and persists the new token for next time.
export async function getChangedCalendarEvents(): Promise<{ events: any[]; error?: string }> {
  const supabase = serviceClient()
  const { data: conn } = await supabase.from('google_connection').select('*').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return { events: [], error: 'Not connected' }

  const clients = await getGoogleClients()
  if (!clients) return { events: [], error: 'Not connected' }

  try {
    if (!conn.calendar_sync_token) {
      // First run — no token yet. A syncToken can only be obtained from a
      // full (non-incremental) list call, so this one just bootstraps the
      // token and intentionally reports no "changes" yet.
      const initial = await clients.calendar.events.list({ calendarId: 'primary', singleEvents: true })
      await supabase.from('google_connection').update({ calendar_sync_token: initial.data.nextSyncToken || null }).eq('id', conn.id)
      return { events: [] }
    }

    const res = await clients.calendar.events.list({ calendarId: 'primary', syncToken: conn.calendar_sync_token, singleEvents: true })
    await supabase.from('google_connection').update({ calendar_sync_token: res.data.nextSyncToken || conn.calendar_sync_token }).eq('id', conn.id)
    return { events: res.data.items || [] }
  } catch (e: any) {
    // A 410 means the token is too old/invalid — drop it so the next call
    // re-bootstraps via a fresh full sync instead of erroring forever.
    if (e.code === 410) await supabase.from('google_connection').update({ calendar_sync_token: null }).eq('id', conn.id)
    console.error('Calendar sync error:', e)
    return { events: [], error: e.message }
  }
}
