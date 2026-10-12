'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import LogoWatermark from '@/components/public/LogoWatermark'
import SiteFooter from '@/components/public/SiteFooter'
import { WORK_PROJECTS, PropertyType, WorkProject } from '@/lib/workProjects'

const STATS = [
  { value: '10+', label: 'Years in property & architectural film' },
  { value: '1,000s', label: 'Properties photographed & filmed' },
  { value: 'Bare land → completed', label: 'Every stage, sunrise to sunset' },
]

const FEATURES = [
  'High-end architectural photography & video',
  'Construction site updates through to completed projects',
  'Real estate photo & video',
  'Shooting your project in the best light, every time',
  'Development pre-sale through to completed project content',
  'Strategy & pre-planning to set up the best results',
  'Sunrise to sunset, shooting all across the country',
  'Real estate & architectural packages available',
]

const CATEGORIES: PropertyType[] = ['Property', 'Construction']

// Lazy-mounted hover-preview, same reasoning as the Our Work page's
// cards — don't open a Vimeo stream for every tile until it's actually
// hovered. Unlike that page, this one plays with sound while hovered, so
// the iframe is tied directly to the hover state (mounted on enter,
// unmounted on leave) rather than staying mounted forever once first
// hovered — otherwise audio would keep playing after the mouse moved on.
// No background=1 here — that mode strips audio entirely by design, same
// root cause as the old hero mute-button bug.
function PropertyCard({ project: p }: { project: WorkProject }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div className="property-card" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="work-thumb">
        <div className="work-thumb-img" style={{ backgroundImage: `url(${p.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {hovered && p.vimeoId && (
          <iframe src={`https://player.vimeo.com/video/${p.vimeoId}?autoplay=1&muted=0&loop=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0`} allow="autoplay; fullscreen" frameBorder="0" />
        )}
      </div>
      <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.38)', margin: '14px 0 5px' }}>{p.client}</p>
      <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', margin: 0 }}>{p.title}</p>
    </div>
  )
}

export default function PropertyPage() {
  const gate = useSiteGate()
  const [category, setCategory] = React.useState<PropertyType>('Property')
  if (gate) return gate

  const projects = WORK_PROJECTS.filter(p => p.category === 'Architectural' && (p.propertyType || 'Property') === category)

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <LogoWatermark />
      <SiteNav />

      <style>{`
        .work-thumb { position: relative; padding-top: 56.25%; border-radius: 3px; overflow: hidden; background: #1a1f28; }
        .work-thumb iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s ease; pointer-events: none; }
        .property-card:hover .work-thumb iframe { opacity: 1; }
        .work-thumb-img { position: absolute; inset: 0; transition: opacity 0.4s ease; }
        .property-card:hover .work-thumb-img { opacity: 0; }
        .property-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 28px clamp(20px, 4vw, 40px); }
        .property-hero-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: clamp(32px, 6vw, 72px); align-items: end; }
        .property-features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; }
        .property-features-item { border-left: 0.5px solid rgba(200,194,187,0.08); padding-left: 32px; }
        .property-features-item:nth-child(odd) { border-left: none; padding-left: 0; }
        .property-features-item:nth-child(even) { justify-content: flex-end; text-align: right; }
        .cat-pill { transition: all 0.2s ease; cursor: pointer; }
        .cat-pill:hover { color: #fff !important; border-color: rgba(200,194,187,0.4) !important; }
        @media (max-width: 860px) {
          .property-hero-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 760px) {
          .property-grid { grid-template-columns: 1fr; }
          .property-features { grid-template-columns: 1fr !important; }
          .property-features-item { border-left: none !important; padding-left: 0 !important; }
          .property-features-item:nth-child(even) { justify-content: flex-start !important; text-align: left !important; }
        }
      `}</style>

      {/* HERO */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(48px, 8vw, 72px)' }}>
        <div className="property-hero-grid">
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>Architectural & property</p>
            <h1 style={{ fontSize: 'clamp(46px, 8.2vw, 88px)', fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.01em', color: '#fff', margin: '0 0 24px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
              <span style={{ textShadow: '0 0 40px rgba(200,194,187,0.25)' }}>10+ years</span> in property & architectural film.
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.5)', lineHeight: 1.75, maxWidth: 520 }}>
              We've photographed and filmed thousands of properties — from bare grass sections, through every stage of construction, to completed projects captured from sunrise to sunset.
            </p>
          </div>
          {/* Editorial stat column — numbers do the talking, no card chrome */}
          <div>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ padding: '18px 0', borderTop: i === 0 ? 'none' : '0.5px solid rgba(200,194,187,0.1)' }}>
                <div style={{ fontSize: 'clamp(22px, 2.8vw, 32px)', fontWeight: 400, color: '#fff', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.45)', marginTop: 6 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(48px, 8vw, 72px)', borderTop: '0.5px solid rgba(200,194,187,0.1)', paddingTop: 40 }}>
        <div className="property-features">
          {FEATURES.map(item => (
            <div key={item} className="property-features-item" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px 16px 0', borderBottom: '0.5px solid rgba(200,194,187,0.08)', fontSize: 14, color: 'rgba(200,194,187,0.65)' }}>
              <span style={{ color: '#C8C2BB', opacity: 0.7 }}>—</span>{item}
            </div>
          ))}
        </div>
      </div>

      {/* WORK */}
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(56px, 10vw, 90px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 400, color: '#fff', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>Recent property work</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className="cat-pill"
                onClick={() => setCategory(cat)}
                style={{
                  fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 2,
                  border: `0.5px solid ${category === cat ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.15)'}`,
                  background: category === cat ? '#C8C2BB' : 'transparent',
                  color: category === cat ? '#111' : 'rgba(200,194,187,0.55)',
                  fontWeight: category === cat ? 500 : 400,
                }}
              >{cat}</button>
            ))}
          </div>
        </div>
        {projects.length === 0 ? (
          <div style={{ color: 'rgba(200,194,187,0.35)', fontSize: 14 }}>More {category.toLowerCase()} work coming soon.</div>
        ) : (
          <div className="property-grid">
            {projects.map(p => (
              <PropertyCard key={p.id} project={p} />
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
