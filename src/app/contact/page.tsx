'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import SiteFooter from '@/components/public/SiteFooter'

const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(200,194,187,0.05)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 3, padding: '13px 16px', fontSize: 14, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }
const labelStyle: React.CSSProperties = { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 8, display: 'block' }

export default function ContactPage() {
  const gate = useSiteGate()
  const [form, setForm] = React.useState({ name: '', email: '', phone: '', projectType: '', message: '' })
  const [sending, setSending] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState('')
  if (gate) return gate

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setSent(true)
    } catch (e: any) {
      setError(e.message || 'Something went wrong — try emailing us directly.')
    }
    setSending(false)
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <SiteNav />

      <style>{`
        .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 6vw, 64px); }
        .contact-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 860px) {
          .contact-grid { grid-template-columns: 1fr !important; }
          .contact-row-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(60px, 10vw, 100px)' }}>
        <div className="contact-grid" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>Get in touch</p>
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 68px)', fontWeight: 400, lineHeight: 1.02, letterSpacing: '0.01em', color: '#fff', margin: '0 0 24px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
              Got a project in mind?
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.5)', lineHeight: 1.75, maxWidth: 420, marginBottom: 40 }}>
              Tell us about your listing, brand or event and we'll be in touch within 24 hours.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Email</div>
                <a href="mailto:cody@examplecontent.co.nz" style={{ fontSize: 15, color: '#C8C2BB', textDecoration: 'none' }}>cody@examplecontent.co.nz</a>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Based in</div>
                <div style={{ fontSize: 15, color: '#C8C2BB' }}>Hawke's Bay, New Zealand — available nationwide</div>
              </div>
            </div>
          </div>

          <div>
            {sent ? (
              <div style={{ padding: '32px 28px', background: 'rgba(100,200,130,0.06)', border: '0.5px solid rgba(100,200,130,0.25)', borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>✓</div>
                <p style={{ fontSize: 16, color: '#fff', marginBottom: 8 }}>Thanks, that's sent through.</p>
                <p style={{ fontSize: 13, color: 'rgba(200,194,187,0.5)' }}>We'll be in touch within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="contact-row-2">
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input required style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input required type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="contact-row-2">
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label style={labelStyle}>Project type</label>
                    <select style={inputStyle} value={form.projectType} onChange={e => setForm(f => ({ ...f, projectType: e.target.value }))}>
                      <option value="">Select one</option>
                      <option>Architectural / Property</option>
                      <option>Commercial / Brand</option>
                      <option>Event coverage</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Tell us about it</label>
                  <textarea required rows={5} style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>
                {error && <div style={{ fontSize: 13, color: 'rgba(210,90,90,0.85)' }}>{error}</div>}
                <button type="submit" disabled={sending} style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '15px 28px', borderRadius: 2, border: 'none', fontWeight: 500, cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
                  {sending ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  )
}
