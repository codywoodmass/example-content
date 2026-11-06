import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Creates a profiles row (role: client) and a matching clients1 CRM record
// the first time a client account is seen with no profile yet — covers both
// self-signup (after email confirmation) and any account created by hand.
export async function ensureClientProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, any> }) {
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (existing) return
  const meta = user.user_metadata || {}
  await supabase.from('profiles').insert([{
    id: user.id,
    role: 'client',
    full_name: meta.full_name || '',
    company: meta.company || '',
    phone: meta.phone || '',
  }])
  if (user.email) {
    // The Agency field only ever gives us a known agency's id, or (for
    // "Other...") a free-typed name — resolve that to a row now that a
    // real session exists to query/insert with, rather than at signup
    // time when there isn't one yet.
    let agencyId: string | null = meta.agency_id || null
    if (!agencyId && meta.agency_name) {
      const name = String(meta.agency_name).trim()
      if (name) {
        const { data: existingAgency } = await supabase.from('agencies').select('id').ilike('name', name).maybeSingle()
        if (existingAgency) {
          agencyId = existingAgency.id
        } else {
          const { data: newAgency } = await supabase.from('agencies').insert([{ name }]).select('id').single()
          agencyId = newAgency?.id || null
        }
      }
    }
    await supabase.from('clients1').upsert([{
      email: user.email,
      name: meta.full_name || '',
      company: meta.company || '',
      phone: meta.phone || '',
      category: meta.category || 'Property',
      agency_id: agencyId,
      // Picked (optionally) at signup and carried through as auth
      // user_metadata, since no session exists yet at that point to
      // write it to the row directly.
      avatar_url: meta.avatar_url || null,
      // Flips a studio-invited 'invited' placeholder row (see the Clients
      // page's "+ Invite Client") over to a real client the moment they
      // actually sign up.
      status: 'active',
    }], { onConflict: 'email', ignoreDuplicates: false })
  }
}