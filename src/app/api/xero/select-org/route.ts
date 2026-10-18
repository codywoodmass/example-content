import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken } from '@/lib/xero'

// Switches which organisation (under the same Xero login/grant) the stored
// connection points at. Re-verifies the requested tenantId is actually one
// this login has access to right now, rather than trusting the client.
export async function POST(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const { tenantId } = await req.json()
  if (!tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })

  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ error: 'Xero is not connected' }, { status: 400 })

  const res = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })
  if (!res.ok) return NextResponse.json({ error: 'Could not verify Xero organisations' }, { status: 502 })

  const connections = await res.json()
  const match = (Array.isArray(connections) ? connections : []).find((c: any) => c.tenantId === tenantId)
  if (!match) return NextResponse.json({ error: 'That organisation is not available on this Xero connection' }, { status: 400 })

  const { data: conn } = await auth.supabase.from('xero_connection').select('id').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return NextResponse.json({ error: 'Xero is not connected' }, { status: 400 })

  await auth.supabase.from('xero_connection').update({ tenant_id: match.tenantId, tenant_name: match.tenantName }).eq('id', conn.id)

  return NextResponse.json({ success: true, tenantName: match.tenantName })
}
