import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailHasAccount } from '@/lib/account'
import { renderEmail } from '@/lib/emailTemplate'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  const { quoteId, projectName, clientName, clientEmail } = await req.json()
  if (!clientEmail) return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })

  const title = projectName || 'your project'
  const hasAccount = await emailHasAccount(clientEmail)
  // Unlike briefs, there's no in-portal view of a quote, so the public
  // /quote/[id] link is how the client actually sees and accepts it —
  // always email it, even to clients with a portal account.
  const viewUrl = new URL(`/quote/${quoteId}`, req.nextUrl.origin).toString()

  if (hasAccount) {
    try {
      await supabase.from('notifications').insert([{
        user_email: clientEmail,
        type: 'quote_ready',
        title: 'Your quote is ready',
        message: `Your quote for ${title} is ready to review and accept.`,
        read: false,
      }])
    } catch (e) {
      console.error('Notification insert error:', e)
    }
  }

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
        subject: `Your quote is ready — ${title}`,
        html: renderEmail({
          heading: 'Your quote<br/>is ready.',
          intro: `Hi ${clientName || 'there'},`,
          bodyHtml: `<p style="margin:0;">Your quote for <strong style="color:#111111;">${title}</strong> is ready to review — full breakdown, scope and pricing, ready to accept with one click.</p>`,
          cta: { label: 'Review your quote', url: viewUrl },
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
