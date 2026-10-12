'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import LogoWatermark from '@/components/public/LogoWatermark'
import SiteFooter from '@/components/public/SiteFooter'

export default function AboutPage() {
  const gate = useSiteGate()
  if (gate) return gate

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <LogoWatermark />
      <SiteNav />

      <style>{`
        .ec-grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 860px) { .ec-grid-2 { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* TEAM SECTION */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(56px, 12vw, 100px)' }}>
        <div className="ec-grid-2" style={{ gap: 'clamp(40px, 6vw, 80px)', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          {/* LEFT — placeholder, real team photo coming once the shoot's done */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -20, left: -20, width: '100%', height: '100%', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 4, zIndex: 0 }} />
            <div
              style={{
                width: '100%', aspectRatio: '3/4', borderRadius: 4, position: 'relative', zIndex: 1,
                border: '0.5px dashed rgba(200,194,187,0.2)', background: 'rgba(200,194,187,0.03)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center', padding: 24,
              }}
            >
              <span style={{ fontSize: 28, opacity: 0.4 }}>📷</span>
              <div>
                <p style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.55)', margin: '0 0 6px', fontFamily: 'Inter, sans-serif' }}>Under construction</p>
                <p style={{ fontSize: 12, color: 'rgba(200,194,187,0.35)', margin: 0, fontFamily: 'Inter, sans-serif' }}>Team shoot loading soon</p>
              </div>
            </div>
          </div>
          {/* RIGHT — TEXT */}
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 16, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'rgba(200,194,187,0.4)' }} />
              Who we are
            </p>
            <h1 style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 400, color: '#fff', lineHeight: 1.05, letterSpacing: '0.04em', margin: '0 0 28px', textTransform: 'uppercase', fontFamily: "'Bebas Neue', sans-serif" }}>
              What is Example Content?
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)', lineHeight: 1.85, margin: '0 0 20px', fontFamily: 'Inter, sans-serif' }}>
              We're a photo and video creative powerhouse, specialising in all things architecture, lifestyle and experiences. Based in Auckland and the Waikato.
            </p>
            <p style={{ fontSize: 17, color: '#C8C2BB', lineHeight: 1.6, margin: '0 0 20px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              We're more than property. We are brand, lifestyle and strategy.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)', lineHeight: 1.85, margin: '0 0 20px', fontFamily: 'Inter, sans-serif' }}>
              We work with real estate agents, construction companies, developers, architects, businesses and events across the country on a variety of photo and video content that doesn't just look good — it performs.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)', lineHeight: 1.85, margin: '0 0 40px', fontFamily: 'Inter, sans-serif' }}>
              At the heart of Example is a team of creatives who care about the details, the people and the bigger picture. We like good ideas, good people and work that makes you stop scrolling. From the first conversation to the final cut, we bring a considered approach, a bit of personality and a genuine drive to create something worth putting your name on. No cookie-cutter content, just good people making good work.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 32, borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
              {[
                { label: 'Cody Woodmass', role: 'Director / Founder' },
                { label: 'Fin', role: 'Shooter / Editor' },
                { label: 'Nyk', role: 'Top Dog' },
              ].map(({ label, role }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', fontFamily: 'Inter, sans-serif', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 'clamp(56px, 12vw, 96px) clamp(20px, 5vw, 48px)', textAlign: 'center', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <h2 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 24 }}>Want to work <span style={{ color: '#C8C2BB' }}>with us?</span></h2>
        <a href="/contact" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Get in touch</a>
      </div>

      <SiteFooter />
    </main>
  )
}
