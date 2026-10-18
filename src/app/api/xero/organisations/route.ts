import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken } from '@/lib/xero'

// Lists every organisation the connected Xero login currently has this app
// authorized for — not just the one we happen to have stored as active.
// This exists because the callback's "match the previous tenant" logic is
// a best-effort guess that only self-corrects once the unwanted org has
// actually been removed on Xero's side; this lets the studio user just see
// every option and pick the right one directly instead of fighting that.
export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ error: 'Xero is not connected' }, { status: 400 })

  const res = await fetch('https://api.xero.com/connections', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  })
  if (!res.ok) return NextResponse.json({ error: 'Could not list Xero organisations' }, { status: 502 })

  const connections = await res.json()
  const organisations = (Array.isArray(connections) ? connections : []).map((c: any) => ({ tenantId: c.tenantId, tenantName: c.tenantName }))

  return NextResponse.json({ organisations, activeTenantId: token.tenantId })
}
