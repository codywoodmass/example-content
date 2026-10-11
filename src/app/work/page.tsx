'use client'
import React from 'react'
import { useSiteGate } from '@/lib/sitePreview'
import SiteNav from '@/components/public/SiteNav'
import SiteFooter from '@/components/public/SiteFooter'
import { WORK_PROJECTS, WorkCategory, WorkProject } from '@/lib/workProjects'

const CATEGORIES: ('All' | WorkCategory)[] = ['All', 'Architectural', 'Commercial', 'Events']

function ProjectCard({ project, onSelect, style }: { project: WorkProject; onSelect: () => void; style?: React.CSSProperties }) {
  return (
    <div className="work-card" onClick={onSelect} style={{ cursor: 'pointer', ...style }}>
      <div className="work-thumb">
        <div className="work-thumb-img" style={{ backgroundImage: `url(${project.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {project.vimeoId && (
          <iframe
            src={`https://player.vimeo.com/video/${project.vimeoId}?background=1&autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0`}
            allow="autoplay; fullscreen"
            frameBorder="0"
          />
        )}
        <span className="work-thumb-cat">{project.category}</span>
      </div>
      <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.38)', margin: '14px 0 5px' }}>{project.client} · {project.type}</p>
      <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', margin: 0 }}>{project.title}</p>
    </div>
  )
}

function ReelView({ projects, onSelect }: { projects: WorkProject[]; onSelect: (p: WorkProject) => void }) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const extraSpeed = React.useRef(0)
  const dragging = React.useRef(false)
  const dragStartX = React.useRef(0)
  const dragStartScroll = React.useRef(0)
  const paused = React.useRef(false)

  // Rendered twice back-to-back so the wrap point is invisible — once the
  // real scroll position passes the first copy, we silently subtract its
  // width, landing on the identical pixel in the second copy.
  const doubled = [...projects, ...projects]

  // scrollLeft rounds to the nearest whole pixel on assignment, so a
  // sub-1 per-frame speed accumulated directly into it would get
  // truncated back to the same pixel every frame. Accumulating in a
  // plain float ref instead keeps the fractional progress alive between
  // frames; only the (inevitably rounded) result gets written to the DOM.
  const accum = React.useRef(0)
  React.useEffect(() => {
    let raf: number
    const BASE_SPEED = 0.5
    function tick() {
      const track = trackRef.current
      const wrap = wrapRef.current
      if (track && wrap && !dragging.current && !paused.current) {
        accum.current += BASE_SPEED + extraSpeed.current
        const half = track.scrollWidth / 2
        if (accum.current >= half) accum.current -= half
        if (accum.current < 0) accum.current += half
        wrap.scrollLeft = accum.current
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [projects.length])

  function onMouseMove(e: React.MouseEvent) {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect = wrap.getBoundingClientRect()
    const x = e.clientX - rect.left
    const zone = rect.width * 0.25
    let speed = 0
    if (x < zone) speed = -((zone - x) / zone) * 10
    else if (x > rect.width - zone) speed = ((x - (rect.width - zone)) / zone) * 10
    extraSpeed.current = speed
    const cursor = document.getElementById('reel-cursor')
    if (cursor) {
      cursor.style.left = e.clientX + 'px'
      cursor.style.top = e.clientY + 'px'
      cursor.style.opacity = '1'
    }
  }

  function nudge(dir: 1 | -1) {
    wrapRef.current?.scrollBy({ left: dir * 480, behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .reel-wrap { overflow-x: scroll; scrollbar-width: none; padding-bottom: 48px; cursor: none; }
        .reel-wrap::-webkit-scrollbar { display: none; }
        .reel-track { display: flex; gap: 20px; width: max-content; padding: 0 clamp(20px, 5vw, 48px); }
        .work-card { flex-shrink: 0; width: min(560px, 82vw); }
        .work-thumb { position: relative; padding-top: 56.25%; border-radius: 3px; overflow: hidden; background: #1a1f28; }
        .work-thumb iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s ease; pointer-events: none; }
        .work-card:hover .work-thumb iframe { opacity: 1; }
        .work-thumb-img { position: absolute; inset: 0; transition: opacity 0.4s ease; }
        .work-card:hover .work-thumb-img { opacity: 0; }
        .work-thumb-cat { position: absolute; top: 12px; left: 12px; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(200,194,187,0.7); background: rgba(10,12,16,0.6); padding: 5px 10px; border-radius: 2px; border: 0.5px solid rgba(200,194,187,0.15); }
        .reel-cursor { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 60; width: 60px; height: 60px; border-radius: 50%; background: rgba(200,194,187,0.12); border: 1px solid rgba(200,194,187,0.35); backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.2s ease; transform: translate(-50%, -50%); }
        .reel-arrow { position: absolute; top: 40%; transform: translateY(-50%); width: 48px; height: 48px; border-radius: 50%; border: 0.5px solid rgba(200,194,187,0.25); background: rgba(14,16,20,0.7); color: #C8C2BB; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; font-size: 16px; transition: background 0.2s; }
        .reel-arrow:hover { background: rgba(200,194,187,0.15); }
      `}</style>
      <div id="reel-cursor" className="reel-cursor" />
      <button className="reel-arrow" style={{ left: 8 }} onClick={() => nudge(-1)} aria-label="Scroll left">‹</button>
      <button className="reel-arrow" style={{ right: 8 }} onClick={() => nudge(1)} aria-label="Scroll right">›</button>
      <div
        ref={wrapRef}
        className="reel-wrap"
        onMouseMove={onMouseMove}
        onMouseEnter={() => { paused.current = false }}
        onMouseLeave={() => { extraSpeed.current = 0; const c = document.getElementById('reel-cursor'); if (c) c.style.opacity = '0' }}
        onPointerDown={e => { dragging.current = true; paused.current = true; dragStartX.current = e.clientX; dragStartScroll.current = wrapRef.current?.scrollLeft || 0 }}
        onPointerMove={e => { if (!dragging.current || !wrapRef.current) return; wrapRef.current.scrollLeft = dragStartScroll.current - (e.clientX - dragStartX.current) }}
        onPointerUp={() => { dragging.current = false; if (wrapRef.current) accum.current = wrapRef.current.scrollLeft; setTimeout(() => { paused.current = false }, 400) }}
        onPointerLeave={() => { dragging.current = false; if (wrapRef.current) accum.current = wrapRef.current.scrollLeft }}
      >
        <div ref={trackRef} className="reel-track">
          {doubled.map((p, i) => (
            <ProjectCard key={p.id + '-' + i} project={p} onSelect={() => onSelect(p)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function GridView({ projects, onSelect }: { projects: WorkProject[]; onSelect: (p: WorkProject) => void }) {
  return (
    <>
      <style>{`
        .work-thumb { position: relative; padding-top: 56.25%; border-radius: 3px; overflow: hidden; background: #1a1f28; }
        .work-thumb iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s ease; pointer-events: none; }
        .work-card:hover .work-thumb iframe { opacity: 1; }
        .work-thumb-img { position: absolute; inset: 0; transition: opacity 0.4s ease; }
        .work-card:hover .work-thumb-img { opacity: 0; }
        .work-thumb-cat { position: absolute; top: 12px; left: 12px; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(200,194,187,0.7); background: rgba(10,12,16,0.6); padding: 5px 10px; border-radius: 2px; border: 0.5px solid rgba(200,194,187,0.15); }
        .work-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px clamp(20px, 4vw, 40px); padding: 0 clamp(20px, 5vw, 48px) 60px; }
        @media (max-width: 760px) { .work-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div className="work-grid">
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onSelect={() => onSelect(p)} style={{ width: '100%' }} />
        ))}
      </div>
    </>
  )
}

// Fully custom video chrome instead of Vimeo's own control bar — no Vimeo
// logo/share/fullscreen row, just our own play and mute buttons, so the
// detail view never reads as "an embedded third-party player." The iframe
// isn't even mounted until the poster is clicked, which also means no
// request to Vimeo happens at all until someone actually wants to watch.
function CustomVimeoPlayer({ vimeoId, poster, title }: { vimeoId: string; poster?: string; title: string }) {
  const [started, setStarted] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const playerRef = React.useRef<any>(null)
  const [playing, setPlaying] = React.useState(true)
  const [muted, setMuted] = React.useState(false)
  const [hovering, setHovering] = React.useState(false)

  React.useEffect(() => {
    if (!started) return
    let cancelled = false
    function init() {
      if (cancelled || !iframeRef.current || !(window as any).Vimeo) return
      const player = new (window as any).Vimeo.Player(iframeRef.current)
      player.on('play', () => setPlaying(true))
      player.on('pause', () => setPlaying(false))
      player.on('ended', () => setPlaying(false))
      playerRef.current = player
    }
    if ((window as any).Vimeo) {
      init()
    } else {
      const existing = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')
      if (existing) existing.addEventListener('load', init)
      else {
        const script = document.createElement('script')
        script.src = 'https://player.vimeo.com/api/player.js'
        script.onload = init
        document.body.appendChild(script)
      }
    }
    return () => { cancelled = true }
  }, [started])

  function togglePlay() {
    const player = playerRef.current
    if (!player) return
    if (playing) player.pause()
    else player.play()
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation()
    const player = playerRef.current
    if (!player) return
    const next = !muted
    player.setMuted(next)
    setMuted(next)
  }

  if (!started) {
    return (
      <div
        onClick={() => setStarted(true)}
        style={{ position: 'absolute', inset: 0, cursor: 'pointer', backgroundImage: poster ? `url(${poster})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,9,11,0.3)' }} />
        <div style={{ position: 'relative', width: 76, height: 76, borderRadius: '50%', background: 'rgba(10,12,16,0.55)', border: '0.5px solid rgba(200,194,187,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }} aria-label={`Play ${title}`}>
          ▶
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=0&title=0&byline=0&portrait=0&controls=0&badge=0&dnt=1`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; fullscreen"
      />
      <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {(!playing || hovering) && (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(10,12,16,0.5)', border: '0.5px solid rgba(200,194,187,0.35)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, opacity: playing ? 0.75 : 1, transition: 'opacity 0.2s ease' }}>
            {playing ? '❙❙' : '▶'}
          </div>
        )}
      </div>
      <button
        onClick={toggleMute}
        style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 3, width: 40, height: 40, borderRadius: '50%', border: '0.5px solid rgba(200,194,187,0.35)', background: 'rgba(10,12,16,0.55)', color: '#C8C2BB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, backdropFilter: 'blur(6px)' }}
        aria-label={muted ? 'Unmute video' : 'Mute video'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '18px 0' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', margin: '0 0 6px' }}>{label}</p>
      <p style={{ fontSize: 15, color: '#fff', margin: 0 }}>{value}</p>
    </div>
  )
}

// A full takeover rather than a small centred box — scrolls like its own
// page (nav/footer included) so it reads as part of the site, not a popup
// to somewhere else.
function ProjectModal({ project, onClose }: { project: WorkProject; onClose: () => void }) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0E1014', zIndex: 200, overflowY: 'auto' }}>
      <style>{`
        .project-specs { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 0.5px solid rgba(200,194,187,0.1); border-bottom: 0.5px solid rgba(200,194,187,0.1); }
        .project-gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        @media (max-width: 760px) {
          .project-specs { grid-template-columns: 1fr; }
          .project-gallery-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <button onClick={onClose} style={{ position: 'fixed', top: 22, right: 'clamp(20px, 5vw, 40px)', zIndex: 10, fontSize: 28, color: 'rgba(200,194,187,0.6)', background: 'rgba(14,16,20,0.6)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', lineHeight: 1 }} aria-label="Close">×</button>
      <button onClick={onClose} style={{ position: 'fixed', top: 30, left: 'clamp(20px, 5vw, 48px)', zIndex: 10, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>← Back to work</button>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(90px, 14vh, 120px) clamp(20px, 5vw, 48px) 0' }}>
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 4, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
          {project.vimeoId ? (
            <CustomVimeoPlayer vimeoId={project.vimeoId} poster={project.thumb} title={project.title} />
          ) : (
            <img src={project.thumb} alt={project.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', margin: '0 0 8px' }}>{project.client} · {project.type}</p>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 400, color: '#fff', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', letterSpacing: '0.02em' }}>{project.title}</h1>
          </div>
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.7)', border: '0.5px solid rgba(200,194,187,0.25)', padding: '7px 14px', borderRadius: 2, whiteSpace: 'nowrap' }}>{project.category}</span>
        </div>

        {project.description && (
          <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.6)', lineHeight: 1.8, maxWidth: 680, marginTop: 20 }}>{project.description}</p>
        )}

        <div className="project-specs" style={{ marginTop: 40 }}>
          <Spec label="Client" value={project.client} />
          <Spec label="Category" value={project.category} />
          <Spec label="Type" value={project.type} />
        </div>

        {project.images && project.images.length > 0 && (
          <div style={{ marginTop: 56 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 20 }}>More from this project</p>
            <div className="project-gallery-grid">
              {project.images.map(src => (
                <img key={src} src={src} alt={project.title} style={{ width: '100%', borderRadius: 3, display: 'block' }} />
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 'clamp(56px, 10vw, 90px)' }} />
      </div>

      <SiteFooter />
    </div>
  )
}

export default function WorkPage() {
  const gate = useSiteGate()
  const [category, setCategory] = React.useState<'All' | WorkCategory>('All')
  const [view, setView] = React.useState<'reel' | 'grid'>('reel')
  const [selected, setSelected] = React.useState<WorkProject | null>(null)
  if (gate) return gate

  const filtered = category === 'All' ? WORK_PROJECTS : WORK_PROJECTS.filter(p => p.category === category)

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <SiteNav />

      <style>{`
        .cat-pill { transition: all 0.2s ease; cursor: pointer; }
        .cat-pill:hover { color: #fff !important; border-color: rgba(200,194,187,0.4) !important; }
        .view-toggle-btn { transition: all 0.2s ease; cursor: pointer; }
      `}</style>

      {/* HERO */}
      <div style={{ padding: 'clamp(120px, 20vh, 170px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 56px)' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 16 }}>Selected work</p>
        <h1 style={{ fontSize: 'clamp(44px, 10vw, 100px)', fontWeight: 400, lineHeight: 0.95, letterSpacing: '0.01em', color: '#fff', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', textShadow: '0 0 60px rgba(200,194,187,0.18)' }}>
          Our Work
        </h1>

        {/* CATEGORY FILTER */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 40 }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className="cat-pill"
              onClick={() => setCategory(cat)}
              style={{
                fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 2,
                border: `0.5px solid ${category === cat ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.15)'}`,
                background: category === cat ? '#C8C2BB' : 'transparent',
                color: category === cat ? '#111' : 'rgba(200,194,187,0.55)',
                fontWeight: category === cat ? 500 : 400,
              }}
            >{cat}</button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 4, border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 2, padding: 3 }}>
            {(['reel', 'grid'] as const).map(v => (
              <button
                key={v}
                className="view-toggle-btn"
                onClick={() => setView(v)}
                style={{
                  fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 2, border: 'none',
                  background: view === v ? 'rgba(200,194,187,0.15)' : 'transparent',
                  color: view === v ? '#fff' : 'rgba(200,194,187,0.4)',
                }}
              >{v}</button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEWER */}
      {filtered.length === 0 ? (
        <div style={{ padding: '60px clamp(20px, 5vw, 48px) 100px', textAlign: 'center', color: 'rgba(200,194,187,0.35)', fontSize: 14 }}>
          More {category} work coming soon.
        </div>
      ) : view === 'reel' ? (
        <ReelView projects={filtered} onSelect={setSelected} />
      ) : (
        <GridView projects={filtered} onSelect={setSelected} />
      )}

      {selected && <ProjectModal project={selected} onClose={() => setSelected(null)} />}

      <SiteFooter />
    </main>
  )
}
