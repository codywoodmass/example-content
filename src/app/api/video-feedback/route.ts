import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

function formatTimestamp(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

type Stop = { timestampSeconds: number; message: string }

export async function POST(req: NextRequest) {
  const { projectId, projectTitle, fileName, clientName, clientEmail, timestampSeconds, message, stops } = await req.json()

  // Two shapes land here: a single `message` (general, non-timestamped
  // project feedback — unchanged), or a `stops` array (one or more
  // timestamped notes on a clip, sent together as one batch). Either way
  // this composes exactly one notification and one email — never one per
  // stop — so a client queuing up several notes reaches the studio as a
  // single change request that lists every one of them, not a flood of
  // separate alerts.
  const batch: Stop[] = Array.isArray(stops) && stops.length > 0
    ? stops
    : message ? [{ timestampSeconds: timestampSeconds || 0, message }] : []

  if (!clientEmail || batch.length === 0) {
    return NextResponse.json({ error: 'Missing clientEmail or message/stops' }, { status: 400 })
  }

  const who = clientName || clientEmail
  const subject = fileName
    ? batch.length > 1
      ? `Video feedback — ${batch.length} changes on "${fileName}" (${projectTitle || 'Project'})`
      : `Video feedback — ${projectTitle || 'Project'} @ ${formatTimestamp(batch[0].timestampSeconds)}`
    : `Project feedback — ${projectTitle || 'Project'}`

  const notifMessage = fileName
    ? batch.length > 1
      ? `${who} left ${batch.length} changes on "${fileName}" (${projectTitle || 'project'}): ` +
        batch.map(s => `${formatTimestamp(s.timestampSeconds)} — ${s.message}`).join(' · ')
      : `${who} left feedback at ${formatTimestamp(batch[0].timestampSeconds)} on "${fileName}" (${projectTitle || 'project'}): ${batch[0].message}`
    : `${who} left feedback on ${projectTitle || 'the project'}: ${batch[0].message}`

  try {
    await supabase.from('notifications').insert([{
      user_email: STUDIO_EMAIL,
      type: 'video_feedback',
      title: batch.length > 1 ? `New video feedback — ${batch.length} changes` : 'New video feedback',
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

  const bodyHtml = fileName
    ? `
      <p><strong>${who}</strong> left ${batch.length > 1 ? `${batch.length} changes` : 'feedback'} on <strong>${fileName}</strong> (${projectTitle || 'project'}):</p>
      <ul style="padding-left:18px;margin:12px 0;">
        ${batch.map(s => `<li style="margin-bottom:8px;"><strong>${formatTimestamp(s.timestampSeconds)}</strong> — ${s.message}</li>`).join('')}
      </ul>
    `
    : `
      <p><strong>${who}</strong> left feedback on <strong>${projectTitle || 'the project'}</strong>:</p>
      <p>${batch[0].message}</p>
    `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: STUDIO_EMAIL,
        subject,
        html: bodyHtml,
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
