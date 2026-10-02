import { createClient } from '@supabase/supabase-js'

// Whether `email` belongs to an existing Supabase Auth account (i.e. someone
// who has actually signed up for the client portal) — used to decide whether
// a client-facing link should go to the login-gated portal or a public,
// no-login view. A clients1 CRM row is not a reliable signal here: studio can
// hand-add a client contact there without them ever creating an account.
// Fails closed (reports true, i.e. "has an account") if the service role key
// is missing or the lookup errors, so callers fall back to the existing
// portal-link behaviour rather than accidentally exposing a public link.
export async function emailHasAccount(email: string | null | undefined): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !email) return true
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    const target = email.trim().toLowerCase()
    let page = 1
    while (page <= 10) { // 10 * 1000 = up to 10,000 accounts, far beyond this app's scale
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error || !data) return true
      if (data.users.some(u => u.email?.toLowerCase() === target)) return true
      if (data.users.length < 1000) return false
      page++
    }
    return false
  } catch {
    return true
  }
}
