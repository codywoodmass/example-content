import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Backs the public, no-login /view/[id] page — deliberately returns only the
// handful of fields that page needs, never the full projects1 row (no notes,
// financials, or other clients' data), and only once content has actually
// been delivered (drive_url set). The project id itself is the "token":
// unguessable like any UUID, same trust model as a Drive/Figma share link.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { data, error } = await admin
    .from('projects1')
    .select('id,title,client,address,category,drive_url,delivery_due,shoot_date')
    .eq('id', id)
    .maybeSingle()

  if (error || !data || !data.drive_url) {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  return NextResponse.json({ project: data })
}
