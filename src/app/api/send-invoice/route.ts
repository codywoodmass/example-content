import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireStudioUser } from '@/lib/xero'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const { invoiceId, clientEmail, clientName, items, subtotal, gst, total } = await req.json()

  if (!clientEmail) {
    return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 })
  }

  try {
    await supabase.from('notifications').insert([{
      user_email: clientEmail,
      type: 'invoice_sent',
      title: 'New invoice from Example Content',
      message: `Your invoice for $${(total || 0).toLocaleString()} is ready. View it in your client portal.`,
      project_id: null,
      read: false,
    }])
  } catch (e) {
    console.error('Notification insert error:', e)
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ success: true, emailSent: false, note: 'RESEND_API_KEY not configured — in-portal notification only' })
  }

  const lineRows = (items || []).map((i: any) => `<tr><td style="padding:6px 0;">${i.title}</td><td style="padding:6px 0;text-align:right;">$${(i.amount || 0).toLocaleString()}</td></tr>`).join('')

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Example Content <onboarding@resend.dev>',
        to: clientEmail,
        subject: `Invoice from Example Content — $${(total || 0).toLocaleString()}`,
        html: `
          <p>Hi ${clientName || ''},</p>
          <p>Your invoice from Example Content is ready:</p>
          <table style="width:100%;border-collapse:collapse;">${lineRows}</table>
          <p style="margin-top:16px;">Subtotal: $${(subtotal || 0).toLocaleString()}<br/>GST: $${(gst || 0).toLocaleString()}<br/><strong>Total: $${(total || 0).toLocaleString()}</strong></p>
          <p>View this invoice any time in your client portal.</p>
        `,
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
