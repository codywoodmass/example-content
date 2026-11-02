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
  const invitedByLabel = source === 'studio' ? 'Example Content' : (invitedBy || 'A teammate')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: invitedEmail,
        subject: `You've been invited to the Example Content portal`,
        html: `
          <div style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0E1014;">
            <div style="background: linear-gradient(135deg, #1A1F28 0%, #14181F 100%); padding: 40px 40px 36px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid rgba(200,194,187,0.12); border-bottom: none;">
              <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(200,194,187,0.5); margin-bottom: 14px;">Example Content</div>
              <div style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; line-height: 1.3;">You're invited</div>
            </div>
            <div style="background: #14181F; padding: 36px 40px; border: 1px solid rgba(200,194,187,0.12); border-top: none;">
              <p style="font-size: 14px; color: #C8C2BB; line-height: 1.7; margin: 0 0 14px;">Hi ${invitedName || 'there'},</p>
              <p style="font-size: 14px; color: #C8C2BB; line-height: 1.7; margin: 0 0 28px;">${invitedByLabel} has given you full access to${accountEmail ? ' <strong style="color: #ffffff;">' + accountEmail + '</strong>’s' : ' their'} Example Content client portal account — the same projects, bookings and invoices they see, under your own login. Set a password below to finish setting up.</p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${inviteUrl}" style="display: inline-block; background: #C8C2BB; color: #111111; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;">Set up my login →</a>
              </div>
              <p style="font-size: 12px; color: rgba(200,194,187,0.5); line-height: 1.7; margin: 0; text-align: center;">If the button doesn't work, paste this link into your browser:<br>${inviteUrl}</p>
            </div>
            <div style="text-align: center; padding: 22px; font-size: 11px; color: rgba(200,194,187,0.35);">Example Content · examplecontent.co.nz</div>
          </div>
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
