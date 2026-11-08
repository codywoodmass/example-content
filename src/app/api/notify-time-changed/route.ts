import { NextRequest, NextResponse } from 'next/server'
import { formatTime12 } from '@/lib/time'
import { renderEmail } from '@/lib/emailTemplate'
import { buildShootIcs } from '@/lib/ics'

// Fires when studio explicitly confirms sending a client an updated shoot
// time (the "Notify client of new time" button on a project) — separate
// from Google Calendar's own native attendee-update email, since that's
// easy to miss/ignore, whereas this is a clearly branded Example Content
// email plus an in-app notification.
export async function POST(req: NextRequest) {
  const { clientEmail, clientName, createdByEmail, title, date, startTime, endTime, projectId, location } = await req.json()

  if (!clientEmail || !date) {
    return NextResponse.json({ error: 'Missing clientEmail or date' }, { status: 400 })
  }

  const emailTarget = createdByEmail || clientEmail
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeLabel = startTime && endTime ? `${formatTime12(startTime)} – ${formatTime12(endTime)}` : null
  const portalUrl = new URL('/portal/client', req.nextUrl.origin).toString()

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — in-portal notification only' })
  }

  const attachments = startTime && endTime ? [{
    filename: 'shoot.ics',
    content: Buffer.from(buildShootIcs({
      uid: projectId || `${clientEmail}-${date}`,
      title: 'Example Content' + (title ? ' — ' + title : ''),
      description: 'Shoot with Example Content' + (title ? ' — ' + title : ''),
      location: location || '',
      date, startTime, endTime,
    })).toString('base64'),
  }] : undefined

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: emailTarget,
        subject: `Shoot time updated${title ? ' — ' + title : ''}`,
        html: renderEmail({
          heading: 'Your shoot time<br/>has changed.',
          intro: `Hi ${clientName || 'there'},`,
          bodyHtml: `<p style="margin:0;">${title ? '<strong style="color:#111111;">' + title + '</strong> has' : 'Your shoot has'} been rescheduled to <strong style="color:#111111;">${dateLabel}</strong>${timeLabel ? ' at <strong style="color:#111111;">' + timeLabel + '</strong>' : ''}. Your calendar invite has been updated to match — or add it fresh from the attachment on this email.</p>`,
          cta: { label: 'Open portal', url: portalUrl },
        }),
        attachments,
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
