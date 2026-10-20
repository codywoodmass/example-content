import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailHasAccount } from '@/lib/account'

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
        html: `
          <div style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0E1014;">
            <div style="background: linear-gradient(135deg, #1A1F28 0%, #14181F 100%); padding: 40px 40px 36px; text-align: center; border-radius: 10px 10px 0 0; border: 1px solid rgba(200,194,187,0.12); border-bottom: none;">
              <div style="font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(200,194,187,0.5); margin-bottom: 14px;">Example Content</div>
              <div style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.01em; line-height: 1.3;">Your quote is ready</div>
            </div>
            <div style="background: #14181F; padding: 36px 40px; border: 1px solid rgba(200,194,187,0.12); border-top: none;">
              <p style="font-size: 14px; color: #C8C2BB; line-height: 1.7; margin: 0 0 14px;">Hi ${clientName || 'there'},</p>
              <p style="font-size: 14px; color: #C8C2BB; line-height: 1.7; margin: 0 0 28px;">Your quote for <strong style="color: #ffffff;">${title}</strong> is ready to review. Click below to see the full breakdown and accept &mdash; no account needed.</p>
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${viewUrl}" style="display: inline-block; background: #C8C2BB; color: #111111; text-decoration: none; padding: 14px 36px; border-radius: 4px; font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;">Review your quote →</a>
              </div>
              <p style="font-size: 12px; color: rgba(200,194,187,0.5); line-height: 1.7; margin: 0; text-align: center;">This link is just for you — no account or password needed.</p>
            </div>
            <div style="text-align: center; padding: 22px; font-size: 11px; color: rgba(200,194,187,0.35);">Example Content · examplecontent.co.nz</div>
          </div>
        `,
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
