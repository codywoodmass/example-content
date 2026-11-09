import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Removes a client's account and activity — login, profile, bookings, team
// members/invites they're party to, notifications, change requests — but
// deliberately leaves projects1 and invoices1 alone. Those are the business's
// own accounting/delivery records (GST/IRD retention, project history), not
// the client's personal data, and stay keyed by the same email string
// whether or not a live portal account exists behind it. Drive content is
// untouched too — this only ever removes database/portal records.
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const target = email.trim().toLowerCase()

  try {
    // Find the auth user by email — the admin API only supports listing
    // with pagination, not a direct email filter, so page through and match.
    // This client base is small enough that one large page comfortably
    // covers it.
    let authUserId: string | null = null
    let page = 1
    while (!authUserId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) { console.error('listUsers error:', error); break }
      const match = data.users.find(u => u.email?.toLowerCase() === target)
      if (match) { authUserId = match.id; break }
      if (data.users.length < 1000) break
      page++
    }

    if (authUserId) {
      const { error: authError } = await admin.auth.admin.deleteUser(authUserId)
      if (authError) console.error('Auth user delete error:', authError)
      const { error: profileError } = await admin.from('profiles').delete().eq('id', authUserId)
      if (profileError) console.error('Profile delete error:', profileError)
    }

    const results = await Promise.all([
      admin.from('client_members').delete().or(`account_email.ilike.${target},member_email.ilike.${target}`),
      admin.from('client_invites').delete().or(`account_email.ilike.${target},invited_email.ilike.${target}`),
      admin.from('bookings1').delete().ilike('client_email', target),
      admin.from('notifications').delete().ilike('user_email', target),
      admin.from('change_requests').delete().ilike('client_email', target),
    ])
    for (const r of results) if (r.error) console.error('Related-row delete error:', r.error)

    const { error: clientError } = await admin.from('clients1').delete().ilike('email', target)
    if (clientError) {
      console.error('clients1 delete error:', clientError)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, authUserDeleted: !!authUserId })
  } catch (e: any) {
    console.error('Delete client error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
