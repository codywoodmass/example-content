import { NextRequest, NextResponse } from 'next/server'
import { renderEmail } from '@/lib/emailTemplate'

// Fires when a client adds supplementary details/files to a pending or
// confirmed booking — always goes to Cody specifically, not a shared studio
// inbox, since this is the one notification type studio asked to have
// routed to them personally rather than left in the shared queue.
export async function POST(req: NextRequest) {
  const { clientName, title, text, fileCount, projectId } = await req.json()

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — in-portal notification only' })
  }

  const portalUrl = projectId
    ? new URL(`/portal/studio/projects?open=${projectId}`, req.nextUrl.origin).toString()
    : new URL('/portal/studio#bookings', req.nextUrl.origin).toString()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: 'cody@examplecontent.co.nz',
        subject: `${clientName || 'A client'} added more details${title ? ' — ' + title : ''}`,
        html: renderEmail({
          heading: 'New details<br/>added.',
          bodyHtml: `<p style="margin:0;"><strong style="color:#111111;">${clientName || 'A client'}</strong> just added more details to <strong style="color:#111111;">${title || 'their booking'}</strong>${fileCount ? `, including ${fileCount} file${fileCount > 1 ? 's' : ''}` : ''}.</p>` +
            (text ? `<div style="margin-top:16px; padding:14px 16px; background:#faf9f7; border-radius:4px; font-size:13px; color:#3a362f; white-space:pre-wrap;">${text}</div>` : ''),
          cta: { label: 'View in studio', url: portalUrl },
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
