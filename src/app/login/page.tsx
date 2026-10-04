'use client'
import { useState } from 'react'
import { supabase, ensureClientProfile } from '@/lib/supabase'
import { notify, ToastHost } from '@/lib/notify'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'client' | 'studio'>('client')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'studio' || profile?.role === 'editor') {
      router.push('/portal/studio')
    } else {
      if (!profile) await ensureClientProfile(data.user)
      router.push('/portal/client')
    }
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <ToastHost />
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <img src='/images/Pale_logo_EX.png' alt='Example Content' style={{ height: 48, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
        </div>

        {/* MODE TOGGLE */}
        <div style={{ display: 'flex', background: 'rgba(200,194,187,0.06)', borderRadius: 6, padding: 4, marginBottom: 32, border: '0.5px solid rgba(200,194,187,0.1)' }}>
          {(['client', 'studio'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, background: mode === m ? '#C8C2BB' : 'transparent', color: mode === m ? '#111' : 'rgba(200,194,187,0.45)', transition: 'all 0.15s' }}>
              {m === 'client' ? 'Client login' : 'Studio login'}
            </button>
          ))}
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ background: 'rgba(200,194,187,0.05)', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 4, padding: '11px 14px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ background: 'rgba(200,194,187,0.05)', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 4, padding: '11px 14px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(210,90,90,0.1)', border: '0.5px solid rgba(210,90,90,0.3)', borderRadius: 4, padding: '10px 14px', fontSize: 12, color: 'rgba(210,90,90,0.9)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: '#C8C2BB', color: '#111', border: 'none', borderRadius: 3, padding: '13px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 6 }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button type="button" onClick={async () => {
                if (!email) { notify('Enter your email address first', 'error'); return }
                setResetLoading(true)
                await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })
                setResetSent(true)
                setResetLoading(false)
              }} style={{ fontSize: 12, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                {resetLoading ? 'Sending...' : resetSent ? 'Reset email sent!' : 'Forgot your password?'}
              </button>
          </div>
        </form>

        {mode === 'client' && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(200,194,187,0.35)' }}>
            New client? <Link href="/signup" style={{ color: 'rgba(200,194,187,0.7)', textDecoration: 'none', fontWeight: 500 }}>Create an account</Link>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link href="/" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', textDecoration: 'none' }}>← Back to website</Link>
        </div>

      </div>
    </main>
  )
}