'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PropertyBriefPage() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [propertyType, setPropertyType] = useState('Luxury residential')
  const [shootPackage, setShootPackage] = useState('Full Property Highlights')
  const [briefNotes, setBriefNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState('')
  const [error, setError] = useState('')

  async function generateBrief() {
    if (!address) { setError('Please enter a property address'); return }
    setLoading(true)
    setError('')
    setBrief('')

    try {
      const res = await fetch('/api/property-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, propertyType, shootPackage, briefNotes }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setBrief(data.brief)
    } catch (e: any) {
      setError('Something went wrong generating the brief. Please try again.')
    }
    setLoading(false)
  }

  const inputStyle = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const labelStyle = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Property Brief Generator</div>
          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>AI-assisted shoot prep — talking points & shot list</div>
        </div>
        <button onClick={() => router.push('/portal/studio')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
      </div>

      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, maxWidth: 1200 }}>

        <div>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 16 }}>Property details</div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Property address</label>
              <input style={inputStyle} value={address} onChange={e => setAddress(e.target.value)} placeholder="e.g. 22 Mission Road, Havelock North" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Property type</label>
              <select style={inputStyle} value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                <option>Luxury residential</option>
                <option>Standard residential</option>
                <option>Multi-unit development</option>
                <option>Commercial property</option>
                <option>Lifestyle / rural</option>
                <option>Land</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Shoot package</label>
              <select style={inputStyle} value={shootPackage} onChange={e => setShootPackage(e.target.value)}>
                <option>Full Property Highlights</option>
                <option>Full Property Walkthrough</option>
                <option>Social Content Highlights</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Client brief notes (optional)</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' as const, lineHeight: 1.6 }} rows={4} value={briefNotes} onChange={e => setBriefNotes(e.target.value)} placeholder="Anything the client mentioned — style references, key features, target buyer..." />
            </div>

            {error && (
              <div style={{ background: 'rgba(210,90,90,0.1)', border: '0.5px solid rgba(210,90,90,0.3)', borderRadius: 4, padding: '10px 14px', fontSize: 12, color: 'rgba(210,90,90,0.9)', marginBottom: 14 }}>{error}</div>
            )}

            <button onClick={generateBrief} disabled={loading} style={{ width: '100%', background: '#C8C2BB', color: '#111', border: 'none', borderRadius: 3, padding: '12px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Researching property...' : 'Generate Property Brief'}
            </button>
          </div>
        </div>

        <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: 24, minHeight: 400 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 350, gap: 12 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(100,150,220,0.85)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>Searching for property data and drafting talking points...</div>
              <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.9} }`}</style>
            </div>
          )}

          {!loading && !brief && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 350, gap: 10, textAlign: 'center' as const }}>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📋</div>
              <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)' }}>Enter property details and generate a brief</div>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.25)', maxWidth: 300 }}>The crew will get talking points and a shot list tailored to this specific property.</div>
            </div>
          )}

          {!loading && brief && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Property Brief — {address}</span>
                <button onClick={() => navigator.clipboard.writeText(brief)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Copy text</button>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>{brief}</div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
