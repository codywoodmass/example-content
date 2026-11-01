import { NextRequest, NextResponse } from 'next/server'

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
  const invitedByLabel = source === 'studio' ? 'Example Content' : (invitedBy || 'a teammate')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: invitedEmail,
        subject: `You've been added to ${accountEmail ? accountEmail + "'s" : 'a'} Example Content account`,
        html: `
          <p>${invitedByLabel} has given ${invitedName ? invitedName + ' (' + invitedEmail + ')' : invitedEmail} full access to their Example Content client portal account${accountEmail ? ' (' + accountEmail + ')' : ''}.</p>
          <p>Set a password to finish setting up your login:</p>
          <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 18px;background:#C8C2BB;color:#111;text-decoration:none;border-radius:4px;font-size:13px;">Set up my login →</a></p>
          <p style="color:#888;font-size:12px;">If the button doesn't work, paste this link into your browser: ${inviteUrl}</p>
        `,
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
