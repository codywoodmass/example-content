import { supabase } from '@/lib/supabase'

// Shared by the client portal's own "Invite a teammate" panel and the studio
// Clients page's "Team members" panel — either side can add a teammate to a
// client account. Doesn't create the login itself (this app only has the
// Supabase anon key, no service-role/admin API to do that server-side) — the
// invited person sets their own password via the emailed link at
// /invite/[token], same as any normal signup, just pre-scoped to this
// account via client_invites -> client_members.
export async function sendTeamInvite(opts: {
  accountEmail: string
  invitedEmail: string
  invitedName?: string
  invitedBy?: string | null
  source: 'client' | 'studio'
}): Promise<{ invite: any | null; error: string | null; emailSent: boolean }> {
  const { accountEmail, invitedEmail, invitedName = '', invitedBy = null, source } = opts
  if (!accountEmail || !invitedEmail.trim()) return { invite: null, error: 'Missing account or invite email', emailSent: false }

  // Supabase Auth always lowercases auth.users.email regardless of how
  // someone typed it at signup — storing the invite's email with whatever
  // casing the inviter happened to type would make the client portal's
  // later client_invites.invited_email === loginEmail lookup (which is
  // how a sub-user's login gets linked to the account on first real login)
  // silently never match.
  const normalizedEmail = invitedEmail.trim().toLowerCase()

  const token = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
  const { data: invite, error } = await supabase.from('client_invites').insert([{
    account_email: accountEmail,
    invited_email: normalizedEmail,
    invited_name: invitedName.trim(),
    token,
    status: 'pending',
    invited_by: invitedBy,
  }]).select().single()
  if (error) return { invite: null, error: error.message, emailSent: false }

  let emailSent = false
  try {
    const res = await fetch('/api/notify-team-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitedEmail: normalizedEmail, invitedName: invitedName.trim(), accountEmail, invitedBy, token, source }),
    })
    const data = await res.json()
    emailSent = !!data.emailSent
    if (!emailSent) console.error('Team invite email not sent:', data)
  } catch (e) {
    console.error('Invite notify error:', e)
  }

  return { invite, error: null, emailSent }
}

export async function removeTeamMember(id: string) {
  return supabase.from('client_members').update({ status: 'removed' }).eq('id', id)
}

export async function revokeTeamInvite(id: string) {
  return supabase.from('client_invites').update({ status: 'revoked' }).eq('id', id)
}
