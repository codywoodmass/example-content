import { NextRequest, NextResponse } from 'next/server'
import { formatTime12 } from '@/lib/time'
import { renderEmail } from '@/lib/emailTemplate'

export async function POST(req: NextRequest) {
  const { clientEmail, clientName, title, date, startTime, endTime, createdByEmail } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
  }

  // Goes to whoever actually made this booking (a teammate or the account
  // owner) rather than always the main account holder — the in-app
  // notification (written separately by the caller) still targets the
  // shared account email, so everyone on the account sees it there either way.
  const emailTarget = createdByEmail || clientEmail

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeLabel = `${formatTime12(startTime)} – ${formatTime12(endTime)}`
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
        subject: `A time has been proposed${title ? ' for ' + title : ''}`,
        html: renderEmail({
          heading: 'A time has<br/>been proposed.',
          intro: `Hi ${clientName || 'there'},`,
          bodyHtml: `<p style="margin:0;">We'd like to propose <strong style="color:#111111;">${dateLabel}</strong> at <strong style="color:#111111;">${timeLabel}</strong>${title ? ' for <strong style="color:#111111;">' + title + '</strong>' : ''}. Head to your portal to confirm this time, or request another one.</p>`,
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
