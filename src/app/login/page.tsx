'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    if (profile?.role === 'studio') {
      router.push('/portal/studio')
    } else {
      router.push('/portal/client')
    }
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <svg width="36" height="36" viewBox="0 0 120 120" fill="none" style={{ margin: '0 auto 16px' }}>
            <path d="M25 15 L75 15 L95 40 L75 40 L75 28 L42 28 L42 92 L75 92 L75 80 L95 105 L25 105 Z" fill="#C8C2BB" opacity="0.85"/>
            <path d="M52 46 L95 46 L95 74 L52 74 L52 63 L84 63 L84 57 L52 57 Z" fill="#C8C2BB" opacity="0.55"/>
          </svg>
          <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8C2BB' }}>Example Content</div>
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
            <a href="#" style={{ fontSize: 12, color: 'rgba(200,194,187,0.35)', textDecoration: 'none' }}>Forgot your password?</a>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <a href="/" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.25)', textDecoration: 'none' }}>← Back to website</a>
        </div>

      </div>
    </main>
  )
}