'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import SiteFooter from '@/components/public/SiteFooter'
import { WORK_PROJECTS } from '@/lib/workProjects'

const FEATURES = [
  'Luxury residential & lifestyle properties',
  'Multi-unit development pre-sale campaigns',
  'Architectural documentation & portfolio shoots',
  'Aerial cinematography & drone coverage',
  'Interior & lifestyle photography',
]

export default function PropertyPage() {
  const gate = useSiteGate()
  if (gate) return gate

  const projects = WORK_PROJECTS.filter(p => p.category === 'Architectural')

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <SiteNav />

      <style>{`
        .work-thumb { position: relative; padding-top: 56.25%; border-radius: 3px; overflow: hidden; background: #1a1f28; }
        .work-thumb iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s ease; pointer-events: none; }
        .property-card:hover .work-thumb iframe { opacity: 1; }
        .work-thumb-img { position: absolute; inset: 0; transition: opacity 0.4s ease; }
        .property-card:hover .work-thumb-img { opacity: 0; }
        .property-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px clamp(20px, 4vw, 40px); }
        @media (max-width: 760px) { .property-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* HERO */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 56px)' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>Architectural & property</p>
        <h1 style={{ fontSize: 'clamp(40px, 8vw, 80px)', fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.01em', color: '#fff', margin: '0 0 24px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', maxWidth: 900 }}>
          Cinematic film for <span style={{ textShadow: '0 0 40px rgba(200,194,187,0.25)' }}>premium</span> listings.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.5)', lineHeight: 1.75, maxWidth: 560 }}>
          We work closely with real estate agents, developers and architects to produce content that sells — not just shows. 80% of our work is property, so we understand what buyers and investors respond to.
        </p>
      </div>

      {/* FEATURES */}
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(48px, 8vw, 72px)', borderTop: '0.5px solid rgba(200,194,187,0.1)', paddingTop: 40 }}>
        {FEATURES.map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '0.5px solid rgba(200,194,187,0.08)', fontSize: 14, color: 'rgba(200,194,187,0.65)' }}>
            <span style={{ color: '#C8C2BB', opacity: 0.7 }}>—</span>{item}
          </div>
        ))}
      </div>

      {/* WORK */}
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(56px, 10vw, 90px)' }}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 400, color: '#fff', margin: '0 0 32px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>Recent property work</h2>
        {projects.length === 0 ? (
          <div style={{ color: 'rgba(200,194,187,0.35)', fontSize: 14 }}>Coming soon.</div>
        ) : (
          <div className="property-grid">
            {projects.map(p => (
              <div key={p.id} className="property-card">
                <div className="work-thumb">
                  <div className="work-thumb-img" style={{ backgroundImage: `url(${p.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  {p.vimeoId && (
                    <iframe src={`https://player.vimeo.com/video/${p.vimeoId}?background=1&autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0`} allow="autoplay; fullscreen" frameBorder="0" />
                  )}
                </div>
                <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.38)', margin: '14px 0 5px' }}>{p.client}</p>
                <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', margin: 0 }}>{p.title}</p>
              </div>
            ))}
          </div>
        )}
        <a href="/work" style={{ display: 'inline-block', marginTop: 36, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.55)', textDecoration: 'none' }}>See all our work →</a>
      </div>

      {/* CTA */}
      <div style={{ padding: 'clamp(56px, 12vw, 96px) clamp(20px, 5vw, 48px)', textAlign: 'center', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <h2 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 24 }}>Got a property to <span style={{ color: '#C8C2BB' }}>showcase?</span></h2>
        <a href="/contact" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Start a project</a>
      </div>

      <SiteFooter />
    </main>
  )
}
