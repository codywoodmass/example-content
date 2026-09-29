import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

export async function POST(req: NextRequest) {
  const { category, clientName, clientEmail, title, details } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
  }

  const isCommercial = category === 'commercial'
  const notifTitle = isCommercial ? 'New project request' : 'New booking request'
  const notifMessage = `${clientName || clientEmail} sent a new ${isCommercial ? 'project request' : 'booking request'}${title ? ' — ' + title : ''}.`
  const bookingsUrl = new URL('/portal/studio#bookings', req.nextUrl.origin).toString()

  try {
    await supabase.from('notifications').insert([{
      user_email: STUDIO_EMAIL,
      type: 'new_booking_request',
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

  const detailRows = (details || [])
    .filter((d: any) => d.value)
    .map((d: any) => `<tr><td style="padding:6px 12px 6px 0;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">${d.label}</td><td style="padding:6px 0;font-size:13px;white-space:pre-wrap;">${String(d.value)}</td></tr>`)
    .join('')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: STUDIO_EMAIL,
        subject: `${notifTitle} — ${clientName || clientEmail}${title ? ': ' + title : ''}`,
        html: `
          <p><strong>${clientName || clientEmail}</strong> (${clientEmail}) sent a new ${isCommercial ? 'project request' : 'booking request'}${title ? ': <strong>' + title + '</strong>' : ''}.</p>
          <table style="border-collapse:collapse;margin:16px 0;">${detailRows}</table>
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
