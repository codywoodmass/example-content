import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailHasAccount } from '@/lib/account'
import { renderEmail } from '@/lib/emailTemplate'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  const { briefId, projectName, clientName, clientEmail } = await req.json()
  if (!clientEmail) return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })

  const title = projectName || 'your project'
  const hasAccount = await emailHasAccount(clientEmail)
  const viewUrl = hasAccount
    ? new URL('/portal/client', req.nextUrl.origin).toString()
    : new URL(`/brief/${briefId}`, req.nextUrl.origin).toString()

  if (hasAccount) {
    // Known client: same as before, an in-app notification is enough since
    // they can log in to see it.
    try {
      await supabase.from('notifications').insert([{
        user_email: clientEmail,
        type: 'brief_ready',
        title: 'Your production brief is ready',
        message: `Your brief for ${title} is ready to review and approve.`,
        read: false,
      }])
    } catch (e) {
      console.error('Notification insert error:', e)
    }
    return NextResponse.json({ success: true, hasAccount, emailSent: false })
  }

  // No account: an in-app notification would never be seen, so this has to
  // be an actual email with a public, no-login link to the brief.
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, hasAccount, emailSent: false, note: 'RESEND_API_KEY not configured' })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: clientEmail,
        subject: `Your production brief is ready — ${title}`,
        html: renderEmail({
          heading: 'Your brief<br/>is ready.',
          intro: `Hi ${clientName || 'there'},`,
          bodyHtml: `<p style="margin:0;">Your production brief for <strong style="color:#111111;">${title}</strong> is ready to review and approve.</p>`,
          cta: { label: 'Review your brief', url: viewUrl },
          note: 'No account or password needed — this link is just for you.',
        }),
      }),
    })
    const emailData = await res.json()
    if (!res.ok) {
      console.error('Resend error:', emailData)
      return NextResponse.json({ success: true, hasAccount, emailSent: false, error: emailData })
    }
    return NextResponse.json({ success: true, hasAccount, emailSent: true })
  } catch (e) {
    console.error('Email send error:', e)
    return NextResponse.json({ success: true, hasAccount, emailSent: false })
  }
}
