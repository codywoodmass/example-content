// The one thing allowed to show during a brief loading gap (an auth
// check resolving, a route transition) — just the background, the logo,
// and a spinner. Never a login form, a placeholder screen, or anything
// else that could be mistaken for real page content.
export default function LoadingScreen() {
  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 36, objectFit: 'contain', opacity: 0.9 }} />
      <div className="ec-loading-spinner" />
      <style>{`
        .ec-loading-spinner { width: 26px; height: 26px; border-radius: 50%; border: 2px solid rgba(200,194,187,0.15); border-top-color: rgba(200,194,187,0.65); animation: ec-loading-spin 0.8s linear infinite; }
        @keyframes ec-loading-spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  )
}
