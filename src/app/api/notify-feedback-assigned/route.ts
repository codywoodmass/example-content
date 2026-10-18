import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  const { projectId, projectTitle, assigneeEmail, assigneeName, message } = await req.json()

  if (!assigneeEmail || !message) {
    return NextResponse.json({ error: 'Missing assigneeEmail or message' }, { status: 400 })
  }

  const notifMessage = `Feedback on ${projectTitle || 'a project'} was assigned to you: ${message}`

  try {
    await supabase.from('notifications').insert([{
      user_email: assigneeEmail,
      type: 'feedback_assigned',
      title: 'Feedback assigned to you',
      message: notifMessage,
      project_id: projectId || null,
      read: false,
    }])
  } catch (e) {
    console.error('Notification insert error:', e)
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — in-portal notification only' })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: assigneeEmail,
        subject: `Feedback assigned to you — ${projectTitle || 'Project'}`,
        html: `<p>Hey ${assigneeName || ''},</p><p>Feedback on <strong>${projectTitle || 'a project'}</strong> has been assigned to you:</p><p>${message}</p>`,
      }),
    })
    const emailData = await res.json()
    if (!res.ok) {
      console.error('Resend error:', emailData)
      return NextResponse.json({ success: true, emailSent: false, error: emailData })
    }
    return NextResponse.json({ success: true, emailSent: true })
  } catch (e) {
    console.error('Email send error:', e)
    return NextResponse.json({ success: true, emailSent: false })
  }
}
