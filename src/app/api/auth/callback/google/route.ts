import { NextRequest, NextResponse } from 'next/server'
import { googleOAuthClient, saveGoogleConnection, startCalendarWatch } from '@/lib/google'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/portal/studio', req.url))

  try {
    const oauth2Client = googleOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    await saveGoogleConnection(tokens)
    // Best-effort — a date moved directly in Google Calendar syncing back
    // into the portal depends on this, but a failure here (most likely the
    // webhook domain not yet verified in Google Search Console) shouldn't
    // block the connection itself from working for everything else.
    const watch = await startCalendarWatch(req.nextUrl.origin)
    if (!watch.ok) console.error('Calendar watch not registered:', watch.error)
    return NextResponse.redirect(new URL('/portal/studio', req.url))
  } catch (e) {
    console.error('OAuth error:', e)
    return NextResponse.redirect(new URL('/portal/studio?google_error=1', req.url))
  }
}
