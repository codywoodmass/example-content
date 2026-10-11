'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import SiteFooter from '@/components/public/SiteFooter'
import InstagramFeed from '@/components/public/InstagramFeed'

const SERVICES = [
  { num: '01', title: 'Property & Real Estate Film', desc: 'Cinematic walkthroughs and lifestyle edits built to sell a listing, not just show it.' },
  { num: '02', title: 'Architectural Photography', desc: 'Considered, detail-led stills for architects, builders and developers.' },
  { num: '03', title: 'Development Campaigns', desc: 'Full pre-sale content campaigns across video, photography and social cut-downs.' },
  { num: '04', title: 'Brand & Commercial Film', desc: 'Brand films, campaign content and social-first video for businesses.' },
  { num: '05', title: 'Aerial & Drone Cinematography', desc: 'Licensed drone coverage for property, events and landscape-scale shoots.' },
  { num: '06', title: 'Event Coverage', desc: 'Full-day event photography and video, from launches to live activations.' },
]

export default function ServicesPage() {
  const gate = useSiteGate()
  if (gate) return gate

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <SiteNav />

      <style>{`
        .services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: rgba(200,194,187,0.08); }
        .service-card { background: #0E1014; padding: clamp(28px, 4vw, 40px); }
        @media (max-width: 760px) { .services-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* HERO */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 56px)' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>What we offer</p>
        <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.01em', color: '#fff', margin: '0 0 24px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', maxWidth: 900 }}>
          Full-service production, <span style={{ textShadow: '0 0 40px rgba(200,194,187,0.25)' }}>start to finish.</span>
        </h1>
      </div>

      {/* SERVICES GRID */}
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(56px, 10vw, 90px)' }}>
        <div className="services-grid">
          {SERVICES.map(s => (
            <div key={s.num} className="service-card">
              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', letterSpacing: '0.1em' }}>{s.num}</span>
              <h3 style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: '14px 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(200,194,187,0.5)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 'clamp(56px, 12vw, 96px) clamp(20px, 5vw, 48px)', textAlign: 'center', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <h2 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 24 }}>Not sure which fits <span style={{ color: '#C8C2BB' }}>your project?</span></h2>
        <a href="/contact" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Let's talk</a>
      </div>

      <InstagramFeed />

      <SiteFooter />
    </main>
  )
}
