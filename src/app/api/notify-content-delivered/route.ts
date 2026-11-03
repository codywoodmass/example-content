import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailHasAccount } from '@/lib/account'
import { renderEmail } from '@/lib/emailTemplate'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  const { projectId, projectTitle, clientName, clientEmail, createdByEmail } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
  }

  // The in-app notification still goes out under the account's own email
  // (clientEmail) — both the account owner and any teammate resolve to that
  // same email when they load the portal, so one row there already reaches
  // everyone on the account. The actual email, though, goes specifically to
  // whoever made this booking (createdByEmail) when that's known, rather
  // than always the main account holder — falls back to clientEmail for
  // projects created before this was tracked, or created by the studio
  // directly rather than from a client booking.
  const emailTarget = createdByEmail || clientEmail

  const title = projectTitle || 'your project'
  // A client with an existing portal account gets the normal login-gated
  // link; a client who was only ever added as an email on the project (no
  // account) gets a public, no-login viewer for this specific delivery.
  const hasAccount = await emailHasAccount(emailTarget)
  const viewUrl = hasAccount
    ? new URL('/portal/client', req.nextUrl.origin).toString()
    : new URL(`/view/${projectId}`, req.nextUrl.origin).toString()

  if (hasAccount) {
    try {
      await supabase.from('notifications').insert([{
        user_email: clientEmail,
        type: 'content_delivered',
        title: 'Your content is ready',
        message: `Your content for ${title} has been delivered. Click to view your files.`,
        project_id: projectId || null,
        read: false,
      }])
    } catch (e) {
      console.error('Notification insert error:', e)
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, hasAccount, note: 'RESEND_API_KEY not configured — in-portal notification only' })
  }

  const viewCopy = hasAccount
    ? 'Your content for <strong style="color:#111111;">' + title + '</strong> has been delivered and is ready to view in your portal.'
    : 'Your content for <strong style="color:#111111;">' + title + '</strong> has been delivered. Click below to view, preview and download your files — no account needed.'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: emailTarget,
        subject: `Your content is ready — ${title}`,
        html: renderEmail({
          heading: 'Your content<br/>is ready.',
          intro: `Hi ${clientName || 'there'},`,
          bodyHtml: `<p style="margin:0;">${viewCopy}</p>`,
          cta: { label: 'View your content', url: viewUrl },
          note: hasAccount ? 'You can view, preview and download your files any time from your Example Content portal.' : 'No account or password needed — this link is just for you.',
        }),
      }),
    })
    const emailData = await res.json()
    if (!res.ok) {
      console.error('Resend error:', emailData)
      return NextResponse.json({ success: true, emailSent: false, hasAccount, error: emailData })
    }
    return NextResponse.json({ success: true, emailSent: true, hasAccount })
  } catch (e) {
    console.error('Email send error:', e)
    return NextResponse.json({ success: true, emailSent: false, hasAccount })
  }
}
