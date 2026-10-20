import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lets the public, no-login /quote/[id] page accept a quote or leave
// feedback. Those writes go through RLS policies keyed off auth.jwt() when
// done from the logged-in client portal — an anonymous visitor has no JWT,
// so this route does the same writes server-side with the service role
// key instead, scoped to exactly the one quote named by id.
export async function POST(req: NextRequest) {
  const { quoteId, action, feedback } = await req.json()
  if (!quoteId || !action) return NextResponse.json({ error: 'Missing quoteId or action' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: quote, error: quoteError } = await admin.from('quotes1').select('*').eq('id', quoteId).maybeSingle()
  if (quoteError || !quote || quote.status === 'draft') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  if (action === 'accept') {
    await admin.from('quotes1').update({ status: 'approved' }).eq('id', quoteId)
    // Only advances a project still sitting at Enquiry — never regresses
    // one the studio has already moved further along in the meantime.
    if (quote.project_id) {
      await admin.from('projects1').update({ client_confirmed: true, confirmed_at: new Date().toISOString(), stage: 'Pre-Production', progress: 10 }).eq('id', quote.project_id).eq('stage', 'Enquiry')
    }
    await admin.from('notifications').insert([{
      user_email: 'cody@examplecontent.co.nz',
      type: 'quote_approved',
      title: 'Quote accepted',
      message: `${quote.client_name} has accepted the quote for ${quote.project_name}`,
      read: false,
      project_id: quote.project_id || null,
    }])
    return NextResponse.json({ success: true, status: 'approved' })
  }

  if (action === 'feedback') {
    if (!feedback || !feedback.trim()) return NextResponse.json({ error: 'Missing feedback' }, { status: 400 })
    await admin.from('quotes1').update({ data: { ...(quote.data || {}), clientFeedback: feedback, feedbackAt: new Date().toISOString() } }).eq('id', quoteId)
    await admin.from('notifications').insert([{
      user_email: 'cody@examplecontent.co.nz',
      type: 'quote_feedback',
      title: 'Quote feedback received',
      message: `${quote.client_name} sent feedback on ${quote.project_name}: ${feedback}`,
      read: false,
      project_id: quote.project_id || null,
    }])
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
