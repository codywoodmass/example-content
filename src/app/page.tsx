'use client'
import React from 'react'
import Link from 'next/link'


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

  const lineStyle = (delay: number): React.CSSProperties => ({
    fontSize: 'clamp(40px, 6vw, 88px)',
    fontWeight: 400,
    color: '#fff',
    lineHeight: 1.0,
    letterSpacing: '0.04em',
    margin: 0,
    textTransform: 'uppercase' as const,
    fontFamily: "'Bebas Neue', sans-serif",
    opacity: visible ? 1 : 0,
    transition: `opacity 0.3s ease ${delay}ms`,
  })

  return (
    <div ref={ref} style={{ padding: 'clamp(44px, 10vw, 72px) clamp(20px, 5vw, 48px)', borderTop: '0.5px solid rgba(200,194,187,0.1)', background: '#0E1014' }}>
      <div style={{ maxWidth: 1100 }}>
        <h2 style={lineStyle(0)}>
          {visible && <ScrambleText text="CONTENT THAT LOOKS GOOD GETS LIKES." delay={0} />}
        </h2>
        <h2 style={{ ...lineStyle(200), marginTop: 4 }}>
          {visible && <ScrambleText text="CONTENT BUILT WITH STRATEGY GETS RESULTS." delay={200} />}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 40, opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 800ms' }}>
          <div style={{ width: 40, height: 1, background: 'rgba(200,194,187,0.3)' }} />
          <span style={{ fontSize: 13, color: 'rgba(200,194,187,0.45)', letterSpacing: '0.06em', fontFamily: 'Inter, sans-serif' }}>We build content with purpose — cinematic quality, commercial strategy.</span>
        </div>
      </div>
    </div>
  )
}

// Flip to false when the site is ready to go live — this only gates the
// public marketing homepage, not the portal or auth pages.
const UNDER_CONSTRUCTION = true

function UnderConstructionScreen() {
  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 24px' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 48, objectFit: 'contain', display: 'block', margin: '0 auto 40px' }} />
      <p style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)', marginBottom: 18 }}>Something new is coming</p>
      <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 400, color: '#fff', letterSpacing: '0.02em', margin: '0 0 20px', fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
        We're building our new site.
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.55)', maxWidth: 440, lineHeight: 1.7, margin: '0 0 36px' }}>
        Example Content is currently rebuilding our website. In the meantime, get in touch with us directly, or head to your portal below.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: 44 }}>
        <a href="mailto:cody@examplecontent.co.nz" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Email us</a>
        <a href="/portal/client" style={{ color: 'rgba(200,194,187,0.6)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Client portal →</a>
        <a href="/portal/studio" style={{ color: 'rgba(200,194,187,0.6)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Studio login →</a>
      </div>
      <p style={{ fontSize: 11, color: 'rgba(200,194,187,0.28)', letterSpacing: '0.08em' }}>© 2026 Example Content Ltd. Hawke's Bay, New Zealand.</p>
    </main>
  )
}

export default function Home() {
  const [navOpen, setNavOpen] = React.useState(false)

  if (UNDER_CONSTRUCTION) {
    return <UnderConstructionScreen />
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* NAV */}
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
        .ec-grid-2 { display: grid; grid-template-columns: 1fr 1fr; }
        .ec-row-stack { display: flex; }
        @media (max-width: 860px) {
          .ec-grid-2 { grid-template-columns: 1fr !important; }
          .ec-row-stack { flex-direction: column; align-items: flex-start !important; gap: 16px; }
        }
      `}</style>
      <nav className="ec-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(200,194,187,0.1)', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(14,16,20,0.75)', backdropFilter: 'blur(12px)' }}>
        <Link href="/" className="nav-logo">
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 40, objectFit: 'contain', display: 'block' }} />
        </Link>
        <div className="ec-nav-links">
          {['Work', 'Property', 'Services', 'About'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="nav-link" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)', textDecoration: 'none' }}>{item}</a>
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
        {['Work', 'Property', 'Services', 'About'].map(item => (
          <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setNavOpen(false)} style={{ fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.7)', textDecoration: 'none', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>{item}</a>
        ))}
        <a href="/contact" onClick={() => setNavOpen(false)} style={{ marginTop: 16, textAlign: 'center', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid rgba(200,194,187,0.4)', color: '#C8C2BB', padding: '12px 22px', borderRadius: 2, textDecoration: 'none' }}>Get in touch</a>
      </div>

      {/* HERO */}
      <div style={{ position: 'relative', height: '100vh', minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 clamp(20px, 5vw, 48px) clamp(36px, 8vh, 60px)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none', userSelect: 'none' }}>
          <iframe
            src="https://player.vimeo.com/video/1216748448?background=1&autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'calc(100vw + 400px)', height: 'calc(100vh + 400px)', minWidth: '200vh', minHeight: '56.25vw', border: 'none' }}
            allow="autoplay; fullscreen"
            frameBorder="0"
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,16,0.92) 0%, rgba(10,12,16,0.2) 40%, rgba(10,12,16,0.5) 100%)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 32, height: 1, background: '#C8C2BB', opacity: 0.5, flexShrink: 0 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)' }}>Property & architectural film specialists</span>
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 9vw, 80px)', fontWeight: 400, lineHeight: 1.05, letterSpacing: '0.02em', color: '#fff', maxWidth: 800, margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>
            We create content that <span style={{ color: '#C8C2BB' }}>moves</span> people.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.5)', marginTop: 20, maxWidth: 460, lineHeight: 1.65 }}>
            High-end video production and photography for property developers, real estate agents and architects across New Zealand.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 38, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/work" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>View our work</a>
            <a href="#reel" style={{ color: 'rgba(200,194,187,0.65)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Watch showreel →</a>
          </div>
        </div>
      </div>

      {/* HERO BOTTOM GRADIENT TAPER */}
      <div style={{ height: 120, marginTop: -120, background: 'linear-gradient(to bottom, transparent, #0E1014)', position: 'relative', zIndex: 3, pointerEvents: 'none' }} />

      {/* STATEMENT SECTION */}
      <StatementSection />

      {/* WORK SECTION */}
      <div style={{ padding: 'clamp(48px, 10vw, 80px) 0 0', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, padding: '0 clamp(20px, 5vw, 48px)', paddingBottom: 40, borderBottom: '0.5px solid rgba(200,194,187,0.1)', marginBottom: 48 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>Selected work</p>
            <h2 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 400, color: '#fff', letterSpacing: '0.02em', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>Property. Architecture. <span style={{ color: '#C8C2BB' }}>Commercial.</span></h2>
          </div>

        </div>

        {/* MOUSE-DRIVEN CAROUSEL */}
        <style>{`
          .carousel-wrap { overflow: hidden; padding-bottom: 48px; cursor: none; position: relative; }
          .carousel-track { display: flex; gap: 20px; width: max-content; transition: transform 0.1s linear; }
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
          className="carousel-wrap"
          id="carousel-wrap"
          onMouseMove={(e) => {
            const wrap = document.getElementById('carousel-wrap')
            const cursor = document.getElementById('carousel-cursor')
            if (!wrap) return
            const rect = wrap.getBoundingClientRect()
            const x = e.clientX - rect.left
            const zone = rect.width * 0.25
            let speed = 0
            if (x < zone) speed = -((zone - x) / zone) * 12
            else if (x > rect.width - zone) speed = ((x - (rect.width - zone)) / zone) * 12
            if (cursor) {
              cursor.style.left = e.clientX + 'px'
              cursor.style.top = e.clientY + 'px'
              cursor.style.opacity = '1'
              const dir = x < rect.width / 2 ? '←' : '→'
              cursor.setAttribute('data-dir', dir)
            }
            if (speed !== 0) {
              wrap.scrollLeft += speed
            }
          }}
          onMouseLeave={() => {
            const cursor = document.getElementById('carousel-cursor')
            if (cursor) cursor.style.opacity = '0'
          }}
          style={{ overflowX: 'scroll', scrollbarWidth: 'none' as const }}
        >
          <div id="carousel-cursor" className="carousel-cursor">⟵ ⟶</div>
          <div id="carousel-track" className="carousel-track" style={{ padding: '0 clamp(20px, 5vw, 48px)' }}>
            {[
              { id: '1216750682', title: 'What We Do', client: 'Example Content · Showreel', type: 'Showreel', thumb: 'https://i.vimeocdn.com/video/2188265524-4fb9e0ca30cc6d8acb3df1a1c4259eee688d7929c486e1f353c4f0858475be60-d_1280x720?region=us' },
              { id: '1182465760', title: '23 Sullivan Road', client: 'Luxury Residential · Hawkes Bay', type: 'Property Film', thumb: 'https://i.vimeocdn.com/video/2145085364-8d9dea98f801df737866495fc8d2a5478fa035bacadf0b509fe24095202d4f0f-d_1280x720?region=us' },
              { id: '1182467090', title: 'River Downs', client: 'Premium Listing · Hawkes Bay', type: 'Property Film', thumb: 'https://i.vimeocdn.com/video/2145086135-8b197218926ba3cb5b7473637eec6b840a9145d41cf3fddf64b4692371696b72-d_1280x720?region=us' },
              { id: '1216751477', title: 'Social Project', client: 'Commercial · Wellington', type: 'Brand Film', thumb: 'https://i.vimeocdn.com/video/2188267258-642a37f197a11b257107e3026f603bd9b101e150481feba60d316c736e8fcedd-d_1280x720?region=us' },
              { id: '1216751475', title: 'Flex Fitness Taupo', client: 'Commercial · Taupo', type: 'Brand Film', thumb: 'https://i.vimeocdn.com/video/2188266630-2c8ea8c5eb08f67c7c3976794eae813194b3bfb49295bbc45436f3fb79a978a3-d_1280x720?region=us' },
              { id: '1216751474', title: 'Clyde Street', client: 'Property Film · Hawkes Bay', type: 'Property Film', thumb: 'https://i.vimeocdn.com/video/2188266667-68b9d4ee59946fef552d97ba3dd5b3917302c427d524f800fbb8c2638e9fb654-d_1280x720?region=us' },
            ].map((proj, i) => (
              <div key={i} className="carousel-item">
                <div className="vid-thumb">
                  <div className="vid-thumb-img" style={{ backgroundImage: proj.thumb ? `url(${proj.thumb})` : `url(https://vumbnail.com/${proj.id}_large.jpg), url(https://vumbnail.com/${proj.id}.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <iframe
                    src={`https://player.vimeo.com/video/${proj.id}?background=1&autoplay=1&loop=1&muted=1&title=0&byline=0&portrait=0&controls=0&badge=0&autopause=0`}
                    allow="autoplay; fullscreen"
                    frameBorder="0"
                  />
                </div>
                <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.38)', marginBottom: 5 }}>{proj.client} · {proj.type}</p>
                <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', margin: 0 }}>{proj.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TEAM SECTION */}
      <div style={{ padding: 'clamp(56px, 12vw, 100px) clamp(20px, 5vw, 48px)', borderTop: '0.5px solid rgba(200,194,187,0.1)', background: '#0E1014' }}>
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
            <h2 style={{ fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 400, color: '#fff', lineHeight: 1.05, letterSpacing: '0.04em', margin: '0 0 28px', textTransform: 'uppercase', fontFamily: "'Bebas Neue', sans-serif" }}>
              We don't just show up with a camera. We show up with a plan.
            </h2>
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

      {/* TRUSTED BY TICKER */}
      <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.08)', borderBottom: '0.5px solid rgba(200,194,187,0.08)', overflow: 'hidden', padding: '20px 0', background: '#0E1014' }}>
        <style>{`
          @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .ticker-track { display: flex; width: max-content; animation: ticker 30s linear infinite; }

        `}</style>
        <div style={{ marginBottom: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', fontFamily: 'Inter, sans-serif' }}>Trusted by</span>
        </div>
        <div className="ticker-track">
          {['Hartles & Co', 'Life Fitness', 'Lodge Real Estate', 'Tuatahi Fibre', 'ZeGroup', 'Flex Fitness', 'Hartles & Co', 'Life Fitness', 'Lodge Real Estate', 'Tuatahi Fibre', 'ZeGroup', 'Flex Fitness'].map((brand, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 42, fontWeight: 700, color: 'rgba(200,194,187,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Bebas Neue', sans-serif", padding: '0 48px', whiteSpace: 'nowrap' }}>{brand}</span>
              <span style={{ color: 'rgba(200,194,187,0.25)', fontSize: 28, fontWeight: 300, lineHeight: 1, padding: '0 4px' }}>—</span>
            </div>
          ))}
        </div>
      </div>

      {/* SPECIALTY */}
      <div style={{ padding: 'clamp(48px, 10vw, 80px) clamp(20px, 5vw, 48px)', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <div className="ec-grid-2" style={{ gap: 'clamp(32px, 6vw, 64px)', alignItems: 'center' }}>
          <div style={{ aspectRatio: '4/3', background: 'linear-gradient(145deg,#1e2d3a,#0d1620)', borderRadius: 4 }} />
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 16 }}>Our specialty</p>
            <h2 style={{ fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 500, lineHeight: 1.08, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>Cinematic property film for <span style={{ color: '#C8C2BB' }}>premium</span> listings.</h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(200,194,187,0.5)', marginBottom: 32 }}>We work closely with real estate agents, developers and architects to produce content that sells — not just shows. 80% of our work is property, so we understand what buyers and investors respond to.</p>
            {['Luxury residential & lifestyle properties','Multi-unit development pre-sale campaigns','Architectural documentation & portfolio shoots','Aerial cinematography & drone coverage','Interior & lifestyle photography'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.08)', fontSize: 13, color: 'rgba(200,194,187,0.65)' }}>
                <span style={{ color: '#C8C2BB', opacity: 0.7 }}>—</span>{item}
              </div>
            ))}
            <a href="/property" style={{ display: 'inline-block', marginTop: 32, background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>See property work</a>
          </div>
        </div>
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
          {[['01','Property & Real Estate Film'],['02','Architectural Photography'],['03','Development Campaigns'],['04','Brand & Commercial Film'],['05','Aerial & Drone Cinematography'],['06','Event Coverage']].map(([num, title]) => (
            <div key={num} className="ec-services-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 24px 24px 0', borderBottom: '0.5px solid rgba(200,194,187,0.08)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)', letterSpacing: '0.1em' }}>{num}</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>{title}</span>
              </div>
              <span style={{ color: 'rgba(200,194,187,0.2)', fontSize: 16 }}>→</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: 'clamp(56px, 12vw, 96px) clamp(20px, 5vw, 48px)', textAlign: 'center', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <h2 style={{ fontSize: 'clamp(30px, 7vw, 50px)', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>Got a property to <span style={{ color: '#C8C2BB' }}>showcase?</span></h2>
        <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.4)', marginBottom: 38 }}>Tell us about your listing or project and we'll be in touch within 24 hours.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/contact" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Start a project</a>
          <a href="/portal/client" style={{ color: 'rgba(200,194,187,0.55)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Client portal →</a>
        </div>
      </div>

      {/* PORTAL STRIP */}
      <div className="ec-row-stack" style={{ background: 'rgba(61,71,86,0.2)', borderTop: '0.5px solid rgba(200,194,187,0.1)', borderBottom: '0.5px solid rgba(200,194,187,0.1)', padding: 'clamp(16px, 4vw, 20px) clamp(20px, 5vw, 48px)', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)' }}><strong style={{ color: '#C8C2BB' }}>Client Portal</strong> — Access your projects, deliverables & shoot bookings</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/portal/client" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: 2, border: '0.5px solid rgba(200,194,187,0.25)', color: 'rgba(200,194,187,0.55)', textDecoration: 'none' }}>Client login</a>
          <a href="/portal/studio" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: 2, background: '#C8C2BB', color: '#111', textDecoration: 'none', fontWeight: 500 }}>Studio login</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="ec-row-stack" style={{ padding: 'clamp(24px, 6vw, 32px) clamp(20px, 5vw, 48px)', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(200,194,187,0.28)', letterSpacing: '0.08em' }}>© 2026 Example Content Ltd. Hawke's Bay, New Zealand.</p>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {['Instagram','Vimeo','LinkedIn','Privacy'].map(link => (
            <a key={link} href="#" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>

    </main>
  )
}