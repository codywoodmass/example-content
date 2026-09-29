import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser } from '@/lib/xero'

export async function POST(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const { data: conn } = await auth.supabase.from('xero_connection').select('*').order('connected_at', { ascending: false }).limit(1).maybeSingle()
  if (conn) {
    try {
      const basic = Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')
      await fetch('https://identity.xero.com/connect/revoke', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: conn.refresh_token }),
      })
    } catch (e) { console.error('Xero revoke error:', e) }
    await auth.supabase.from('xero_connection').delete().eq('id', conn.id)
  }

  return NextResponse.json({ success: true })
}
