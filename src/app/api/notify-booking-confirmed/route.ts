import { NextRequest, NextResponse } from 'next/server'
import { formatTime12 } from '@/lib/time'
import { renderEmail } from '@/lib/emailTemplate'

// Fires when the studio confirms a booking directly (no date negotiation) —
// confirmBooking() in the studio portal used to only write an in-app
// notification, which a client wouldn't see until they next opened the
// portal themselves. Same shape as notify-date-proposed.
export async function POST(req: NextRequest) {
  const { clientEmail, clientName, createdByEmail, title, date, startTime, endTime } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
  }

  // Goes to whoever actually made this booking (a teammate or the account
  // owner) rather than always the main account holder.
  const emailTarget = createdByEmail || clientEmail

  const dateLabel = date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : null
  const timeLabel = startTime && endTime ? `${formatTime12(startTime)} – ${formatTime12(endTime)}` : null
  const portalUrl = new URL('/portal/client', req.nextUrl.origin).toString()

  try {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — in-portal notification only' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: emailTarget,
        subject: `Shoot confirmed${title ? ' — ' + title : ''}`,
        html: renderEmail({
          heading: 'Your shoot<br/>is confirmed.',
          intro: `Hi ${clientName || 'there'},`,
          bodyHtml: `<p style="margin:0;">${title ? '<strong style="color:#111111;">' + title + '</strong> is ' : 'Your booking is '}confirmed${dateLabel ? ' for <strong style="color:#111111;">' + dateLabel + '</strong>' : ''}${timeLabel ? ' at <strong style="color:#111111;">' + timeLabel + '</strong>' : ''}. Head to your portal for the full details.</p>`,
          cta: { label: 'Open portal', url: portalUrl },
        }),
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
