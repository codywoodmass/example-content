'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import SiteFooter from '@/components/public/SiteFooter'

export default function AboutPage() {
  const gate = useSiteGate()
  if (gate) return gate

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <SiteNav />

      <style>{`
        .ec-grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 860px) { .ec-grid-2 { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* TEAM SECTION */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(56px, 12vw, 100px)' }}>
        <div className="ec-grid-2" style={{ gap: 'clamp(40px, 6vw, 80px)', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
          {/* LEFT — IMAGE */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -20, left: -20, width: '100%', height: '100%', border: '0.5px solid rgba(200,194,187,0.1)', borderRadius: 4, zIndex: 0 }} />
            <img
              src="/images/Cody.jpg"
              alt="The Team"
              style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', objectPosition: 'top', borderRadius: 4, position: 'relative', zIndex: 1, filter: 'grayscale(20%)' }}
            />
          </div>
          {/* RIGHT — TEXT */}
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 16, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'rgba(200,194,187,0.4)' }} />
              The Team Behind It
            </p>
            <h1 style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 400, color: '#fff', lineHeight: 1.05, letterSpacing: '0.04em', margin: '0 0 28px', textTransform: 'uppercase', fontFamily: "'Bebas Neue', sans-serif" }}>
              We don't just show up with a camera. We show up with a plan.
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)', lineHeight: 1.85, margin: '0 0 20px', fontFamily: 'Inter, sans-serif' }}>
              Example Content is a Hawke's Bay based video production and photography studio. We work with property developers, real estate agents, architects and commercial brands across New Zealand to create content that doesn't just look good — it performs.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)', lineHeight: 1.85, margin: '0 0 40px', fontFamily: 'Inter, sans-serif' }}>
              Every project starts with a conversation about outcomes. What do you need this content to do? From there, we build the strategy, plan the shoot, and deliver work that earns its place.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 32, borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
              {[
                { label: 'Cody Woodmass', role: 'Director / Founder' },
                { label: 'Fin', role: 'Shooter / Editor' },
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
