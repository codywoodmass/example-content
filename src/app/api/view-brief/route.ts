import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Backs the public, no-login /brief/[id] page. Only briefs that have
// actually been sent (or already approved) are servable — a draft the
// studio hasn't sent yet should never be reachable via this link.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await admin
    .from('briefs')
    .select('id,project_name,client_name,client_email,status,data,project_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !data || data.status === 'draft') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  return NextResponse.json({ brief: data })
}
