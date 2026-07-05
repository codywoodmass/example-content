import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/portal/studio', req.url))

  try {
    const { tokens } = await oauth2Client.getToken(code)
    const response = NextResponse.redirect(new URL('/portal/studio', req.url))
    response.cookies.set('google_access_token', tokens.access_token || '', { maxAge: 3600, httpOnly: true })
    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, { maxAge: 60 * 60 * 24 * 30, httpOnly: true })
    }
    return response
  } catch (e) {
    console.error('OAuth error:', e)
    return NextResponse.redirect(new URL('/portal/studio', req.url))
  }
}
