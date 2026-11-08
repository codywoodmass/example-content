import { NextRequest, NextResponse } from 'next/server'
import { renderEmail } from '@/lib/emailTemplate'

// Fires once, the first time a brand-new account's profiles row is created
// — self-signup via /signup, or a studio "+ Invite Client" invite once the
// person actually completes it. Always goes to Cody directly, same as the
// other personally-routed notification types.
export async function POST(req: NextRequest) {
  const { name, email, company, category, kind, accountEmail } = await req.json()

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — in-portal notification only' })
  }

  const portalUrl = new URL('/portal/studio/clients', req.nextUrl.origin).toString()
  const isTeamMember = kind === 'team_member'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: 'cody@examplecontent.co.nz',
        subject: isTeamMember ? `${name || email} joined ${accountEmail || 'a client'}'s team` : `New client: ${name || email}`,
        html: renderEmail({
          heading: isTeamMember ? 'New team<br/>member.' : 'New client<br/>signed up.',
          bodyHtml: isTeamMember
            ? `<p style="margin:0;"><strong style="color:#111111;">${name || email}</strong> (${email}) just joined <strong style="color:#111111;">${accountEmail || 'an account'}</strong>'s team.</p>`
            : `<p style="margin:0;"><strong style="color:#111111;">${name || email}</strong> just completed signup.</p>` +
              `<ul style="margin:12px 0 0; padding-left:18px; color:#3a362f;">` +
              `<li>Email: ${email}</li>` +
              (company ? `<li>Company: ${company}</li>` : '') +
              (category ? `<li>Category: ${category}</li>` : '') +
              `</ul>`,
          cta: { label: 'View client', url: portalUrl },
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
