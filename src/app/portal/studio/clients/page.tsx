'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'
import { notify, ToastHost, confirmDialog } from '@/lib/notify'
import { stageLabel } from '@/lib/stages'
import { sendTeamInvite, removeTeamMember, revokeTeamInvite } from '@/lib/clientTeam'

type Client = {
  id: string
  created_at: string
  user_id: string
  name: string
  email: string
  phone: string
  company: string
  category: string
  notes: string
  agency_id: string | null
  status: string
}

type Agency = { id: string; name: string }

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  // Guards against a slower earlier request resolving after a faster later
  // one and overwriting the right client's data with a stale client's.
  const loadRequestId = useRef(0)
  const [clientBookings, setClientBookings] = useState<any[]>([])
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [clientBriefs, setClientBriefs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', company: '', category: 'Property', notes: '', agency_id: '' })
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [studioEmail, setStudioEmail] = useState<string | null>(null)
  const [clientTeamMembers, setClientTeamMembers] = useState<{ id: string; member_email: string; member_name: string }[]>([])
  const [clientTeamInvites, setClientTeamInvites] = useState<{ id: string; invited_email: string; invited_name: string }[]>([])
  const [teamInviteName, setTeamInviteName] = useState('')
  const [teamInviteEmail, setTeamInviteEmail] = useState('')
  const [sendingTeamInvite, setSendingTeamInvite] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setStudioEmail(session?.user?.email || null))
  }, [])

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  useEffect(() => { loadClients(); loadAgencies() }, [])

  async function loadAgencies() {
    const { data } = await supabase.from('agencies').select('id, name').order('name', { ascending: true })
    setAgencies(data || [])
  }

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clients1').select('*').order('created_at', { ascending: false })
    if (!error && data) setClients(data)
    setLoading(false)
  }

  async function loadClientDetails(client: Client) {
    const requestId = ++loadRequestId.current
    setSelectedClient(client)
    // Cleared up front, not just overwritten once the fetches below resolve —
    // otherwise the previous client's team invites/members/bookings stay on
    // screen (under the new client's name) for the moment it takes the new
    // client's own data to load, which looked like someone else's pending
    // invite flashing on screen.
    setClientBookings([])
    setClientProjects([])
    setClientBriefs([])
    setClientTeamMembers([])
    setClientTeamInvites([])
    const [{ data: bookings }, { data: projects }, { data: briefs }, { data: members }, { data: invites }] = await Promise.all([
      supabase.from('bookings1').select('*').eq('client_email', client.email).order('created_at', { ascending: false }),
      supabase.from('projects1').select('*').eq('email', client.email).order('created_at', { ascending: false }),
      supabase.from('briefs').select('*').eq('client_email', client.email).order('created_at', { ascending: false }),
      supabase.from('client_members').select('*').eq('account_email', client.email).eq('status', 'active').order('created_at', { ascending: true }),
      supabase.from('client_invites').select('*').eq('account_email', client.email).eq('status', 'pending').order('created_at', { ascending: true }),
    ])
    // A faster, more recent click already landed — this response is for a
    // client that's no longer the one being viewed, so don't let it clobber
    // the right data on screen.
    if (requestId !== loadRequestId.current) return
    if (briefs) setClientBriefs(briefs)
    if (bookings) setClientBookings(bookings)
    if (projects) setClientProjects(projects)
    setClientTeamMembers(members || [])
    setClientTeamInvites(invites || [])
    setTeamInviteName('')
    setTeamInviteEmail('')
  }

  async function handleSendTeamInvite() {
    if (!selectedClient || !teamInviteEmail.trim()) return
    setSendingTeamInvite(true)
    try {
      const { invite, error, emailSent } = await sendTeamInvite({ accountEmail: selectedClient.email, invitedEmail: teamInviteEmail, invitedName: teamInviteName, invitedBy: studioEmail, source: 'studio' })
      if (error) { notify('Error sending invite: ' + error, 'error'); return }
      if (invite) setClientTeamInvites(p => [...p, invite])
      notify(emailSent ? `Invite sent to ${teamInviteEmail.trim()}.` : 'Invite created, but the email failed to send — check Resend is configured.', emailSent ? 'success' : 'error')
      setTeamInviteName('')
      setTeamInviteEmail('')
    } finally {
      setSendingTeamInvite(false)
    }
  }

  async function handleRemoveTeamMember(id: string) {
    if (!(await confirmDialog('Remove this teammate\'s access to the account?'))) return
    setClientTeamMembers(p => p.filter(m => m.id !== id))
    await removeTeamMember(id)
  }

  async function handleRevokeTeamInvite(id: string) {
    setClientTeamInvites(p => p.filter(i => i.id !== id))
    await revokeTeamInvite(id)
  }

  async function saveClient() {
    if (!selectedClient) return
    setSaving(true)
    const { error } = await supabase.from('clients1').update({
      name: selectedClient.name,
      email: selectedClient.email,
      phone: selectedClient.phone,
      company: selectedClient.company,
      category: selectedClient.category,
      notes: selectedClient.notes,
      agency_id: selectedClient.agency_id || null,
    }).eq('id', selectedClient.id)
    if (!error) {
      setClients(p => p.map(c => c.id === selectedClient.id ? selectedClient : c))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  async function addClient() {
    if (!newForm.name || !newForm.email) return
    setSaving(true)
    const { data, error } = await supabase.from('clients1').insert([{ ...newForm, agency_id: newForm.agency_id || null }]).select().single()
    if (error) { notify('Error: ' + error.message, 'error'); setSaving(false); return }
    if (!error && data) {
      setClients(p => [data, ...p])
      setShowNewModal(false)
      setNewForm({ name: '', email: '', phone: '', company: '', category: 'Property', notes: '', agency_id: '' })
      loadClientDetails(data)
    }
    setSaving(false)
  }

  // A clients1 row is created with status 'invited' right away (rather than
  // waiting for them to actually sign up) so the studio can see who's been
  // invited and hasn't come back yet. ensureClientProfile's upsert flips it
  // to 'active' and fills in the real details the moment they do sign up.
  async function sendClientInvite() {
    const email = inviteEmail.trim()
    if (!email) return
    setSendingInvite(true)
    try {
      const { data: existing } = await supabase.from('clients1').select('*').ilike('email', email).maybeSingle()
      if (existing && existing.status !== 'invited') {
        notify(`${existing.name || email} is already a client.`, 'error')
        setSendingInvite(false)
        return
      }
      const res = await fetch('/api/notify-client-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitedEmail: email, invitedName: inviteName.trim() }),
      })
      const data = await res.json()
      if (!data.emailSent) {
        notify('Could not send the invite email — check Resend is configured.', 'error')
        setSendingInvite(false)
        return
      }
      if (existing) {
        // Re-inviting someone who hasn't signed up yet — just refresh the
        // name if one was given this time, no duplicate row.
        if (inviteName.trim() && inviteName.trim() !== existing.name) {
          await supabase.from('clients1').update({ name: inviteName.trim() }).eq('id', existing.id)
          setClients(p => p.map(c => c.id === existing.id ? { ...c, name: inviteName.trim() } : c))
        }
      } else {
        const { data: created, error } = await supabase.from('clients1').insert([{
          name: inviteName.trim(), email, phone: '', company: '', category: '', notes: '', agency_id: null, status: 'invited',
        }]).select().single()
        if (error) { notify('Invite sent, but could not save it to the client list: ' + error.message, 'error'); setSendingInvite(false); return }
        if (created) setClients(p => [created, ...p])
      }
      notify(`Invite sent to ${email}.`, 'success')
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteName('')
    } catch (e: any) {
      notify('Error sending invite: ' + e.message, 'error')
    }
    setSendingInvite(false)
  }

  async function resendClientInvite(client: Client) {
    setSendingInvite(true)
    try {
      const res = await fetch('/api/notify-client-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitedEmail: client.email, invitedName: client.name }),
      })
      const data = await res.json()
      notify(data.emailSent ? `Invite resent to ${client.email}.` : 'Could not send the invite email — check Resend is configured.', data.emailSent ? 'success' : 'error')
    } catch (e: any) {
      notify('Error sending invite: ' + e.message, 'error')
    }
    setSendingInvite(false)
  }

  async function cancelClientInvite(client: Client) {
    if (!(await confirmDialog(`Cancel the invite to ${client.email}? This removes them from the client list until invited again.`))) return
    const { error } = await supabase.from('clients1').delete().eq('id', client.id)
    if (error) { notify('Error: ' + error.message, 'error'); return }
    setClients(p => p.filter(c => c.id !== client.id))
    setSelectedClient(null)
  }

  const filtered = clients.filter(c => {
    const matchesCat = filterCat === 'All' || c.category === filterCat
    const matchesSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
    'Pre-Production': { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)' },
    'Shooting': { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)' },
    'Post-Production': { color: 'rgba(160,100,220,0.9)', bg: 'rgba(50,25,80,0.4)' },
    'Revisions': { color: 'rgba(220,120,60,0.9)', bg: 'rgba(80,35,15,0.4)' },
    'Awaiting Confirmation': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' },
    'Completed': { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.6)' },
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Geist, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <StudioSidebar active="clients" />
      <div className="ec-studio-main ec-split-pane" style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh', minWidth: 0 }}>

        {/* CLIENT LIST */}
        <div className="ec-split-list" style={{ width: 300, borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
          <div style={{ padding: '16px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Clients</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setShowInviteModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: 'transparent', color: '#C8C2BB', border: '0.5px solid rgba(200,194,187,0.25)', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ Invite Client</button>
                <button onClick={() => setShowNewModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New</button>
              </div>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." style={{ ...inp, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'Property', 'Commercial', 'Events'].map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 3, border: `0.5px solid ${filterCat === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: filterCat === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: filterCat === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 20, color: 'rgba(200,194,187,0.25)', fontSize: 12 }}>No clients yet</div>}
            {filtered.map(client => (
              <div key={client.id} onClick={() => loadClientDetails(client)} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer', background: selectedClient?.id === client.id ? 'rgba(200,194,187,0.05)' : 'transparent', borderLeft: `2px solid ${selectedClient?.id === client.id ? '#C8C2BB' : 'transparent'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: client.status === 'invited' ? 'rgba(200,194,187,0.6)' : '#C8C2BB' }}>{client.name || client.email}</div>
                  {client.status === 'invited' ? (
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: 'rgba(210,175,80,0.12)', color: 'rgba(210,175,80,0.85)' }}>Invited</span>
                  ) : client.category && (
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 2, background: client.category === 'Property' ? 'rgba(100,150,220,0.15)' : 'rgba(160,100,220,0.15)', color: client.category === 'Property' ? 'rgba(100,150,220,0.8)' : 'rgba(160,100,220,0.8)' }}>{client.category}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{client.email}</div>
                {client.company && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', marginTop: 2 }}>{client.company}</div>}
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 18px', borderTop: '0.5px solid rgba(200,194,187,0.09)', fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>{filtered.length} client{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {/* CLIENT DETAIL */}
        {!selectedClient ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'rgba(200,194,187,0.2)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 13 }}>Select a client to view details</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selectedClient.name || selectedClient.email}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selectedClient.status === 'invited' ? 'Invited' : (selectedClient.category || 'No category') + ' client'}{selectedClient.company ? ` · ${selectedClient.company}` : ''}</div>
              </div>
              {selectedClient.status === 'invited' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => resendClientInvite(selectedClient)} disabled={sendingInvite} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{sendingInvite ? 'Sending...' : 'Resend invite'}</button>
                  <button onClick={() => cancelClientInvite(selectedClient)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel invite</button>
                </div>
              ) : (
                <button onClick={saveClient} disabled={saving} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: saved ? 'rgba(100,200,130,0.2)' : '#C8C2BB', color: saved ? 'rgba(100,200,130,0.9)' : '#111', border: saved ? '0.5px solid rgba(100,200,130,0.4)' : 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
                  {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save changes'}
                </button>
              )}
            </div>
            {selectedClient.status === 'invited' && (
              <div style={{ margin: '18px 28px 0', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.25)', borderRadius: 7, padding: '12px 16px', fontSize: 12, color: 'rgba(210,175,80,0.9)', lineHeight: 1.6 }}>
                Invited {new Date(selectedClient.created_at).toLocaleDateString()} — hasn't signed up yet. Everything below fills in automatically once they do.
              </div>
            )}
            <div style={{ padding: 28 }}>
              {(() => {
                const confirmed = clientBookings.filter((b: any) => b.status === 'confirmed')
                const totalSpend = confirmed.reduce((sum: number, b: any) => {
                  const match = b.total?.match(/\$([\d,]+)/)
                  return sum + (match ? parseInt(match[1].replace(',', '')) : 0)
                }, 0)
                const packages = clientBookings.map((b: any) => b.shoot_package).filter(Boolean)
                const topPackage = packages.length > 0 ? packages.sort((a: string, b: string) => packages.filter((p: string) => p === b).length - packages.filter((p: string) => p === a).length)[0] : null
                const deliverablesList = clientBookings.map((b: any) => b.deliverables).filter(Boolean)
                const topDeliverable = deliverablesList.length > 0 ? deliverablesList[0] : null
                if (!totalSpend && !topPackage) return null
                return (
                  <div className="ec-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Total spend</div>
                      <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(100,200,130,0.9)', marginBottom: 4 }}>${totalSpend.toLocaleString()}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{confirmed.length} confirmed + GST</div>
                    </div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Most booked package</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{topPackage || '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{packages.filter((p: string) => p === topPackage).length}x booked</div>
                    </div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Most requested</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{topDeliverable || '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>Deliverable package</div>
                    </div>
                  </div>
                )
              })()}
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Client details</div>
                <div className="ec-form-grid-2" style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><label style={lbl}>Full name</label><input style={inp} value={selectedClient.name || ''} onChange={e => setSelectedClient(p => p ? { ...p, name: e.target.value } : p)} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} value={selectedClient.email || ''} onChange={e => setSelectedClient(p => p ? { ...p, email: e.target.value } : p)} /></div>
                  <div><label style={lbl}>Phone</label><input style={inp} value={selectedClient.phone || ''} onChange={e => setSelectedClient(p => p ? { ...p, phone: e.target.value } : p)} placeholder="e.g. 021 123 4567" /></div>
                  <div><label style={lbl}>Company / agency</label><input style={inp} value={selectedClient.company || ''} onChange={e => setSelectedClient(p => p ? { ...p, company: e.target.value } : p)} placeholder="e.g. Blackwell Properties" /></div>
                  <div><label style={lbl}>Category</label>
                    <select style={inp} value={selectedClient.category} onChange={e => setSelectedClient(p => p ? { ...p, category: e.target.value } : p)}>
                      <option>Property</option><option>Commercial</option><option>Events</option><option>Socials</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Agency — groups property invoices</label>
                    <select style={inp} value={selectedClient.agency_id || ''} onChange={e => setSelectedClient(p => p ? { ...p, agency_id: e.target.value || null } : p)}>
                      <option value="">No agency — invoiced individually</option>
                      {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ padding: '0 18px 18px' }}>
                  <label style={lbl}>Notes</label>
                  <textarea value={selectedClient.notes || ''} onChange={e => setSelectedClient(p => p ? { ...p, notes: e.target.value } : p)} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 80 }} placeholder="Client preferences, working style, important notes..." />
                </div>
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Team members — full access to this account</div>
                <div style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#C8C2BB' }}>{selectedClient.name || selectedClient.email} <span style={{ color: 'rgba(200,194,187,0.35)', fontWeight: 400 }}>— main account</span></div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{selectedClient.email}</div>
                  </div>
                </div>
                {clientTeamMembers.map(m => (
                  <div key={m.id} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#C8C2BB' }}>{m.member_name || m.member_email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{m.member_email}</div>
                    </div>
                    <button onClick={() => handleRemoveTeamMember(m.id)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                  </div>
                ))}
                {clientTeamInvites.map(inv => (
                  <div key={inv.id} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#C8C2BB' }}>{inv.invited_name || inv.invited_email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(210,175,80,0.7)' }}>{inv.invited_email} · awaiting acceptance</div>
                    </div>
                    <button onClick={() => handleRevokeTeamInvite(inv.id)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Revoke</button>
                  </div>
                ))}
                <div style={{ padding: 18, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  <input value={teamInviteName} onChange={e => setTeamInviteName(e.target.value)} placeholder="Name" style={{ ...inp, flex: '1 1 140px', width: 'auto' }} />
                  <input type="email" value={teamInviteEmail} onChange={e => setTeamInviteEmail(e.target.value)} placeholder="their.email@company.com" style={{ ...inp, flex: '2 1 200px', width: 'auto' }} />
                  <button disabled={sendingTeamInvite || !teamInviteEmail.trim()} onClick={handleSendTeamInvite} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 14px', borderRadius: 3, background: teamInviteEmail.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: teamInviteEmail.trim() ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: teamInviteEmail.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit', flexShrink: 0 }}>{sendingTeamInvite ? 'Sending...' : '+ Invite'}</button>
                </div>
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Projects</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{clientProjects.length} project{clientProjects.length !== 1 ? 's' : ''}</span>
                </div>
                {clientProjects.length === 0 ? (
                  <div style={{ padding: '20px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No projects yet</div>
                ) : clientProjects.map((p: any, i: number) => {
                  const sc = STAGE_COLORS[p.stage] || { color: '#C8C2BB', bg: 'rgba(200,194,187,0.1)' }
                  return (
                    <div key={p.id} onClick={() => router.push(`/portal/studio/projects/${p.id}`)} style={{ padding: '12px 18px', borderBottom: i < clientProjects.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.shoot_date ? new Date(p.shoot_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No shoot date'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 60, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${p.progress}%`, background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color }}>{stageLabel(p.stage)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Briefs</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{clientBriefs.length} brief{clientBriefs.length !== 1 ? 's' : ''}</span>
                </div>
                {clientBriefs.length === 0 ? (
                  <div style={{ padding: '20px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No briefs yet</div>
                ) : clientBriefs.map((b: any, i: number) => {
                  const statusColors: Record<string,{c:string,bg:string}> = { draft:{c:'rgba(200,194,187,0.5)',bg:'rgba(200,194,187,0.1)'}, sent:{c:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, approved:{c:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'} }
                  const sc = statusColors[b.status] || statusColors.draft
                  return (
                    <div key={b.id} onClick={() => router.push('/portal/studio/pitches')} style={{ padding:'12px 18px', borderBottom: i < clientBriefs.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none', display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.project_name || 'Untitled'}</div>
                        <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{new Date(b.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}</div>
                      </div>
                      <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 8px', borderRadius:2, background:sc.bg, color:sc.c }}>{b.status}</span>
                    </div>
                  )
                })}
              </div>
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Booking history</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{clientBookings.length} booking{clientBookings.length !== 1 ? 's' : ''}</span>
                </div>
                {clientBookings.length === 0 ? (
                  <div style={{ padding: '20px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No bookings yet</div>
                ) : (() => {
                  const now = new Date()
                  const upcoming = clientBookings.filter((b: any) => b.preferred_date && new Date(b.preferred_date) >= now && b.status !== 'declined')
                  const past = clientBookings.filter((b: any) => !b.preferred_date || new Date(b.preferred_date) < now || b.status === 'declined')
                  return (
                    <>
                      {upcoming.length > 0 && (
                        <>
                          <div style={{ padding: '8px 18px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', background: 'rgba(200,194,187,0.02)' }}>Upcoming</div>
                          {upcoming.map((b: any) => (
                            <div key={b.id} style={{ padding: '12px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{b.address || b.shoot_package || 'Booking'}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{b.shoot_package}{b.preferred_date ? ` · ${new Date(b.preferred_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>
                                {b.total && <div style={{ fontSize: 11, color: 'rgba(100,200,130,0.7)', marginTop: 2 }}>{b.total}</div>}
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: b.status === 'confirmed' ? 'rgba(100,200,130,0.15)' : 'rgba(210,175,80,0.15)', color: b.status === 'confirmed' ? 'rgba(100,200,130,0.9)' : 'rgba(210,175,80,0.9)' }}>{b.status}</span>
                            </div>
                          ))}
                        </>
                      )}
                      {past.length > 0 && (
                        <>
                          <div style={{ padding: '8px 18px', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', background: 'rgba(200,194,187,0.02)' }}>Past</div>
                          {past.map((b: any, i: number) => (
                            <div key={b.id} style={{ padding: '12px 18px', borderBottom: i < past.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(200,194,187,0.5)', marginBottom: 2 }}>{b.address || b.shoot_package || 'Booking'}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>{b.shoot_package}{b.preferred_date ? ` · ${new Date(b.preferred_date).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</div>
                                {b.total && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{b.total}</div>}
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: b.status === 'confirmed' ? 'rgba(100,200,130,0.1)' : b.status === 'declined' ? 'rgba(210,90,90,0.1)' : 'rgba(200,194,187,0.08)', color: b.status === 'confirmed' ? 'rgba(100,200,130,0.7)' : b.status === 'declined' ? 'rgba(210,90,90,0.7)' : 'rgba(200,194,187,0.4)' }}>{b.status}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NEW CLIENT MODAL */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>New client</div>
            <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div><label style={lbl}>Full name</label><input style={inp} value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. James Blackwell" /></div>
              <div><label style={lbl}>Email</label><input style={inp} type="email" value={newForm.email} onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))} placeholder="james@example.co.nz" /></div>
              <div><label style={lbl}>Phone</label><input style={inp} value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="021 123 4567" /></div>
              <div><label style={lbl}>Company</label><input style={inp} value={newForm.company} onChange={e => setNewForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Blackwell Properties" /></div>
              <div>
                <label style={lbl}>Agency — groups property invoices</label>
                <select style={inp} value={newForm.agency_id} onChange={e => setNewForm(f => ({ ...f, agency_id: e.target.value }))}>
                  <option value="">No agency</option>
                  {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Category</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Property', 'Commercial', 'Events', 'Socials'].map(cat => (
                    <button key={cat} onClick={() => setNewForm(f => ({ ...f, category: cat }))} style={{ fontSize: 11, padding: '7px 14px', borderRadius: 3, border: `0.5px solid ${newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newForm.category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: newForm.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addClient} disabled={!newForm.name || !newForm.email} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: !newForm.name || !newForm.email ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: !newForm.name || !newForm.email ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: !newForm.name || !newForm.email ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Create client</button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE CLIENT MODAL */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 420, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Invite a client</div>
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6, marginBottom: 20 }}>Sends a signup link so they can set up their own client portal account — their business details, agency and avatar are all filled in once they sign up.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div><label style={lbl}>Email</label><input style={inp} type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="james@example.co.nz" /></div>
              <div><label style={lbl}>Name (optional)</label><input style={inp} value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="James Blackwell" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowInviteModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={sendClientInvite} disabled={!inviteEmail.trim() || sendingInvite} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: !inviteEmail.trim() || sendingInvite ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: !inviteEmail.trim() || sendingInvite ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: !inviteEmail.trim() || sendingInvite ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{sendingInvite ? 'Sending...' : 'Send invite'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
