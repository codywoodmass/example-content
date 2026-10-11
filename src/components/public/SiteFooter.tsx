export default function SiteFooter() {
  return (
    <>
      <style>{`
        .ec-row-stack { display: flex; }
        @media (max-width: 860px) {
          .ec-row-stack { flex-direction: column; align-items: flex-start !important; gap: 16px; }
        }
      `}</style>
      {/* FOOTER — no portal logins here on purpose; clients get a direct
          link from the studio rather than discovering a login on the
          public site. */}
      <footer className="ec-row-stack" style={{ padding: 'clamp(24px, 6vw, 32px) clamp(20px, 5vw, 48px)', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(200,194,187,0.28)', letterSpacing: '0.08em' }}>© 2026 Example Content Ltd. Auckland, New Zealand.</p>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {['Instagram', 'Vimeo', 'LinkedIn', 'Privacy'].map(link => (
            <a key={link} href="#" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>
    </>
  )
}
