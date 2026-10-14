import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken } from '@/lib/xero'
import { getGstSchedule } from '@/lib/xeroReports'

export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ connected: false })

  const schedule = await getGstSchedule(token.accessToken, token.tenantId)
  return NextResponse.json({ connected: true, staggerAssumed: true, ...schedule })
}
