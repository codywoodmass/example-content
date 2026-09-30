import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { formatTime12 } from '@/lib/time'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

export async function POST(req: NextRequest) {
  const { clientName, clientEmail, title, proposedDate, proposedStartTime, message } = await req.json()

  const dateLabel = proposedDate ? new Date(`${proposedDate}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' }) : null
  const notifTitle = 'Client requested a different time'
  const notifMessage = `${clientName || clientEmail} asked for a different time${title ? ' for ' + title : ''}${dateLabel ? ' (was proposed ' + dateLabel + (proposedStartTime ? ' at ' + formatTime12(proposedStartTime) : '') + ')' : ''}.${message ? ' Note: "' + message + '"' : ''}`
  const bookingsUrl = new URL('/portal/studio#bookings', req.nextUrl.origin).toString()

  try {
    await supabase.from('notifications').insert([{
      user_email: STUDIO_EMAIL,
      type: 'alt_time_requested',
      title: notifTitle,
      message: notifMessage,
      project_id: null,
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
        subject: `${notifTitle} — ${clientName || clientEmail}${title ? ': ' + title : ''}`,
        html: `
          <p><strong>${clientName || clientEmail}</strong> (${clientEmail}) asked for a different time${title ? ' for <strong>' + title + '</strong>' : ''}.</p>
          ${dateLabel ? `<p>Previously proposed: <strong>${dateLabel}</strong>${proposedStartTime ? ' at <strong>' + formatTime12(proposedStartTime) + '</strong>' : ''}</p>` : ''}
          ${message ? `<p>Their note: <em>"${message}"</em></p>` : ''}
          <p><a href="${bookingsUrl}" style="display:inline-block;padding:10px 18px;background:#C8C2BB;color:#111;text-decoration:none;border-radius:4px;font-size:13px;">Open in studio portal →</a></p>
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
