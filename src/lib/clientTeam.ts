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
}): Promise<{ invite: any | null; error: string | null }> {
  const { accountEmail, invitedEmail, invitedName = '', invitedBy = null, source } = opts
  if (!accountEmail || !invitedEmail.trim()) return { invite: null, error: 'Missing account or invite email' }

  const token = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
  const { data: invite, error } = await supabase.from('client_invites').insert([{
    account_email: accountEmail,
    invited_email: invitedEmail.trim(),
    invited_name: invitedName.trim(),
    token,
    status: 'pending',
    invited_by: invitedBy,
  }]).select().single()
  if (error) return { invite: null, error: error.message }

  try {
    await fetch('/api/notify-team-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitedEmail: invitedEmail.trim(), invitedName: invitedName.trim(), accountEmail, invitedBy, token, source }),
    })
  } catch (e) {
    console.error('Invite notify error:', e)
  }

  return { invite, error: null }
}

export async function removeTeamMember(id: string) {
  return supabase.from('client_members').update({ status: 'removed' }).eq('id', id)
}

export async function revokeTeamInvite(id: string) {
  return supabase.from('client_invites').update({ status: 'revoked' }).eq('id', id)
}
