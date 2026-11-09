'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase, ensureClientProfile } from '@/lib/supabase'
import { resizeImageToDataUrl } from '@/lib/imageResize'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = ['Property', 'Commercial', 'Events', 'Socials']

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [category, setCategory] = useState('Property')
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([])
  const [agencyId, setAgencyId] = useState('')
  const [agencyOther, setAgencyOther] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  // Studio-sent invite links carry the client's email along so they don't
  // have to retype it.
  useEffect(() => {
    const prefill = searchParams.get('email')
    if (prefill) setEmail(prefill)
  }, [searchParams])

  useEffect(() => {
    supabase.from('agencies').select('id, name').order('name', { ascending: true }).then(({ data }) => setAgencies(data || []))
  }, [])

  async function handleAvatarPick(file: File) {
    setAvatarError('')
    try {
      setAvatarUrl(await resizeImageToDataUrl(file))
    } catch {
      setAvatarError("Couldn't read that image — try a different file.")
    }
  }

  const inputStyle: React.CSSProperties = { background: 'rgba(200,194,187,0.05)', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 4, padding: '11px 14px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const labelStyle: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }
  const sectionLabelStyle: React.CSSProperties = { fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginTop: 6 }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company,
          phone,
          category,
          agency_id: category === 'Property' && agencyId && agencyId !== 'other' ? agencyId : null,
          agency_name: category === 'Property' && agencyId === 'other' ? agencyOther : null,
          avatar_url: avatarUrl || null,
        },
        // Without this, Supabase falls back to the project's default Site
        // URL — the marketing homepage, not the app — so clicking the
        // confirmation email dropped people on examplecontent.co.nz with no
        // session ever established, meaning the dashboard-load code that
        // creates their profiles/clients1 rows never ran at all.
        emailRedirectTo: `${window.location.origin}/portal/client`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // The welcome screen fires once, the first time this browser lands on
    // the dashboard after signing up — checked there rather than here,
    // since email confirmation (the normal case) means that first real
    // login happens on a completely separate page load. ec_team_nudge_pending
    // is the same idea for a one-time callout the first time this account
    // visits the Team page specifically, pushing them to invite teammates.
    try {
      localStorage.setItem('ec_welcome_pending', '1')
      localStorage.setItem('ec_team_nudge_pending', '1')
    } catch {}

    if (data.session && data.user) {
      await ensureClientProfile(data.user)
      router.push('/portal/client')
      return
    }

    // Email confirmation is required before a session exists
    setAwaitingConfirmation(true)
    setLoading(false)
  }

  if (awaitingConfirmation) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420, padding: '0 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid rgba(100,200,130,0.4)', background: 'rgba(100,200,130,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 24 }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#fff', marginBottom: 10 }}>Check your email</div>
          <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)', lineHeight: 1.7, marginBottom: 28 }}>We've sent a confirmation link to {email}. Click it, then come back and sign in.</div>
          <Link href="/login" style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#C8C2BB', textDecoration: 'none' }}>← Back to login</Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif', padding: '40px 0' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src='/images/Pale_logo_EX.png' alt='Example Content' style={{ height: 48, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 20, textAlign: 'center' }}>Create your client account</div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          <div style={sectionLabelStyle}>About you</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Full name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="021 123 4567" style={inputStyle} />
          </div>

          <div style={sectionLabelStyle}>About your business</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Company / agency name</label>
            <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Smith Realty" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>What do you need from us?</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {category === 'Property' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Agency</label>
              <select value={agencyId} onChange={e => setAgencyId(e.target.value)} style={inputStyle}>
                <option value="">No agency</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                <option value="other">Other...</option>
              </select>
              {agencyId === 'other' && (
                <input type="text" value={agencyOther} onChange={e => setAgencyOther(e.target.value)} placeholder="Agency name" style={{ ...inputStyle, marginTop: 6 }} />
              )}
            </div>
          )}

          <div style={sectionLabelStyle}>Login</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} />
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(200,194,187,0.35)' }}>
          Already have an account? <Link href="/login" style={{ color: 'rgba(200,194,187,0.7)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </div>

      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  )
}
