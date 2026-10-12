// Instagram handle is unconfirmed (same TODO as InstagramFeed.tsx) — real
// LinkedIn page URL isn't known at all yet, so it's left out rather than
// linking to a guessed address. Vimeo is the studio's actual account,
// resolved via the oEmbed API against one of the real project videos.
const SOCIAL_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: 'Instagram', href: 'https://instagram.com/examplecontent', external: true },
  { label: 'Vimeo', href: 'https://vimeo.com/user158762674', external: true },
  { label: 'Privacy', href: '/privacy' },
]

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
          {SOCIAL_LINKS.map(link => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', textDecoration: 'none' }}
            >{link.label}</a>
          ))}
        </div>
      </footer>
    </>
  )
}
