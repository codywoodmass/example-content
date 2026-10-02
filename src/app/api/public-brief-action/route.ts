import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lets the public, no-login /brief/[id] page approve a brief or leave
// feedback. Those writes go through RLS policies keyed off auth.jwt()
// when done from the logged-in client portal — an anonymous visitor has
// no JWT, so this route does the same writes server-side with the
// service role key instead, scoped to exactly the one brief named by id.
export async function POST(req: NextRequest) {
  const { briefId, action, feedback } = await req.json()
  if (!briefId || !action) return NextResponse.json({ error: 'Missing briefId or action' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: brief, error: briefError } = await admin.from('briefs').select('*').eq('id', briefId).maybeSingle()
  if (briefError || !brief || brief.status === 'draft') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  if (action === 'approve') {
    await admin.from('briefs').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', briefId)
    if (brief.project_id) {
      await admin.from('projects1').update({ client_confirmed: true, confirmed_at: new Date().toISOString(), stage: 'Pre-Production', progress: 10 }).eq('id', brief.project_id).eq('stage', 'Enquiry')
    }
    await admin.from('notifications').insert([{
      user_email: 'cody@examplecontent.co.nz',
      type: 'brief_approved',
      title: 'Brief approved',
      message: `${brief.client_name} has approved the brief for ${brief.project_name}`,
      read: false,
      project_id: brief.project_id || null,
    }])
    return NextResponse.json({ success: true, status: 'approved' })
  }

  if (action === 'feedback') {
    if (!feedback || !feedback.trim()) return NextResponse.json({ error: 'Missing feedback' }, { status: 400 })
    await admin.from('briefs').update({ data: { ...(brief.data || {}), clientFeedback: feedback, feedbackAt: new Date().toISOString() } }).eq('id', briefId)
    await admin.from('notifications').insert([{
      user_email: 'cody@examplecontent.co.nz',
      type: 'brief_feedback',
      title: 'Brief feedback received',
      message: `${brief.client_name} sent feedback on ${brief.project_name}: ${feedback}`,
      read: false,
      project_id: brief.project_id || null,
    }])
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
