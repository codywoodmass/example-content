import { NextRequest, NextResponse } from 'next/server'
import { renderEmail } from '@/lib/emailTemplate'

const STUDIO_EMAIL = 'cody@examplecontent.co.nz'

export async function POST(req: NextRequest) {
  const { name, email, phone, projectType, message } = await req.json()
  if (!name || !email || !message) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured' })

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: STUDIO_EMAIL,
        reply_to: email,
        subject: `New enquiry from ${name}${projectType ? ' — ' + projectType : ''}`,
        html: renderEmail({
          heading: 'New website<br/>enquiry.',
          bodyHtml: `
            <p style="margin:0 0 10px;"><strong style="color:#111111;">${name}</strong> (${email}${phone ? ', ' + phone : ''}) sent a message via the website contact form.</p>
            ${projectType ? `<p style="margin:0 0 10px;"><strong style="color:#111111;">Project type:</strong> ${projectType}</p>` : ''}
            <p style="white-space:pre-wrap;margin:0;">${message}</p>
          `,
        }),
      }),
    })
    if (!res.ok) { console.error('Resend error:', await res.json()); return NextResponse.json({ success: true, emailSent: false }) }
    return NextResponse.json({ success: true, emailSent: true })
  } catch (e) {
    console.error('Contact email error:', e)
    return NextResponse.json({ success: true, emailSent: false })
  }
}
