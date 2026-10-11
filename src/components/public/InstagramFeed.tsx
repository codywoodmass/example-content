'use client'
import React from 'react'

const HANDLE = 'examplecontent' // TODO: confirm the real @handle

type IGItem = { id: string; image: string; permalink: string; caption: string }

function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function InstagramFeed() {
  const [items, setItems] = React.useState<IGItem[]>([])
  const [configured, setConfigured] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/instagram')
      .then(r => r.json())
      .then(data => { setConfigured(!!data.configured); setItems(data.items || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return null

  return (
    <div style={{ padding: '0 clamp(20px, 5vw, 48px) clamp(56px, 10vw, 90px)', borderTop: '0.5px solid rgba(200,194,187,0.1)', paddingTop: 48 }}>
      <style>{`
        .ig-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
        .ig-tile { position: relative; aspect-ratio: 1; overflow: hidden; background: #1a1f28; display: block; }
        .ig-tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
        .ig-tile:hover img { transform: scale(1.06); }
        .ig-badge { position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 4px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); color: #fff; display: flex; align-items: center; justify-content: center; }
        @media (max-width: 760px) { .ig-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 400, color: '#fff', margin: 0, fontFamily: "'Bebas Neue', sans-serif", textTransform: 'uppercase' }}>Follow along</h2>
        <a href={`https://instagram.com/${HANDLE}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.55)', textDecoration: 'none' }}>@{HANDLE} →</a>
      </div>

      {configured && items.length > 0 ? (
        <div className="ig-grid">
          {items.map(item => (
            <a key={item.id} className="ig-tile" href={item.permalink} target="_blank" rel="noopener noreferrer" title={item.caption}>
              <img src={item.image} alt={item.caption || 'Instagram post'} />
              <div className="ig-badge"><InstagramGlyph /></div>
            </a>
          ))}
        </div>
      ) : (
        <a
          href={`https://instagram.com/${HANDLE}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '36px 24px', border: '0.5px dashed rgba(200,194,187,0.2)', borderRadius: 4, color: 'rgba(200,194,187,0.5)', fontSize: 13, textDecoration: 'none' }}
        >
          <InstagramGlyph /> See our latest on Instagram
        </a>
      )}
    </div>
  )
}
