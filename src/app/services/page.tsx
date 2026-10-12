'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import LogoWatermark from '@/components/public/LogoWatermark'
import SiteFooter from '@/components/public/SiteFooter'
import InstagramFeed from '@/components/public/InstagramFeed'
import { WORK_PROJECTS, WorkProject } from '@/lib/workProjects'

// Which real projects are relevant to each service — keyed by service
// number, filtering WORK_PROJECTS rather than pulling from a flat rotating
// pool, so a service's tiles actually show its own kind of work instead of
// a random mix. Falls back to the full pool only if a filter ever matches
// nothing (shouldn't happen with the current data, but keeps the tiles
// from going empty if a category's work is ever removed).
const SERVICE_TILE_FILTER: Record<string, (p: WorkProject) => boolean> = {
  '01': p => p.category === 'Architectural' && p.propertyType !== 'Construction', // Property & Real Estate Film
  '02': p => p.category === 'Architectural', // Architectural Photography — property and construction both
  '03': p => p.category === 'Commercial', // Brand & Commercial Film
  '04': p => p.category === 'Commercial' || p.aspect === '9/16', // Social Media Content & Ads — commercial plus anything vertical/social-cut
  '05': () => true, // Pre-Production & Strategy — applies across every kind of shoot
  '06': p => p.category === 'Events', // Event Coverage
  '07': () => true, // Client Portal, Feedback & Booking — not tied to a shoot category
  '08': p => p.category === 'Architectural' && p.propertyType === 'Construction', // Development Campaigns
}

// Flattens each matching project into one tile per photo it has (not just
// a single tile per project) — most projects now ship several images
// rather than just a cover shot, and more real photos in the mix reads
// far better than cycling the same handful of thumbnails.
function tilePoolFor(serviceNum: string) {
  const filter = SERVICE_TILE_FILTER[serviceNum] ?? (() => true)
  const matches = WORK_PROJECTS.filter(filter)
  const pool = matches.length > 0 ? matches : WORK_PROJECTS
  const tiles: { img: string; vimeoId?: string }[] = []
  for (const p of pool) {
    if (p.thumb) tiles.push({ img: p.thumb, vimeoId: p.vimeoId })
    for (const img of p.images ?? []) {
      if (img !== p.thumb) tiles.push({ img })
    }
  }
  return tiles.length > 0 ? tiles : [{ img: pool[0]?.thumb || '' }]
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Service = { num: string; title: string; desc: string; longDesc: string }

const SERVICES: Service[] = [
  {
    num: '01',
    title: 'Property Photography & Film',
    desc: 'Photography and film that bring properties to life, from architectural details to lifestyle-driven films.',
    longDesc: 'Photography and film that bring properties to life. From architectural details to lifestyle-driven films, we create considered visual content that captures the feel of a space and makes people want more.',
  },
  {
    num: '02',
    title: 'Architectural Photography & Film',
    desc: 'A visual showcase to the highest detail, for flawless properties with distinguished features.',
    longDesc: 'A visual showcase to the highest detail — for flawless properties with distinguished features, captured in the best light.',
  },
  {
    num: '03',
    title: 'Brand & Commercial Film',
    desc: 'Brand films, campaign content and social-first video for businesses that want a point of view, not just footage.',
    longDesc: 'Brand films, campaign content and social-first video for businesses that want content with a point of view, not just footage. We work with you to understand the goals for your content and strategise to execute the perfect project.',
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
    desc: 'Full photo and video event coverage, from concerts and live activations to round tables and everything in between.',
    longDesc: 'Full photo and video event coverage — from concerts to live activations, sporting events, round tables and everything in between. We capture the energy of the space as well as the key moments.',
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
    desc: 'We work with developers to showcase their projects from start to finish.',
    longDesc: 'We work with developers to showcase their projects from start to finish — think pre-sale content with AI renders, site construction updates, and location and lifestyle showcases through to the completed project.',
  },
]

// Four distinct arrangements — each on an implicit grid with just enough
// overlap between neighbours to feel assembled rather than gridded, but
// spaced apart enough that each photo still reads clearly on its own.
// (An earlier pass had these overlapping 50%+, which just turned into an
// illegible blur where tiles met — these keep the overlap in the 10-20%
// range at most.)
const TILE_LAYOUTS: { top: string; left: string; width: number; z: number }[][] = [
  [ // 3-column, 2-row grid
    { top: '2%', left: '0%', width: 300, z: 1 },
    { top: '4%', left: '36%', width: 280, z: 2 },
    { top: '0%', left: '70%', width: 280, z: 1 },
    { top: '54%', left: '4%', width: 280, z: 2 },
    { top: '56%', left: '38%', width: 300, z: 1 },
    { top: '52%', left: '72%', width: 260, z: 2 },
  ],
  [ // 3-column grid, three-tile accent row below
    { top: '2%', left: '2%', width: 290, z: 1 },
    { top: '5%', left: '38%', width: 300, z: 2 },
    { top: '0%', left: '74%', width: 250, z: 1 },
    { top: '54%', left: '4%', width: 260, z: 2 },
    { top: '56%', left: '38%', width: 280, z: 1 },
    { top: '52%', left: '72%', width: 260, z: 2 },
  ],
  [ // 3-column masonry, slight vertical stagger per column
    { top: '2%', left: '0%', width: 290, z: 1 },
    { top: '10%', left: '34%', width: 270, z: 2 },
    { top: '0%', left: '68%', width: 290, z: 1 },
    { top: '54%', left: '4%', width: 280, z: 2 },
    { top: '60%', left: '38%', width: 300, z: 1 },
    { top: '50%', left: '72%', width: 260, z: 2 },
  ],
  [ // airy 2x3 grid, still the most breathing room per tile
    { top: '2%', left: '2%', width: 260, z: 1 },
    { top: '8%', left: '38%', width: 250, z: 2 },
    { top: '0%', left: '72%', width: 250, z: 1 },
    { top: '56%', left: '6%', width: 250, z: 1 },
    { top: '60%', left: '40%', width: 260, z: 2 },
    { top: '54%', left: '74%', width: 250, z: 1 },
  ],
]

function ServiceModal({ service, onClose }: { service: Service; onClose: () => void }) {
  const cursorRef = React.useRef<HTMLDivElement>(null)
  const tiles = React.useMemo(() => {
    const index = SERVICES.findIndex(s => s.num === service.num)
    const layout = TILE_LAYOUTS[index % TILE_LAYOUTS.length]
    const pool = shuffled(tilePoolFor(service.num))
    return layout.map((pos, i) => ({ ...pos, ...pool[i % pool.length] }))
  }, [service.num])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,8,0.85)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px, 3vw, 40px)' }}>
      <style>{`
        @keyframes tileFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        /* No box-shadow — against the modal's own near-black background
           a dark drop shadow just reads as an unwanted ring/border around
           every tile rather than a lift. */
        .service-tile { position: absolute; border-radius: 6px; overflow: hidden; transition: transform 0.3s ease, opacity 0.3s ease; animation: tileFloat 6s ease-in-out infinite; }
        /* object-fit: cover alone wasn't enough — several of the source
           thumbnails have a thin letterbox/matte baked into the image
           itself, which read as an unwanted "border" around the tile.
           Scaling the media up slightly crops that edge out regardless
           of which photo lands in a given slot. */
        .service-tile .tile-img, .service-tile .tile-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border: none; transform: scale(1.2); }
        .service-tile .tile-video { opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .tiles-wrap:hover .service-tile { opacity: 0.45; }
        /* !important here is load-bearing: each tile already carries an
           inline z-index (style={{zIndex: t.z}}), and an inline style
           always beats a plain class rule for the same property — without
           !important this hover rule would never actually win, so the
           hovered tile could still end up tucked behind a higher-z tile. */
        .service-tile:hover { opacity: 1 !important; transform: scale(1.15) !important; z-index: 999 !important; }
        .service-tile:hover .tile-video { opacity: 1; }
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
          style={{ position: 'relative', height: 'clamp(440px, 54vw, 560px)', margin: 'clamp(32px, 5vw, 56px) clamp(28px, 6vw, 64px) clamp(48px, 7vw, 72px)' }}
        >
          {tiles.map((t, i) => (
            <div key={i} className="service-tile" style={{ top: t.top, left: t.left, width: t.width, zIndex: t.z, aspectRatio: '4/3', animationDelay: `${i * 0.4}s` }}>
              <img className="tile-img" src={t.img} alt="" />
              {t.vimeoId && (
                <iframe
                  className="tile-video"
                  src={`https://player.vimeo.com/video/${t.vimeoId}?background=1&autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0&dnt=1`}
                  allow="autoplay; fullscreen"
                  frameBorder="0"
                />
              )}
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
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", position: 'relative' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <LogoWatermark />
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
