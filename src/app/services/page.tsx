'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import SiteFooter from '@/components/public/SiteFooter'
import InstagramFeed from '@/components/public/InstagramFeed'
import { WORK_PROJECTS } from '@/lib/workProjects'

// Reused from the Our Work portfolio as stand-in imagery for the floating
// tile showcase below — swap in real per-service shots whenever they're
// ready (see CONTENT_README.md).
const TILE_POOL = WORK_PROJECTS.map(p => p.thumb)

type Service = { num: string; title: string; desc: string; longDesc: string }

const SERVICES: Service[] = [
  {
    num: '01',
    title: 'Property & Real Estate Film',
    desc: 'Cinematic walkthroughs and lifestyle edits built to sell a listing, not just show it.',
    longDesc: 'Cinematic walkthroughs and lifestyle edits built to sell a listing, not just show it. We shoot for the buyer\'s imagination — pacing, light and movement all working together so the property feels lived-in, not staged.',
  },
  {
    num: '02',
    title: 'Architectural Photography',
    desc: 'Considered, detail-led stills for architects, builders and developers.',
    longDesc: 'Considered, detail-led stills for architects, builders and developers — composition and light treated the way the building itself was designed: deliberately. Great for portfolios, publications and pitch decks.',
  },
  {
    num: '03',
    title: 'Brand & Commercial Film',
    desc: 'Brand films, campaign content and social-first video for businesses.',
    longDesc: 'Brand films, campaign content and social-first video for businesses that want content with a point of view, not just footage. We help shape the story before we ever pick up a camera.',
  },
  {
    num: '04',
    title: 'Social Media Content & Ads',
    desc: 'Short-form video and ad creative built for how people actually scroll.',
    longDesc: 'Short-form video and ad creative built for how people actually scroll — fast, punchy edits for Reels, TikTok and paid social, cut for retention and built around a clear hook.',
  },
  {
    num: '05',
    title: 'Pre-Production & Strategy',
    desc: 'The planning that makes the shoot day simple — shot lists, scripting, scheduling.',
    longDesc: 'The planning that makes the shoot day simple: shot lists, scripting, talent and location scheduling, and a clear brief everyone is shooting to. The less guessing on the day, the better the result.',
  },
  {
    num: '06',
    title: 'Event Coverage',
    desc: 'Full-day event photography and video, from launches to live activations.',
    longDesc: 'Full-day event photography and video, from launches to live activations — coverage that captures the energy of the room as well as the key moments you\'ll want to use afterward.',
  },
  {
    num: '07',
    title: 'Client Portal, Feedback & Booking',
    desc: 'Book shoots, review content and leave timestamped feedback, all in one place.',
    longDesc: 'Every client gets their own portal: book a shoot straight into our calendar, track a project through production, review delivered content and leave timestamped feedback on exact moments — no more feedback buried in email threads.',
  },
  {
    num: '08',
    title: 'Development Campaigns',
    desc: 'Full pre-sale content campaigns across video, photography and social cut-downs.',
    longDesc: 'Full pre-sale content campaigns across video, photography and social cut-downs for multi-unit developments — one shoot, a full suite of deliverables built for the whole sales campaign.',
  },
]

// Four distinct arrangements, each with tiles' bounding boxes genuinely
// overlapping (not just close together) — cycled by service index so no
// two services in a row look like the same template with different photos.
const TILE_LAYOUTS: { top: string; left: string; width: number; z: number }[][] = [
  [ // cascading diagonal
    { top: '0%', left: '0%', width: 300, z: 1 },
    { top: '10%', left: '22%', width: 280, z: 2 },
    { top: '20%', left: '43%', width: 280, z: 3 },
    { top: '6%', left: '66%', width: 240, z: 2 },
    { top: '32%', left: '8%', width: 230, z: 1 },
  ],
  [ // two overlapping clusters
    { top: '2%', left: '2%', width: 270, z: 1 },
    { top: '22%', left: '16%', width: 260, z: 2 },
    { top: '0%', left: '44%', width: 250, z: 1 },
    { top: '24%', left: '56%', width: 250, z: 2 },
    { top: '8%', left: '78%', width: 220, z: 1 },
    { top: '38%', left: '70%', width: 210, z: 3 },
  ],
  [ // vertical masonry, denser overlap
    { top: '0%', left: '6%', width: 310, z: 1 },
    { top: '16%', left: '30%', width: 260, z: 2 },
    { top: '0%', left: '56%', width: 270, z: 1 },
    { top: '32%', left: '12%', width: 230, z: 3 },
    { top: '36%', left: '46%', width: 280, z: 2 },
  ],
  [ // loose scatter, fewer tiles, more breathing room
    { top: '4%', left: '4%', width: 320, z: 1 },
    { top: '14%', left: '38%', width: 290, z: 2 },
    { top: '0%', left: '68%', width: 240, z: 1 },
    { top: '36%', left: '22%', width: 260, z: 2 },
  ],
]

function ServiceModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const cursorRef = React.useRef<HTMLDivElement>(null)
  const tiles = React.useMemo(() => {
    const index = SERVICES.findIndex(s => s.num === service.num)
    const layout = TILE_LAYOUTS[index % TILE_LAYOUTS.length]
    const offset = index * 2
    return layout.map((pos, i) => ({ ...pos, img: TILE_POOL[(offset + i) % TILE_POOL.length] }))
  }, [service.num])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,8,0.85)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 3vw, 40px)' }}>
      <style>{`
        @keyframes tileFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .service-tile { position: absolute; border-radius: 6px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.45); transition: transform 0.3s ease, opacity 0.3s ease; animation: tileFloat 6s ease-in-out infinite; }
        .tiles-wrap:hover .service-tile { opacity: 0.45; }
        .service-tile:hover { opacity: 1 !important; transform: scale(1.12) !important; z-index: 20; }
        .tiles-wrap { cursor: none; }
      `}</style>
      <button
        onClick={onClose}
        style={{ position: 'fixed', top: 24, right: 28, zIndex: 310, fontSize: 24, color: 'rgba(200,194,187,0.7)', background: 'rgba(10,12,16,0.6)', border: '0.5px solid rgba(200,194,187,0.25)', borderRadius: '50%', width: 42, height: 42, cursor: 'pointer', lineHeight: 1 }}
        aria-label="Close"
      >×</button>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 1100, height: '88vh', background: '#0E1014', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 8, overflowY: 'auto', position: 'relative', boxShadow: '0 30px 90px rgba(0,0,0,0.6)' }}
      >
        <div style={{ padding: 'clamp(40px, 6vw, 64px) clamp(28px, 6vw, 64px) 0' }}>
          <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', letterSpacing: '0.1em' }}>{service.num}</span>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 400, color: '#fff', margin: '12px 0 20px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.01em' }}>{service.title}</h2>
          <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.6)', lineHeight: 1.8, maxWidth: 640, margin: 0 }}>{service.longDesc}</p>
        </div>

        {/* FLOATING TILES */}
        <div
          className="tiles-wrap"
          onMouseMove={e => {
            if (cursorRef.current) {
              cursorRef.current.style.left = e.clientX + 'px'
              cursorRef.current.style.top = e.clientY + 'px'
              cursorRef.current.style.opacity = '1'
            }
          }}
          onMouseLeave={() => { if (cursorRef.current) cursorRef.current.style.opacity = '0' }}
          style={{ position: 'relative', height: 'clamp(380px, 48vw, 480px)', margin: 'clamp(32px, 5vw, 56px) clamp(28px, 6vw, 64px) clamp(48px, 7vw, 72px)' }}
        >
          {tiles.map((t, i) => (
            <div key={i} className="service-tile" style={{ top: t.top, left: t.left, width: t.width, zIndex: t.z, aspectRatio: '4/3', animationDelay: `${i * 0.4}s` }}>
              <img src={t.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      </div>
      <div ref={cursorRef} style={{ position: 'fixed', top: 0, left: 0, width: 46, height: 46, marginLeft: -23, marginTop: -23, pointerEvents: 'none', zIndex: 400, opacity: 0, transition: 'opacity 0.15s ease' }}>
        <img src="/images/EX Logo EMBLEMPALE.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }} />
      </div>
    </div>
  )
}

export default function ServicesPage() {
  const gate = useSiteGate()
  const [selected, setSelected] = React.useState<Service | null>(null)
  if (gate) return gate

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <SiteNav />

      <style>{`
        .services-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1px; background: rgba(200,194,187,0.08); }
        .service-card { background: #0E1014; padding: clamp(28px, 4vw, 40px); cursor: pointer; transition: background 0.2s ease; }
        .service-card:hover { background: rgba(200,194,187,0.03); }
        .service-card:hover h3 { color: #C8C2BB; }
        @media (max-width: 760px) { .services-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* HERO */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 56px)' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>What we offer</p>
        <h1 style={{ fontSize: 'clamp(32px, 6.5vw, 64px)', fontWeight: 400, lineHeight: 0.98, letterSpacing: '0.01em', color: '#fff', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Full-service production, <span style={{ textShadow: '0 0 40px rgba(200,194,187,0.25)' }}>start to finish.</span>
        </h1>
      </div>

      {/* SERVICES GRID */}
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(56px, 10vw, 90px)' }}>
        <div className="services-grid">
          {SERVICES.map(s => (
            <div key={s.num} className="service-card" onClick={() => setSelected(s)}>
              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', letterSpacing: '0.1em' }}>{s.num}</span>
              <h3 style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: '14px 0 10px', transition: 'color 0.2s ease' }}>{s.title}</h3>
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

      {selected && <ServiceModal service={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
