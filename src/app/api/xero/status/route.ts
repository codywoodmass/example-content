import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken } from '@/lib/xero'

export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const { data: conn } = await auth.supabase.from('xero_connection').select('tenant_name, connected_at').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return NextResponse.json({ connected: false })

  // A connection row existing doesn't mean the connection still works — Xero
  // can invalidate the stored refresh token (revoked access, 60 days unused,
  // a lost rotation) without anything here ever finding out, so this badge
  // used to be able to say "Connected" while every sync silently failed.
  // Actually exercising the refresh is the only way to tell them apart.
  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ connected: false, staleConnection: true })

  return NextResponse.json({ connected: true, tenantName: conn.tenant_name, connectedAt: conn.connected_at })
}
