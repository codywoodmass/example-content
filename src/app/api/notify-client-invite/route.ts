import { NextRequest, NextResponse } from 'next/server'
import { renderEmail } from '@/lib/emailTemplate'

// Studio inviting a brand-new client to set up their own portal account —
// distinct from notify-team-invite, which is an existing client adding a
// sub-user to their account. No DB write here, same email-only split as
// the rest of the notify-* routes; there's no invite row to create since
// the client just signs up normally once they click through.
export async function POST(req: NextRequest) {
  const { invitedEmail, invitedName } = await req.json()

  if (!invitedEmail) {
    return NextResponse.json({ error: 'Missing invitedEmail' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured' })
  }

  const signupUrl = new URL(`/signup?email=${encodeURIComponent(invitedEmail)}`, req.nextUrl.origin).toString()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: invitedEmail,
        subject: "You're invited to the Example Content client portal",
        html: renderEmail({
          heading: "You're<br/>invited.",
          intro: `Hi ${invitedName || 'there'},`,
          bodyHtml: `<p style="margin:0;">Example Content has set you up with your own client portal — book shoots, track projects, review deliverables and invoices, all in one place. Set up your account below to get started.</p>`,
          cta: { label: 'Set up my account', url: signupUrl },
          note: `If the button doesn't work, paste this link into your browser:<br>${signupUrl}`,
        }),
      }),
    })
    const emailData = await res.json()
    if (!res.ok) {
      console.error('Resend error:', emailData)
      return NextResponse.json({ success: true, emailSent: false, resendError: emailData })
    }
    return NextResponse.json({ success: true, emailSent: true })
  } catch (e) {
    console.error('Client invite email error:', e)
    return NextResponse.json({ success: true, emailSent: false })
  }
}
