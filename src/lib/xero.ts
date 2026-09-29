import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Granular scopes (required for Xero apps created on/after 2 Mar 2026):
// accounting.invoices replaces the old broad accounting.transactions for writing
// invoices, and accounting.reports.read (which split into one scope per report
// type) is replaced here by accounting.reports.profitandloss.read for the P&L and
// accounting.reports.banksummary.read for the cash in/out chart. Legacy broad
// scopes are silently rejected with invalid_scope by Xero's /authorize endpoint for
// newer apps, failing the whole request before any login screen (Xero doesn't say
// which scope was bad) — confirmed by bisection testing.
export const XERO_SCOPES = 'openid profile email accounting.invoices accounting.reports.profitandloss.read accounting.reports.banksummary.read accounting.contacts offline_access'

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
export async function getValidXeroToken(supabase: SupabaseClient): Promise<{ accessToken: string; tenantId: string } | null> {
  const { data: conn } = await supabase.from('xero_connection').select('*').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return null

  const expiresAt = new Date(conn.expires_at).getTime()
  if (expiresAt - Date.now() > 60_000) return { accessToken: conn.access_token, tenantId: conn.tenant_id }

  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refresh_token }),
  })
  if (!res.ok) return null
  const tokens = await res.json()
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await supabase.from('xero_connection').update({
    access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: newExpiresAt,
  }).eq('id', conn.id)

  return { accessToken: tokens.access_token, tenantId: conn.tenant_id }
}

export async function xeroFetch(accessToken: string, tenantId: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.xero.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
