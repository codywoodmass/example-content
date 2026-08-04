'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Supabase puts the token in the URL hash — this handles it automatically
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMessage('Enter your new password below.')
      }
    })
  }, [])

  async function handleReset() {
    if (!password) { setError('Please enter a password'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password updated successfully. Redirecting...')
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 40, width: 400, maxWidth: '95vw' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 44, objectFit: 'contain', marginBottom: 28 }} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Reset your password</div>
        <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 24 }}>Enter a new password for your account.</div>
        {message && <div style={{ padding: '12px 16px', background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, fontSize: 12, color: 'rgba(100,200,130,0.9)', marginBottom: 16 }}>{message}</div>}
        {error && <div style={{ padding: '12px 16px', background: 'rgba(210,90,90,0.08)', border: '0.5px solid rgba(210,90,90,0.2)', borderRadius: 6, fontSize: 12, color: 'rgba(210,90,90,0.9)', marginBottom: 16 }}>{error}</div>}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>New password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }}>Confirm password</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleReset()} style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
        </div>
        <button onClick={handleReset} disabled={loading} style={{ width: '100%', padding: '11px', borderRadius: 4, background: loading ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: loading ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{loading ? 'Updating...' : 'Update password'}</button>
      </div>
    </main>
  )
}
