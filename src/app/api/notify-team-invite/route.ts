import { NextRequest, NextResponse } from 'next/server'
import { renderEmail } from '@/lib/emailTemplate'

// Sends the invited teammate their signup link. No DB write here — the
// client_invites row is already created by the caller (client portal or
// studio Clients page) before this fires; this route is email-only, same
// split as the rest of the notify-* routes.
export async function POST(req: NextRequest) {
  const { invitedEmail, invitedName, accountEmail, invitedBy, token, source } = await req.json()

  if (!invitedEmail || !token) {
    return NextResponse.json({ error: 'Missing invitedEmail or token' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — invite link only available from the invites list' })
  }

  const inviteUrl = new URL(`/invite/${token}`, req.nextUrl.origin).toString()
  const invitedByLabel = source === 'studio' ? 'Example Content' : (invitedBy || 'A teammate')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: invitedEmail,
        subject: `You've been invited to the Example Content portal`,
        html: renderEmail({
          heading: "You're<br/>invited.",
          intro: `Hi ${invitedName || 'there'},`,
          bodyHtml: `<p style="margin:0;">${invitedByLabel} has given you full access to${accountEmail ? ' <strong style="color:#111111;">' + accountEmail + '</strong>’s' : ' their'} Example Content client portal account — the same projects, bookings and invoices they see, under your own login. Set a password below to finish setting up.</p>`,
          cta: { label: 'Set up my login', url: inviteUrl },
          note: `If the button doesn't work, paste this link into your browser:<br>${inviteUrl}`,
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
    console.error('Team invite email error:', e)
    return NextResponse.json({ success: true, emailSent: false })
  }
}
