import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', color: '#C8C2BB', fontFamily: 'Inter, sans-serif' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 48px', borderBottom: '0.5px solid rgba(200,194,187,0.1)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="28" height="28" viewBox="0 0 120 120" fill="none">
            <path d="M25 15 L75 15 L95 40 L75 40 L75 28 L42 28 L42 92 L75 92 L75 80 L95 105 L25 105 Z" fill="#C8C2BB" opacity="0.85"/>
            <path d="M52 46 L95 46 L95 74 L52 74 L52 63 L84 63 L84 57 L52 57 Z" fill="#C8C2BB" opacity="0.55"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C8C2BB' }}>Example Content</span>
        </div>
        <div style={{ display: 'flex', gap: 36 }}>
          {['Work', 'Property', 'Services', 'About'].map(item => (
            <a key={item} href="#" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)', textDecoration: 'none' }}>{item}</a>
          ))}
        </div>
        <a href="/contact" style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', border: '0.5px solid rgba(200,194,187,0.4)', color: '#C8C2BB', padding: '10px 22px', borderRadius: 2, textDecoration: 'none' }}>Get in touch</a>
      </nav>

      {/* HERO */}
      <div style={{ position: 'relative', height: '100vh', minHeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 60px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1e2d3a 0%, #0e1318 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,12,16,0.92) 0%, rgba(10,12,16,0.2) 55%, transparent 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 32, height: 1, background: '#C8C2BB', opacity: 0.5 }} />
            <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.6)' }}>Property & architectural film specialists</span>
          </div>
          <h1 style={{ fontSize: 64, fontWeight: 500, lineHeight: 1.04, letterSpacing: '-0.025em', color: '#fff', maxWidth: 720, margin: 0 }}>
            We create content that <span style={{ color: '#C8C2BB' }}>moves</span> people.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.5)', marginTop: 20, maxWidth: 460, lineHeight: 1.65 }}>
            High-end video production and photography for property developers, real estate agents and architects across New Zealand.
          </p>
          <div style={{ display: 'flex', gap: 20, marginTop: 38, alignItems: 'center' }}>
            <a href="/work" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>View our work</a>
            <a href="#reel" style={{ color: 'rgba(200,194,187,0.65)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Watch showreel →</a>
          </div>
        </div>
      </div>

      {/* WORK SECTION */}
      <div style={{ padding: '64px 48px 0', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 32, borderBottom: '0.5px solid rgba(200,194,187,0.1)', marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>Selected work</p>
            <h2 style={{ fontSize: 36, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Property. Architecture. <span style={{ color: '#C8C2BB' }}>Commercial.</span></h2>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(200,194,187,0.45)', maxWidth: 300, textAlign: 'right', margin: 0 }}>80% of our portfolio is high-end property and architectural film.</p>
        </div>

        {/* PROJECT CARDS */}
        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 48 }}>
          {[
            { title: 'Hillside Retreat — Architectural Showcase', client: 'Luxury Residential · Havelock North', type: 'Property Film', bg: 'linear-gradient(145deg,#1e2d3a,#0d1620)' },
            { title: 'Ocean Bluff Residence', client: 'Premium Listing · Napier', type: 'Real Estate', bg: 'linear-gradient(145deg,#2a2016,#140e08)' },
            { title: 'Studio Forma — Built Works', client: 'Architect Portfolio · Hastings', type: 'Architecture', bg: 'linear-gradient(145deg,#1a2418,#0c1408)' },
            { title: 'The Terrace — Pre-Sale Campaign', client: 'Multi-Unit Development · Ahuriri', type: 'Development', bg: 'linear-gradient(145deg,#262018,#140e08)' },
            { title: 'Black Barn — Season Campaign', client: 'Brand Film · Hawke\'s Bay', type: 'Commercial', bg: 'linear-gradient(145deg,#1e1e2a,#0c0c16)' },
          ].map((proj, i) => (
            <div key={i} style={{ flex: 'none', width: i === 0 ? 580 : 340, cursor: 'pointer' }}>
              <div style={{ height: i === 0 ? 360 : 260, background: proj.bg, borderRadius: 3, position: 'relative', overflow: 'hidden', marginBottom: 14 }}>
                <span style={{ position: 'absolute', top: 14, left: 14, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.45)', color: '#C8C2BB', padding: '5px 10px', borderRadius: 2 }}>{proj.type}</span>
              </div>
              <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.38)', marginBottom: 5 }}>{proj.client}</p>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#fff', margin: 0 }}>{proj.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', margin: '0 48px', borderTop: '0.5px solid rgba(200,194,187,0.1)', borderBottom: '0.5px solid rgba(200,194,187,0.1)' }}>
        {[['200+','Properties filmed'],['80%','Property portfolio'],['4K','Cinema-grade output'],['NZ & AU','Markets served']].map(([val, label]) => (
          <div key={label} style={{ padding: '44px 24px', borderRight: '0.5px solid rgba(200,194,187,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 46, fontWeight: 500, color: '#fff', letterSpacing: '-0.03em' }}>{val}</div>
            <p style={{ fontSize: 11, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginTop: 6 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* SPECIALTY */}
      <div style={{ padding: '80px 48px', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div style={{ aspectRatio: '4/3', background: 'linear-gradient(145deg,#1e2d3a,#0d1620)', borderRadius: 4 }} />
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 16 }}>Our specialty</p>
            <h2 style={{ fontSize: 38, fontWeight: 500, lineHeight: 1.08, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>Cinematic property film for <span style={{ color: '#C8C2BB' }}>premium</span> listings.</h2>
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
      <div style={{ padding: '0 48px 80px', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <div style={{ paddingTop: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 44 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10 }}>What we offer</p>
            <h2 style={{ fontSize: 36, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>Full-service production, <span style={{ color: '#C8C2BB' }}>start to finish.</span></h2>
          </div>
          <a href="/services" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>All services</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[['01','Property & Real Estate Film'],['02','Architectural Photography'],['03','Development Campaigns'],['04','Brand & Commercial Film'],['05','Aerial & Drone Cinematography'],['06','Event Coverage']].map(([num, title], i) => (
            <div key={num} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 40px 24px 0', borderBottom: '0.5px solid rgba(200,194,187,0.08)', borderLeft: i % 2 === 1 ? '0.5px solid rgba(200,194,187,0.08)' : 'none', paddingLeft: i % 2 === 1 ? 40 : 0, cursor: 'pointer' }}>
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
      <div style={{ padding: '96px 48px', textAlign: 'center', borderTop: '0.5px solid rgba(200,194,187,0.1)' }}>
        <h2 style={{ fontSize: 50, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', marginBottom: 20 }}>Got a property to <span style={{ color: '#C8C2BB' }}>showcase?</span></h2>
        <p style={{ fontSize: 15, color: 'rgba(200,194,187,0.4)', marginBottom: 38 }}>Tell us about your listing or project and we'll be in touch within 24 hours.</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
          <a href="/contact" style={{ background: '#C8C2BB', color: '#111', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 2, textDecoration: 'none', fontWeight: 500 }}>Start a project</a>
          <a href="/portal" style={{ color: 'rgba(200,194,187,0.55)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>Client portal →</a>
        </div>
      </div>

      {/* PORTAL STRIP */}
      <div style={{ background: 'rgba(61,71,86,0.2)', borderTop: '0.5px solid rgba(200,194,187,0.1)', borderBottom: '0.5px solid rgba(200,194,187,0.1)', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.45)' }}><strong style={{ color: '#C8C2BB' }}>Client Portal</strong> — Access your projects, deliverables & shoot bookings</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/portal/client" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: 2, border: '0.5px solid rgba(200,194,187,0.25)', color: 'rgba(200,194,187,0.55)', textDecoration: 'none' }}>Client login</a>
          <a href="/portal/studio" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '9px 20px', borderRadius: 2, background: '#C8C2BB', color: '#111', textDecoration: 'none', fontWeight: 500 }}>Studio login</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(200,194,187,0.28)', letterSpacing: '0.08em' }}>© 2026 Example Content Ltd. Hawke's Bay, New Zealand.</p>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Instagram','Vimeo','LinkedIn','Privacy'].map(link => (
            <a key={link} href="#" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', textDecoration: 'none' }}>{link}</a>
          ))}
        </div>
      </footer>

    </main>
  )
}