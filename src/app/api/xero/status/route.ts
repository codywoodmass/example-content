import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser } from '@/lib/xero'

export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const { data: conn } = await auth.supabase.from('xero_connection').select('tenant_name, connected_at').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (!conn) return NextResponse.json({ connected: false })

  return NextResponse.json({ connected: true, tenantName: conn.tenant_name, connectedAt: conn.connected_at })
}
