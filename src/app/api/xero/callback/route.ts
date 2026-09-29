import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  if (!code || !state) return NextResponse.redirect(new URL('/portal/studio?xero=error', req.url))

  // Recover the studio session that started this flow (see /api/xero/connect).
  const { data: pending } = await supabase.from('xero_oauth_state').select('*').eq('state', state).maybeSingle()
  if (!pending) return NextResponse.redirect(new URL('/portal/studio?xero=error', req.url))
  await supabase.from('xero_oauth_state').delete().eq('state', state)

  const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
  const tokenRes = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: process.env.XERO_REDIRECT_URI!, code_verifier: pending.code_verifier }),
  })
  const tokens = await tokenRes.json()
  if (!tokenRes.ok) {
    console.error('Xero token exchange failed:', tokens)
    return NextResponse.redirect(new URL('/portal/studio?xero=error&detail=' + encodeURIComponent(tokens.error_description || tokens.error || 'token exchange failed'), req.url))
  }

  const connRes = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const connections = await connRes.json()
  const tenant = Array.isArray(connections) ? connections[0] : null
  if (!tenant) return NextResponse.redirect(new URL('/portal/studio?xero=error&detail=' + encodeURIComponent('no Xero organisation connected'), req.url))

  const authedSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${pending.access_token}` } },
  })

  // Single business, single connection — clear any previous row before storing the new one.
  await authedSupabase.from('xero_connection').delete().neq('tenant_id', '')
  await authedSupabase.from('xero_connection').insert([{
    tenant_id: tenant.tenantId,
    tenant_name: tenant.tenantName,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  }])

  return NextResponse.redirect(new URL('/portal/studio?xero=connected#finance', req.url))
}
