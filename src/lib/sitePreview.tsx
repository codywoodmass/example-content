'use client'
import React from 'react'

// Flip to false when the whole site is ready to go fully public — gates
// every public marketing page (not the portal or auth pages).
export const UNDER_CONSTRUCTION = false

// Soft bypass so the real build can be previewed (on any URL, including the
// live production domain) while it's still gated for everyone else — visit
// once with ?preview=ec2026 and a cookie remembers it on that browser from
// then on, no matter which page or domain you land on.
const PREVIEW_SECRET = 'ec2026'

export function usePreviewUnlock(): boolean {
  const [unlocked, setUnlocked] = React.useState(false)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('preview') === PREVIEW_SECRET) {
      document.cookie = 'ec_preview=1; max-age=31536000; path=/'
      setUnlocked(true)
      return
    }
    if (document.cookie.includes('ec_preview=1')) setUnlocked(true)
  }, [])
  return unlocked
}

export function UnderConstructionScreen() {
  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 48, objectFit: 'contain', display: 'block', margin: '0 auto 40px' }} />
      <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 18 }}>Something new is coming</p>
      <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 400, color: '#fff', letterSpacing: '0.02em', margin: '0 0 20px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
        We're building our new site.
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.55)', maxWidth: 440, lineHeight: 1.7, margin: '0 0 36px' }}>
        Example Content is currently rebuilding our website. In the meantime, get in touch with us directly, or head to your portal below.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: 44 }}>
        <a href="mailto:cody@examplecontent.co.nz" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Email us</a>
        <a href="/portal/client" style={{ color: 'rgba(200,194,187,0.6)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Client portal →</a>
        <a href="/portal/studio" style={{ color: 'rgba(200,194,187,0.6)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Studio login →</a>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(200,194,187,0.28)', letterSpacing: '0.08em' }}>© 2026 Example Content Ltd. Hawke's Bay, New Zealand.</p>
    </main>
  )
}

// Call at the top of every public marketing page (not the portal). It's a
// hook itself, so call every OTHER hook the page needs (useState etc.)
// before checking its return value — `if (gate) return gate` must come
// after all of the page's own hooks, never between them, or React sees a
// different number of hooks on the render where this flips from blocking
// to unblocked and throws a rules-of-hooks error.
// Returns the gate screen when it should block, otherwise null.
export function useSiteGate(): React.ReactNode | null {
  const unlocked = usePreviewUnlock()
  if (UNDER_CONSTRUCTION && !unlocked) return <UnderConstructionScreen />
  return null
}
