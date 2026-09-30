import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  const { projectId, projectTitle, fileName, clientName, clientEmail, timestampSeconds, message } = await req.json()

  if (!clientEmail || !message) {
    return NextResponse.json({ error: 'Missing clientEmail or message' }, { status: 400 })
  }

  const timeLabel = fileName ? formatTimestamp(timestampSeconds || 0) : null
  const notifMessage = fileName
    ? `${clientName || clientEmail} left feedback at ${timeLabel} on "${fileName}" (${projectTitle || 'project'}): ${message}`
    : `${clientName || clientEmail} left feedback on ${projectTitle || 'the project'}: ${message}`

  try {
    await supabase.from('notifications').insert([{
      user_email: STUDIO_EMAIL,
      type: 'video_feedback',
      title: 'New video feedback',
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
        to: STUDIO_EMAIL,
        subject: fileName ? `Video feedback — ${projectTitle || 'Project'} @ ${timeLabel}` : `Project feedback — ${projectTitle || 'Project'}`,
        html: fileName ? `
          <p><strong>${clientName || clientEmail}</strong> left feedback on <strong>${fileName}</strong> (${projectTitle || 'project'}) at <strong>${timeLabel}</strong>:</p>
          <p>${message}</p>
        ` : `
          <p><strong>${clientName || clientEmail}</strong> left feedback on <strong>${projectTitle || 'the project'}</strong>:</p>
          <p>${message}</p>
        `,
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
