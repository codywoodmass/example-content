'use client'
import React from 'react'
import SiteNav from '@/components/public/SiteNav'
import LogoWatermark from '@/components/public/LogoWatermark'
import SiteFooter from '@/components/public/SiteFooter'


const TICKER_BRANDS = ['Hartles & Co', 'Life Fitness', 'Lodge Real Estate', 'Tuatahi Fibre', 'ZeGroup', 'Flex Fitness', 'Lugtons Real Estate', 'IBM', 'DaSilva', 'Wake NZ', 'Stark Property', 'Trans-Tasman Business Circle', 'Hamilton City Council']

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789*#@!'

function ScrambleText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = React.useState('')
  const [started, setStarted] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  React.useEffect(() => {
    if (!started) return
    let frame = 0
    const totalFrames = 30
    const interval = setInterval(() => {
      frame++
      const progress = frame / totalFrames
      const revealCount = Math.floor(progress * text.length)
      let result = ''
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') { result += ' '; continue }
        if (i < revealCount) {
          result += text[i]
        } else if (i < revealCount + 4) {
          result += CHARS[Math.floor(Math.random() * CHARS.length)]
        } else {
          result += text[i]
        }
      }
      setDisplayed(result)
      if (frame >= totalFrames) clearInterval(interval)
    }, 40)
    return () => clearInterval(interval)
  }, [started, text])

  return <span>{displayed || text.replace(/[^ ]/g, ' ')}</span>
}

function StatementSection() {
  const [visible, setVisible] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} style={{ padding: 'clamp(24px, 4vw, 40px) clamp(20px, 5vw, 48px)', background: '#0E1014', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
      <h2 style={{ fontSize: 'clamp(34px, 5.8vw, 68px)', fontWeight: 400, color: '#fff', lineHeight: 1.15, letterSpacing: '0.02em', margin: 0, maxWidth: 1100, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase', opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}>
        <div>{visible && <ScrambleText text="GOOD CONTENT GETS LIKES." delay={0} />}</div>
        <div>{visible && <ScrambleText text="STRATEGIC CONTENT GETS RESULTS." delay={150} />}</div>
      </h2>
    </div>
  )
}

// The showreel is the hero's actual centerpiece, not just a backdrop. It
// pins in place (position: sticky) for a tall scroll range so there's room
// to choreograph: scrolling in fades the overlay text/nav away and zooms
// the video in slightly, reaching a clean, full-screen "centre point" with
// nothing but the video and its audio (ramped in via the Vimeo Player SDK,
// loaded at runtime rather than as an npm dependency, and held once it's
// up rather than fading back out); the video stays fully visible right up
// until the pin releases into the next section. Starts muted so autoplay
// is never blocked —
// the volume ramp only takes effect once unmuted, plus a manual toggle
// since some browsers won't honour a programmatic unmute without a prior
// click, and this is that click.
function ShowreelHero({ onNavOpacity }: { onNavOpacity: (v: number) => void }) {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const playerRef = React.useRef<any>(null)
  const [textOpacity, setTextOpacity] = React.useState(1)
  const [zoom, setZoom] = React.useState(1)
  const [muted, setMuted] = React.useState(true)
  const [indicatorOpacity, setIndicatorOpacity] = React.useState(0)

  // Holds a click that arrives before the SDK has finished loading, so it
  // isn't silently dropped — applied the moment the player is ready.
  const pendingMutedRef = React.useRef<boolean | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let pollId: ReturnType<typeof setInterval> | undefined
    function init() {
      if (cancelled || !iframeRef.current || playerRef.current || !(window as any).Vimeo) return
      const player = new (window as any).Vimeo.Player(iframeRef.current)
      player.setVolume(0).catch(() => {})
      playerRef.current = player
      if (pendingMutedRef.current !== null) {
        const wantMuted = pendingMutedRef.current
        player.setMuted(wantMuted)
        if (!wantMuted) player.setVolume(0.6)
        pendingMutedRef.current = null
      }
    }
    if ((window as any).Vimeo) {
      init()
    } else {
      const existing = document.querySelector('script[src="https://player.vimeo.com/api/player.js"]')
      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://player.vimeo.com/api/player.js'
        document.body.appendChild(script)
      }
      // Polling rather than relying solely on a 'load' listener — if the
      // script tag already existed from an earlier page and its load
      // event already fired, a listener attached now would never see it.
      pollId = setInterval(() => {
        if ((window as any).Vimeo) {
          clearInterval(pollId)
          init()
        }
      }, 150)
    }
    return () => { cancelled = true; if (pollId) clearInterval(pollId) }
  }, [])

  React.useEffect(() => {
    let raf = 0
    function measure() {
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollRange = rect.height - window.innerHeight
      const rawProgress = scrollRange > 0 ? -rect.top / scrollRange : 0
      const progress = Math.min(Math.max(rawProgress, 0), 1)

      // Stretched over a longer range (was /0.3) so the fade reads as a
      // slow dissolve rather than snapping out almost immediately.
      const txtOp = 1 - Math.min(progress / 0.45, 1)
      setTextOpacity(txtOp)
      // Once scrolled fully past the pinned hero, hand control back to
      // SiteNav's own scroll-direction show/hide — otherwise rawProgress
      // stays clamped at 1 forever and the nav would never come back.
      onNavOpacity(rawProgress >= 1 ? 1 : txtOp)
      // Zooms in toward the centre point, then eases back out — holding
      // the zoomed-in framing all the way to the end made the pin feel
      // like it was stuck.
      const zoomProgress = progress < 0.5 ? progress / 0.5 : (1 - progress) / 0.5
      setZoom(1 + zoomProgress * 0.15)

      // Ramps up to full volume, holds, then fades back out as the pin
      // nears release — so scrolling off the video fades the audio out
      // with it rather than cutting it dead or holding it blaring right
      // up to (and past) the point the video itself is no longer the
      // focus.
      let vol: number
      if (progress < 0.3) vol = progress / 0.3
      else if (progress < 0.75) vol = 1
      else vol = Math.max(0, 1 - (progress - 0.75) / 0.25)
      if (playerRef.current && !muted) playerRef.current.setVolume(vol).catch(() => {})

      // A light "scroll down" hint once the text/nav have fully dissolved
      // — i.e. we've reached the video-only centre point — fading back out
      // just before the pin releases into the next section.
      setIndicatorOpacity(txtOp < 0.05 && progress < 0.96 ? 0.4 : 0)
    }
    function onScroll() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    measure()
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [muted, onNavOpacity])

  function toggleSound() {
    // newMuted is the state we're switching TO. The previous version
    // passed `!newMuted` to both the player and setMuted — i.e. the OLD
    // value — so the click never actually changed anything, regardless
    // of which state it started from. That was the real bug; the button
    // looking broken had nothing to do with Vimeo or the network.
    const newMuted = !muted
    setMuted(newMuted)
    const player = playerRef.current
    if (!player) {
      pendingMutedRef.current = newMuted
      return
    }
    player.setMuted(newMuted)
    if (!newMuted) player.setVolume(0.6)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', height: '260vh' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 clamp(20px, 5vw, 48px) clamp(36px, 8vh, 60px)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', userSelect: 'none', transform: `scale(${zoom})`, transition: 'transform 0.1s linear' }}>
          <iframe
            ref={iframeRef}
            // No background=1 — Vimeo's background mode strips audio
            // entirely (by design, for silent decorative loops), which is
            // why the mute toggle never actually produced sound. Every
            // other param here reproduces the same chrome-free look
            // without that restriction.
            src="https://player.vimeo.com/video/1216750682?autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0&dnt=1"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100vw + 400px)', height: 'calc(100vh + 400px)', minWidth: '200vh', minHeight: '56.25vw', border: 'none', pointerEvents: 'none' }}
            allow="autoplay; fullscreen"
            frameBorder="0"
          />
        </div>
        {/* From-the-bottom gradient so the hero text sits on enough
            contrast on landing (~13% at its darkest), fading out with the
            same scroll progress as the text itself. */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,16,0.13) 0%, rgba(10,12,16,0.06) 50%, rgba(10,12,16,0) 80%)', zIndex: 1, opacity: textOpacity, transition: 'opacity 0.35s ease-out' }} />
        <button
          onClick={toggleSound}
          style={{ position: 'absolute', bottom: 'clamp(28px, 7vh, 52px)', right: 'clamp(20px, 5vw, 48px)', zIndex: 3, width: 44, height: 44, borderRadius: '50%', border: '0.5px solid rgba(200,194,187,0.18)', background: 'rgba(10,12,16,0.2)', color: '#C8C2BB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}
          aria-label={muted ? 'Unmute showreel' : 'Mute showreel'}
        >
          {/* A plain speaker outline — the only difference between muted
              and unmuted is whether the strike-through line is drawn,
              rather than swapping in a whole separate icon. */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 5V4L8 9H4z" />
            {muted && <line x1="19" y1="6" x2="4" y2="20" />}
          </svg>
        </button>
        {/* Scroll-down hint, only present once we've reached the
            video-only centre point (text/nav fully dissolved). */}
        <div
          style={{
            position: 'absolute', bottom: 'clamp(20px, 4vh, 32px)', left: '50%', transform: 'translateX(-50%)', zIndex: 3,
            opacity: indicatorOpacity, transition: 'opacity 0.5s ease', pointerEvents: 'none',
            color: '#C8C2BB', fontSize: 20, animation: 'heroScrollBounce 2s ease-in-out infinite',
          }}
          aria-hidden="true"
        >
          ↓
        </div>
        <div style={{ position: 'relative', zIndex: 2, opacity: textOpacity, transition: 'opacity 0.35s ease-out', pointerEvents: textOpacity < 0.05 ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 32, height: 1, background: '#C8C2BB', opacity: 0.5, flexShrink: 0 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)' }}>Architectural, Commercial and Event Specialists</span>
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 9vw, 80px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '0.02em', color: '#fff', maxWidth: 800, margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
            We create photo and video content that <span style={{ color: '#C8C2BB' }}>moves</span> people.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.5)', marginTop: 20, maxWidth: 460, lineHeight: 1.65 }}>
            From planning and strategy to execution and delivery — Example Content offers real estate agents, builders, developers, businesses and event managers high-end photo and video production.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 38, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/work" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>View our work</a>
            <span style={{ color: 'rgba(200,194,187,0.4)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll to watch ↓</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// id is a Vimeo id for video items; photo-only items (Orakei Sunset, Life
// Fitness ATMOS) omit it and rely on `thumb` alone — CarouselItem only
// mounts the hover-preview iframe when an id is actually present.
const RECENT_WORK = [
  { id: 'orakei-sunset', title: 'Orakei Sunset', client: 'Residential Listing · Orakei', type: 'Property Photography', thumb: '/images/work/orakei-sunset/1.jpg', noVideo: true },
  { id: '1234892305', title: 'Graeme Road', client: 'Residential Listing', type: 'Property Film', thumb: '/images/work/graeme-road/thumb.jpg' },
  { id: 'life-fitness-atmos', title: 'Life Fitness ATMOS', client: 'Life Fitness · Brand Shoot', type: 'Brand Photography', thumb: '/images/work/life-fitness-atmos/1.jpg', noVideo: true },
  { id: '1216750682', title: 'What We Do', client: 'Example Content · Showreel', type: 'Showreel', thumb: 'https://i.vimeocdn.com/video/2188265524-4fb9e0ca30cc6d8acb3df1a1c4259eee688d7929c486e1f353c4f0858475be60-d_1280x720?region=us' },
  { id: '1182465760', title: '23 Sullivan Road', client: 'Luxury Residential', type: 'Property Film', thumb: 'https://i.vimeocdn.com/video/2145085364-8d9dea98f801df737866495fc8d2a5478fa035bacadf0b509fe24095202d4f0f-d_1280x720?region=us' },
  { id: '1182467090', title: 'River Downs', client: 'Premium Listing', type: 'Property Film', thumb: 'https://i.vimeocdn.com/video/2145086135-8b197218926ba3cb5b7473637eec6b840a9145d41cf3fddf64b4692371696b72-d_1280x720?region=us' },
  { id: '1216751477', title: 'Social Project', client: 'Commercial · Wellington', type: 'Brand Film', thumb: 'https://i.vimeocdn.com/video/2188267258-642a37f197a11b257107e3026f603bd9b101e150481feba60d316c736e8fcedd-d_1280x720?region=us' },
  { id: '1216751475', title: 'Flex Fitness Taupo', client: 'Commercial · Taupo', type: 'Brand Film', thumb: 'https://i.vimeocdn.com/video/2188266630-2c8ea8c5eb08f67c7c3976794eae813194b3bfb49295bbc45436f3fb79a978a3-d_1280x720?region=us' },
  { id: '1216751474', title: 'Clyde Street', client: 'Residential Listing', type: 'Property Film', thumb: 'https://i.vimeocdn.com/video/2188266667-68b9d4ee59946fef552d97ba3dd5b3917302c427d524f800fbb8c2638e9fb654-d_1280x720?region=us' },
]

// Lazy-mounted hover-preview — the iframe only loads once actually
// hovered, so the 12 doubled carousel items don't all open a Vimeo stream
// the instant the homepage loads.
function CarouselItem({ proj }: { proj: typeof RECENT_WORK[number] }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <div className="carousel-item" onMouseEnter={() => setHovered(true)}>
      <div className="vid-thumb">
        <div className="vid-thumb-img" style={{ backgroundImage: proj.thumb ? `url(${proj.thumb})` : `url(https://vumbnail.com/${proj.id}_large.jpg), url(https://vumbnail.com/${proj.id}.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        {hovered && !('noVideo' in proj && proj.noVideo) && (
          <iframe
            src={`https://player.vimeo.com/video/${proj.id}?background=1&autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0`}
            allow="autoplay; fullscreen"
            frameBorder="0"
          />
        )}
      </div>
      <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.38)', marginBottom: 5 }}>{proj.client} · {proj.type}</p>
      <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', margin: 0 }}>{proj.title}</p>
    </div>
  )
}

// Same ambient-drift + edge-hover-accelerate pattern as the Our Work page's
// reel, so the two autoscrolling strips feel consistent across the site —
// just slower here, since this is a teaser, not the main browsing view.
function RecentWorkCarousel() {
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const trackRef = React.useRef<HTMLDivElement>(null)
  const extraSpeed = React.useRef(0)
  const cursorRef = React.useRef<HTMLDivElement>(null)
  // Pauses the ambient tick so it stops fighting a real scroll/drag input
  // (previously it rewrote scrollLeft from its own accumulator every
  // single frame, so any manual wheel/trackpad/drag input got overwritten
  // within ~16ms and felt completely unresponsive).
  const dragging = React.useRef(false)
  const paused = React.useRef(false)
  const wheelResumeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dragStartX = React.useRef(0)
  const dragStartScroll = React.useRef(0)

  const doubled = [...RECENT_WORK, ...RECENT_WORK]

  // scrollLeft rounds to the nearest whole pixel on assignment, so
  // accumulating a sub-1 speed directly into it (e.g. += 0.3) gets
  // truncated back to the same pixel every frame and never actually
  // moves. Accumulating in a plain float ref instead, and only writing
  // the (inevitably rounded) result to the DOM, keeps the fractional
  // progress alive between frames.
  const accum = React.useRef(0)
  React.useEffect(() => {
    let raf: number
    const BASE_SPEED = 0.3
    function tick() {
      const wrap = wrapRef.current
      const track = trackRef.current
      if (wrap && track && !dragging.current && !paused.current) {
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
  }, [])

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
    if (cursorRef.current) {
      cursorRef.current.style.left = e.clientX + 'px'
      cursorRef.current.style.top = e.clientY + 'px'
      cursorRef.current.style.opacity = '1'
      cursorRef.current.setAttribute('data-dir', x < rect.width / 2 ? '←' : '→')
    }
  }

  // Wheel/trackpad scroll — pause, let the browser handle it natively,
  // then resync the accumulator to wherever that left scrollLeft so the
  // ambient drift picks back up from there instead of snapping away.
  function onWheel() {
    paused.current = true
    clearTimeout(wheelResumeTimer.current)
    wheelResumeTimer.current = setTimeout(() => {
      if (wrapRef.current) accum.current = wrapRef.current.scrollLeft
      paused.current = false
    }, 500)
  }

  return (
    <>
      <style>{`
        .carousel-wrap { overflow: hidden; padding-bottom: 48px; cursor: none; position: relative; }
        .carousel-track { display: flex; gap: 20px; width: max-content; }
        .carousel-item { flex-shrink: 0; width: min(560px, 82vw); }
        .carousel-item iframe { pointer-events: none; }
        .carousel-item:hover iframe { pointer-events: auto; }
        .carousel-cursor { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999; width: 64px; height: 64px; border-radius: 50%; background: rgba(200,194,187,0.15); border: 1px solid rgba(200,194,187,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; font-size: 16px; opacity: 0; transition: opacity 0.2s ease; transform: translate(-50%, -50%); }
        .carousel-wrap:hover .carousel-cursor { opacity: 1; }
        .vid-thumb { position: relative; padding-top: 56.25%; border-radius: 3px; overflow: hidden; margin-bottom: 16px; background: #1a1f28; }
        .vid-thumb iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; opacity: 0; transition: opacity 0.4s ease; }
        .carousel-item:hover .vid-thumb iframe { opacity: 1; }
        .vid-thumb-img { position: absolute; inset: 0; background: #1a1f28; transition: opacity 0.4s ease; }
        .carousel-item:hover .vid-thumb-img { opacity: 0; }
      `}</style>

      <div
        ref={wrapRef}
        className="carousel-wrap"
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          extraSpeed.current = 0
          if (cursorRef.current) cursorRef.current.style.opacity = '0'
          if (wrapRef.current) accum.current = wrapRef.current.scrollLeft
        }}
        onWheel={onWheel}
        onPointerDown={e => { dragging.current = true; paused.current = true; dragStartX.current = e.clientX; dragStartScroll.current = wrapRef.current?.scrollLeft || 0 }}
        onPointerMove={e => { if (!dragging.current || !wrapRef.current) return; wrapRef.current.scrollLeft = dragStartScroll.current - (e.clientX - dragStartX.current) }}
        onPointerUp={() => { dragging.current = false; if (wrapRef.current) accum.current = wrapRef.current.scrollLeft; setTimeout(() => { paused.current = false }, 400) }}
        style={{ overflowX: 'scroll', scrollbarWidth: 'none' as const }}
      >
        <div ref={cursorRef} className="carousel-cursor">⟵ ⟶</div>
        <div ref={trackRef} className="carousel-track" style={{ padding: '0 clamp(20px, 5vw, 48px)' }}>
          {doubled.map((proj, i) => (
            <CarouselItem key={proj.id + '-' + i} proj={proj} />
          ))}
        </div>
      </div>
    </>
  )
}

export default function Home() {
  const [navOpacity, setNavOpacity] = React.useState(1)

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", position: 'relative' }}>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />

      <style>{`
        /* No overflow-x: hidden anywhere between here and the pinned hero
           below, not even on html/body — setting overflow-x to anything
           but visible forces that element's overflow-y to compute as
           auto (a real CSS rule), turning it into its own scroll
           container and breaking position: sticky inside it. The hero's
           full-bleed video is already clipped locally (each oversized
           layer sits inside its own overflow: hidden wrapper), so nothing
           here needs a page-level clip. */
        .ec-grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
        .ec-row-stack { display: flex; }
        @media (max-width: 860px) {
          .ec-grid-2 { grid-template-columns: 1fr !important; }
          .ec-row-stack { flex-direction: column; align-items: flex-start !important; gap: 16px; }
        }
      `}</style>
      <LogoWatermark />
      <SiteNav opacity={navOpacity} />
      {/* HERO / SHOWREEL — fades to black internally before releasing its
          scroll pin, so it hands off to the next section clean (no taper
          strip needed). */}
      <ShowreelHero onNavOpacity={setNavOpacity} />

      {/* STATEMENT SECTION */}
      <StatementSection />

      {/* WORK SECTION */}
      <div style={{ padding: 'clamp(24px, 5vw, 40px) 0 0', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <a href="/work" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, padding: '0 clamp(20px, 5vw, 48px)', paddingBottom: 40, marginBottom: 48, textDecoration: 'none' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>Selected work</p>
            <h2 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 400, color: '#fff', letterSpacing: '0.02em', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>Our recent work</h2>
          </div>
          <span style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.55)', whiteSpace: 'nowrap' }}>See more ⟶</span>
        </a>

        <RecentWorkCarousel />
      </div>

      {/* SERVICES */}
      <style>{`
        .ec-services-item { border-left: 0.5px solid rgba(200,194,187,0.08) !important; padding-left: 40px !important; }
        .ec-services-item:nth-child(odd) { border-left: none !important; padding-left: 0 !important; }
        @media (max-width: 860px) {
          .ec-services-item { border-left: none !important; padding-left: 0 !important; }
        }
      `}</style>
      <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(48px, 10vw, 80px)', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <div className="ec-row-stack" style={{ paddingTop: 60, justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 44 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>What we offer</p>
            <h2 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Full-service production, <span style={{ color: '#C8C2BB' }}>start to finish.</span></h2>
          </div>
          <a href="/services" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500, whiteSpace: 'nowrap' }}>All services</a>
        </div>
        <div className="ec-grid-2" style={{ gap: 0 }}>
          {[['01','Property & Real Estate Film'],['02','Architectural Photography'],['03','Brand & Commercial Film'],['04','Social Media Content & Ads'],['05','Pre-Production & Strategy'],['06','Event Coverage']].map(([num, title]) => (
            <div key={num} className="ec-services-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 24px 0', borderBottom: '0.5px solid rgba(200,194,187,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)', letterSpacing: '0.1em' }}>{num}</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TRUSTED BY TICKER */}
      <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.08)', borderBottom: '0.5px solid rgba(200,194,187,0.08)', overflow: 'hidden', padding: '20px 0', background: '#0E1014' }}>
        <style>{`
          @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          @keyframes heroScrollBounce { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, 6px); } }
          .ticker-track { display: flex; width: max-content; animation: ticker 48s linear infinite; }

        `}</style>
        <div style={{ marginBottom: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', fontFamily: 'Inter, sans-serif' }}>Trusted by</span>
        </div>
        <div className="ticker-track">
          {[...TICKER_BRANDS, ...TICKER_BRANDS].map((brand, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 42, fontWeight: 700, color: 'rgba(200,194,187,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Bebas Neue', sans-serif", padding: '0 48px', whiteSpace: 'nowrap' }}>{brand}</span>
              <span style={{ color: 'rgba(200,194,187,0.25)', fontSize: 28, fontWeight: 300, lineHeight: 1, padding: '0 4px' }}>—</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 'clamp(90px, 18vw, 140px) clamp(20px, 5vw, 48px) clamp(56px, 12vw, 96px)', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(30px, 7vw, 50px)', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>Got a project you want to <span style={{ color: '#C8C2BB' }}>showcase?</span></h2>
        <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.4)', marginBottom: 38 }}>Tell us about your listing or project and we'll be in touch within 24 hours.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/contact" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Start a project</a>
          <a href="/work" style={{ color: 'rgba(200,194,187,0.55)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>See our work →</a>
        </div>
      </div>

      <SiteFooter />

    </main>
  )
}