import { NextRequest, NextResponse } from 'next/server'
import { randomUUID, randomBytes, createHash } from 'crypto'
import { requireStudioUser, xeroAuthorizeUrl } from '@/lib/xero'

// The OAuth callback is a plain browser redirect from Xero with no Authorization
// header, so we can't verify the studio session there directly. Instead we stash a
// short-lived, single-use state -> access-token mapping now (while we still have a
// verified studio session) for the callback to pick up. Xero also requires PKCE, so
// the code_verifier travels the same way and the code_challenge goes in the URL.
export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  // ?scope=... lets us bisect an invalid_scope error one scope at a time without
  // editing code — add scopes back one at a time; the first one that fails is the
  // culprit. ?debug=1 reports what the request would look like without spending an
  // actual OAuth round trip, and without ever exposing the client secret.
  if (req.nextUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({
      scope: req.nextUrl.searchParams.get('scope') || undefined,
      hasClientId: !!process.env.XERO_CLIENT_ID,
      hasClientSecret: !!process.env.XERO_CLIENT_SECRET,
      redirectUri: process.env.XERO_REDIRECT_URI || null,
    })
  }

  const token = req.headers.get('authorization')!.replace(/^Bearer\s+/i, '')
  const state = randomUUID()
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const scopeOverride = req.nextUrl.searchParams.get('scope') || undefined

  await auth.supabase.from('xero_oauth_state').delete().lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
  await auth.supabase.from('xero_oauth_state').insert([{ state, access_token: token, code_verifier: codeVerifier }])

  return NextResponse.json({ url: xeroAuthorizeUrl(state, codeChallenge, scopeOverride) })
}
