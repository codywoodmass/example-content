import { NextRequest, NextResponse } from 'next/server'
import { formatTime12 } from '@/lib/time'

export async function POST(req: NextRequest) {
  const { clientEmail, clientName, title, date, startTime, endTime } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
  }

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
        to: clientEmail,
        subject: `A time has been proposed${title ? ' for ' + title : ''}`,
        html: `
          <p>Hi ${clientName || 'there'},</p>
          <p>We'd like to propose <strong>${dateLabel}</strong> at <strong>${timeLabel}</strong>${title ? ' for <strong>' + title + '</strong>' : ''}.</p>
          <p>Head to your portal to confirm this time, or request another one.</p>
          <p><a href="${portalUrl}" style="display:inline-block;padding:10px 18px;background:#C8C2BB;color:#111;text-decoration:none;border-radius:4px;font-size:13px;">Open portal →</a></p>
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
