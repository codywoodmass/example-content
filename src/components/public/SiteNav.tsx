'use client'
import React from 'react'
import Link from 'next/link'

const NAV_ITEMS: [string, string][] = [['Home', '/'], ['Work', '/work'], ['Property', '/property'], ['Services', '/services'], ['About', '/about']]

export default function SiteNav({ opacity = 1 }: { opacity?: number }) {
  const [navOpen, setNavOpen] = React.useState(false)
  return (
    <div style={{ opacity, pointerEvents: opacity < 0.05 ? 'none' : 'auto', transition: 'opacity 0.1s linear' }}>
      <style>{`
        .nav-link { transition: color 0.2s ease; }
        .nav-link:hover { color: #fff !important; }
        .nav-cta { transition: all 0.2s ease; }
        .nav-cta:hover { background: rgba(200,194,187,0.12) !important; color: #fff !important; }
        .nav-logo { transition: opacity 0.2s ease; cursor: pointer; }
        .nav-logo:hover { opacity: 0.75; }
        .ec-nav { padding: 18px clamp(20px, 5vw, 48px); }
        .ec-nav-links { display: flex; gap: 36px; }
        .ec-nav-cta { display: block; }
        .ec-nav-burger { display: none; }
        .ec-mobile-menu { display: none; }
        @media (max-width: 900px) {
          .ec-nav-links { display: none; }
          .ec-nav-cta { display: none; }
          .ec-nav-burger { display: flex !important; }
          .ec-mobile-menu.open { display: flex !important; }
        }
      `}</style>
      <nav className="ec-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(200,194,187,0.1)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(14,16,20,0.75)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" className="nav-logo">
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 40, objectFit: 'contain', display: 'block' }} />
        </Link>
        <div className="ec-nav-links">
          {NAV_ITEMS.map(([item, href]) => (
            <a key={item} href={href} className="nav-link" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)', textDecoration: 'none' }}>{item}</a>
          ))}
        </div>
        <a href="/contact" className="nav-cta ec-nav-cta" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid rgba(200,194,187,0.4)', color: '#C8C2BB', padding: '10px 22px', borderRadius: 2, textDecoration: 'none' }}>Get in touch</a>
        <button className="ec-nav-burger" onClick={() => setNavOpen(o => !o)} aria-label="Menu" style={{ display: 'none', background: 'transparent', border: 'none', width: 32, height: 24, flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', padding: 0 }}>
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%', transform: navOpen ? 'translateY(9px) rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%', opacity: navOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%', transform: navOpen ? 'translateY(-9px) rotate(-45deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </nav>
      <div className={`ec-mobile-menu ${navOpen ? 'open' : ''}`} style={{ display: 'none', flexDirection: 'column', position: 'fixed', top: 60, left: 0, right: 0, zIndex: 49, background: '#0E1014', borderBottom: '0.5px solid rgba(200,194,187,0.1)', padding: '20px clamp(20px, 5vw, 48px) 28px' }}>
        {NAV_ITEMS.map(([item, href]) => (
          <a key={item} href={href} onClick={() => setNavOpen(false)} style={{ fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.7)', textDecoration: 'none', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>{item}</a>
        ))}
        <a href="/contact" onClick={() => setNavOpen(false)} style={{ marginTop: 16, textAlign: 'center', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid rgba(200,194,187,0.4)', color: '#C8C2BB', padding: '12px 22px', borderRadius: 2, textDecoration: 'none' }}>Get in touch</a>
      </div>
    </div>
  )
}
