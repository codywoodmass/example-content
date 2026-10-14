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
  const connectionsList: any[] = Array.isArray(connections) ? connections : []

  const authedSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${pending.access_token}` } },
  })

  // Read the previously connected org (if any) *before* wiping it, and
  // prefer re-matching it over just taking connections[0]. If this Xero
  // login has access to more than one organisation (e.g. an old/unused org
  // from earlier testing that was never revoked), Xero's connections list
  // isn't guaranteed to put the intended one first — blindly taking [0] on
  // every reconnect (this app has needed several, for scope upgrades) risks
  // silently landing on a different org each time, with everything still
  // *looking* connected. Sticking to the same tenant on reconnect avoids
  // that; a genuinely first-time connect still falls back to [0] since
  // there's nothing to pin to yet.
  const { data: existingConn } = await authedSupabase.from('xero_connection').select('tenant_id').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  const tenant = (existingConn && connectionsList.find(c => c.tenantId === existingConn.tenant_id)) || connectionsList[0]
  if (!tenant) return NextResponse.redirect(new URL('/portal/studio?xero=error&detail=' + encodeURIComponent('no Xero organisation connected'), req.url))
  if (connectionsList.length > 1) {
    console.warn('Xero login has multiple connected organisations:', connectionsList.map(c => c.tenantName).join(', '), '— selected:', tenant.tenantName)
  }

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
