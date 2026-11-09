'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resizeImageToDataUrl } from '@/lib/imageResize'
import Link from 'next/link'

type Invite = { id: string; account_email: string; invited_email: string; invited_name: string; status: string }

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [invite, setInvite] = useState<Invite | null>(null)
  const [checking, setChecking] = useState(true)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  async function handleAvatarPick(file: File) {
    setAvatarError('')
    try {
      setAvatarUrl(await resizeImageToDataUrl(file))
    } catch {
      setAvatarError("Couldn't read that image — try a different file.")
    }
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(200,194,187,0.05)', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 4, padding: '11px 14px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }
  const labelStyle: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }

  useEffect(() => {
    if (!token) return
    supabase.from('client_invites').select('*').eq('token', token).maybeSingle().then(({ data }) => {
      setInvite(data)
      if (data?.invited_name) setFullName(data.invited_name)
      setChecking(false)
    })
  }, [token])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: invite.invited_email,
      password,
      options: {
        data: { full_name: fullName, avatar_url: avatarUrl || null },
        // Without this the confirmation link drops them on the marketing
        // homepage instead of the portal — same fix as the main signup page.
        emailRedirectTo: `${window.location.origin}/portal/client`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // The client portal's own load effect does the actual client_members
      // linking the moment this login lands there (see studio/client page's
      // session-load effect) — redirecting straight there is enough.
      router.push('/portal/client')
      return
    }

    setAwaitingConfirmation(true)
    setLoading(false)
  }

  if (checking) {
    return <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif', color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Checking invite...</main>
  }

  if (!invite || invite.status !== 'pending') {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 10 }}>{!invite ? 'Invite not found' : 'This invite has already been used'}</div>
          <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)', lineHeight: 1.7, marginBottom: 28 }}>{!invite ? "This invite link isn't valid — check it was copied in full, or ask whoever invited you to send a new one." : 'If this was you, just sign in below.'}</div>
          <Link href="/login" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#C8C2BB', textDecoration: 'none' }}>← Go to login</Link>
        </div>
      </main>
    )
  }

  if (awaitingConfirmation) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(100,200,130,0.4)', background: 'rgba(100,200,130,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 10 }}>Check your email</div>
          <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)', lineHeight: 1.7, marginBottom: 28 }}>We've sent a confirmation link to {invite.invited_email}. Click it, then come back and sign in — you'll have full access to {invite.account_email}'s account.</div>
          <Link href="/login" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#C8C2BB', textDecoration: 'none' }}>← Back to login</Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src='/images/Pale_logo_EX.png' alt='Example Content' style={{ height: 48, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 8, textAlign: 'center' }}>You're invited</div>
        <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.5)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>Set up your login for full access to <strong style={{ color: '#C8C2BB' }}>{invite.account_email}</strong>'s Example Content account.</div>

        <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            <label style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: avatarUrl ? 'transparent' : 'rgba(200,194,187,0.06)', border: '0.5px dashed rgba(200,194,187,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 18, color: 'rgba(200,194,187,0.35)' }}>+</span>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarPick(f); e.target.value = '' }} />
            </label>
            <div>
              <div style={{ fontSize: 12, color: '#C8C2BB', marginBottom: 2 }}>Add a profile photo</div>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', lineHeight: 1.5 }}>Optional, but it makes it a lot easier for your team to know who's who.</div>
              {avatarError && <div style={{ fontSize: 11, color: 'rgba(210,90,90,0.85)', marginTop: 4 }}>{avatarError}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={invite.invited_email} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Confirm password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>

          {error && (
            <div style={{ background: 'rgba(210,90,90,0.1)', border: '0.5px solid rgba(210,90,90,0.3)', borderRadius: 4, padding: '10px 14px', fontSize: 12, color: 'rgba(210,90,90,0.9)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ background: '#C8C2BB', color: '#111', border: 'none', borderRadius: 3, padding: '13px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 6 }}>
            {loading ? 'Setting up...' : 'Accept & set up login'}
          </button>
        </form>

      </div>
    </main>
  )
}
