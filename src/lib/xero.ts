import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Granular scopes (required for Xero apps created on/after 2 Mar 2026):
// accounting.invoices replaces the old broad accounting.transactions for writing
// invoices, and accounting.reports.read (which split into one scope per report
// type) is replaced here by accounting.reports.profitandloss.read for the P&L,
// accounting.reports.banksummary.read for the cash in/out chart,
// accounting.reports.taxreports.read for the GST/TaxSummary report, and
// accounting.reports.balancesheet.read for the cash flow forecast's bank balance.
// Legacy broad scopes AND any unrecognised scope string are silently rejected
// with invalid_scope by Xero's /authorize endpoint for newer apps, failing the
// whole request (and every scope in it, not just the bad one) before any login
// screen — confirmed by bisection testing, and by accounting.reports.taxsummary.read
// (not a real Xero scope; the correct one is taxreports.read) breaking the entire
// connect flow until caught.
export const XERO_SCOPES = 'openid profile email accounting.invoices accounting.reports.profitandloss.read accounting.reports.banksummary.read accounting.reports.taxreports.read accounting.reports.balancesheet.read accounting.contacts offline_access'

export function xeroAuthorizeUrl(state: string, codeChallenge: string, scopeOverride?: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.XERO_CLIENT_ID!,
    redirect_uri: process.env.XERO_REDIRECT_URI!,
    scope: scopeOverride || XERO_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://login.xero.com/identity/connect/authorize?${params.toString()}`
}

// Verifies the caller is a logged-in studio user (Authorization: Bearer <supabase access token>)
// and returns a Supabase client scoped to that user's session so RLS applies normally.
export async function requireStudioUser(req: NextRequest): Promise<
  { ok: true; user: any; supabase: SupabaseClient } | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || !userData?.user) return { ok: false, response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'studio') return { ok: false, response: NextResponse.json({ error: 'Studio access only' }, { status: 403 }) }

  return { ok: true, user: userData.user, supabase }
}

// Reads the stored connection, refreshing the access token first if it's near expiry.
// Xero rotates refresh tokens on every use, so the new one is persisted immediately.
// `force` skips the local expiry check and refreshes regardless — for when a real
// Xero API call came back 401 even though our cached expires_at looked fine (e.g. the
// token was invalidated on Xero's side, or a concurrent request already rotated the
// refresh token from under us). Trusting the stale local expiry in that case just
// repeats the same 401 on every subsequent load until expires_at finally catches up.
export async function getValidXeroToken(supabase: SupabaseClient, force = false): Promise<{ accessToken: string; tenantId: string; tenantName: string | null } | null> {
  const { data: conn } = await supabase.from('xero_connection').select('*').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return null

  const expiresAt = new Date(conn.expires_at).getTime()
  if (!force && expiresAt - Date.now() > 60_000) return { accessToken: conn.access_token, tenantId: conn.tenant_id, tenantName: conn.tenant_name }

  const existing = inFlightRefresh.get(conn.id)
  if (existing) return existing

  const refreshPromise = (async () => {
    const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
    const res = await fetch('https://identity.xero.com/connect/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
    })
    if (!res.ok) {
      console.error('Xero token refresh failed:', res.status, await res.text().catch(() => ''))
      return null
    }
    const tokens = await res.json()
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    await supabase.from('xero_connection').update({
      access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: newExpiresAt,
    }).eq('id', conn.id)

    return { accessToken: tokens.access_token, tenantId: conn.tenant_id, tenantName: conn.tenant_name }
  })()

  inFlightRefresh.set(conn.id, refreshPromise)
  try {
    return await refreshPromise
  } finally {
    inFlightRefresh.delete(conn.id)
  }
}

// The P&L page kicks off pnl/gst/cashflow/status requests together, each independently
// calling getValidXeroToken — if the token happens to be near expiry, all of them would
// otherwise race to redeem the same single-use refresh_token at once. Xero only honours
// the first redemption; the rest get invalid_grant. De-duping concurrent refreshes within
// this process (serverless instances are warm across requests in quick succession) means
// only one actually hits Xero, and everyone else just awaits its result.
const inFlightRefresh = new Map<string, Promise<{ accessToken: string; tenantId: string; tenantName: string | null } | null>>()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Xero caps concurrent requests per tenant at 5 — and the P&L page fires a lot
// of these in parallel across three separate API routes (pnl/gst/cashflow),
// several of which (the cash flow chart's per-month BankSummary calls, for
// one) are themselves a Promise.all of half a dozen more. Without this, that
// burst blew straight past the concurrency cap, Xero 429'd most of them, and
// every one of those then sat out the Retry-After backoff below before
// re-trying — which is what actually made the page "take ages": not the
// Xero calls themselves, but the retry sleeps stacking up behind a self-made
// traffic jam. Queuing to a safe concurrency instead avoids hitting 429 in
// the first place, so the retry path below is now the rare fallback, not the
// common case.
const MAX_CONCURRENT_XERO_CALLS = 4
let activeXeroCalls = 0
const xeroQueue: (() => void)[] = []

async function acquireXeroSlot() {
  if (activeXeroCalls < MAX_CONCURRENT_XERO_CALLS) { activeXeroCalls++; return }
  await new Promise<void>(resolve => xeroQueue.push(resolve))
  activeXeroCalls++
}
function releaseXeroSlot() {
  activeXeroCalls--
  const next = xeroQueue.shift()
  if (next) next()
}

// Rather than surface a 429 as a broken panel, wait for the Retry-After Xero
// sends (or a short default) and retry a couple of times before giving up for
// real. The queue slot is released before this sleep — a backoff wait isn't
// an in-flight Xero call, so holding a slot through it would just queue up
// everyone else for no reason.
export async function xeroFetch(accessToken: string, tenantId: string, path: string, options: RequestInit = {}, retries = 2) {
  await acquireXeroSlot()
  let res: Response
  try {
    res = await fetch(`https://api.xero.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Xero-tenant-id': tenantId,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    })
  } finally {
    releaseXeroSlot()
  }
  if (res.status === 429 && retries > 0) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10)
    await sleep(Math.min(retryAfter, 10) * 1000)
    return xeroFetch(accessToken, tenantId, path, options, retries - 1)
  }
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
