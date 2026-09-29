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
    await supabase.from('clients1').upsert([{
      email: user.email,
      name: meta.full_name || '',
      company: meta.company || '',
      phone: meta.phone || '',
      category: meta.category || 'Property',
    }], { onConflict: 'email', ignoreDuplicates: false })
  }
}