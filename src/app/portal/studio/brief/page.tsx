'use client'
import { useState, useEffect, useRef } from 'react'
import StudioSidebar from '../StudioSidebar'
import { supabase } from '@/lib/supabase'

export default function BriefPage() {
  const [address, setAddress] = useState('')
  const [addressInput, setAddressInput] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [propertyType, setPropertyType] = useState('Luxury residential')
  const [shootDate, setShootDate] = useState('')
  const [briefNotes, setBriefNotes] = useState('')
  const [savedBriefs, setSavedBriefs] = useState<any[]>([])
  const [loadingBriefs, setLoadingBriefs] = useState(true)
  const [expandedBrief, setExpandedBrief] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState<any>(null)
  const debounceRef = useRef<any>(null)

  useEffect(() => { loadSavedBriefs() }, [])

  async function loadSavedBriefs() {
    setLoadingBriefs(true)
    const { data } = await supabase.from('property_briefs').select('*').order('created_at', { ascending: false })
    if (data) setSavedBriefs(data)
    setLoadingBriefs(false)
  }

  async function saveBrief(briefData: any, addr: string) {
    await supabase.from('property_briefs').insert([{
      address: addr,
      property_data: briefData.property,
      weather: briefData.weather,
      mapbox_image_url: briefData.mapboxImageUrl,
      shoot_date: shootDate,
    }])
    loadSavedBriefs()
  }

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  async function searchAddresses(query: string) {
    if (!query || query.length < 3) { setSuggestions([]); return }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=NZ&types=address&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`)
      const data = await res.json()
      setSuggestions(data.features || [])
      setShowSuggestions(true)
    } catch (e) { setSuggestions([]) }
  }

  function handleAddressInput(val: string) {
    setAddressInput(val)
    setAddress('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchAddresses(val), 350)
  }

  function selectAddress(feature: any) {
    setAddress(feature.place_name)
    setAddressInput(feature.place_name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  async function generateBrief() {
    const addr = address || addressInput
    if (!addr) { setError('Please enter a property address'); return }
    setLoading(true)
    setError('')
    setBrief(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 58000)
      const res = await fetch('/api/property-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr, propertyType, shootDate, briefNotes }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setBrief(data)
      await saveBrief(data, address || addressInput)
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    }
    setLoading(false)
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <StudioSidebar active="brief" />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic' }}>Property Brief</div>
          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>AI-powered property research for shoot preparation</div>
        </div>

        <div style={{ padding: 28, maxWidth: 800 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Property details</div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <label style={lbl}>Property address</label>
                <input
                  style={inp}
                  value={addressInput}
                  onChange={e => handleAddressInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Start typing an address..."
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                    {suggestions.map((s, i) => (
                      <div key={i} onClick={() => selectAddress(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < suggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {s.place_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={lbl}>Property type</label>
                  <select style={inp} value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                    <option>Luxury residential</option>
                    <option>Standard residential</option>
                    <option>Multi-unit development</option>
                    <option>Commercial property</option>
                    <option>Lifestyle / rural</option>
                    <option>Architectural</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Shoot date</label>
                  <input style={inp} type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={lbl}>Additional notes</label>
                <textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, minHeight: 60 }} value={briefNotes} onChange={e => setBriefNotes(e.target.value)} placeholder="Access notes, specific features to highlight, client preferences..." />
              </div>
              {error && <div style={{ fontSize: 12, color: 'rgba(210,90,90,0.8)', padding: '10px 14px', background: 'rgba(210,90,90,0.08)', borderRadius: 4, border: '0.5px solid rgba(210,90,90,0.2)' }}>{error}</div>}
              <button onClick={generateBrief} disabled={loading} style={{ background: loading ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: loading ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', borderRadius: 3, padding: '12px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? '✦ Researching property — this may take up to 60 seconds...' : '✦ Generate property brief'}
              </button>
            </div>
          </div>

          {brief && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Property stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                {[
                  ['Bedrooms', brief.property?.bedrooms],
                  ['Bathrooms', brief.property?.bathrooms],
                  ['Garage', brief.property?.garageSpaces],
                  ['Floor size', brief.property?.floorSize],
                  ['Land size', brief.property?.landSize],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Valuation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  ['Rateable value', brief.property?.rateableValue],
                  ['Last sale price', brief.property?.lastSalePrice],
                  ['Last sale date', brief.property?.lastSaleDate],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '14px 16px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 6, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#C8C2BB' }}>{value || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Suburb & description */}
              {(brief.property?.suburbCharacter || brief.property?.description) && (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '18px 20px' }}>
                  {brief.property?.suburb && <div style={{ fontSize: 14, fontWeight: 500, color: '#C8C2BB', marginBottom: 10 }}>{brief.property.suburb}</div>}
                  {brief.property?.suburbCharacter && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7, marginBottom: brief.property?.description ? 12 : 0 }}>{brief.property.suburbCharacter}</div>}
                  {brief.property?.description && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.7, borderTop: brief.property?.suburbCharacter ? '0.5px solid rgba(200,194,187,0.08)' : 'none', paddingTop: brief.property?.suburbCharacter ? 12 : 0 }}>{brief.property.description}</div>}
                </div>
              )}

              {/* Satellite map */}
              {brief.mapboxImageUrl && (
                <div style={{ borderRadius: 7, overflow: 'hidden', border: '0.5px solid rgba(200,194,187,0.09)' }}>
                  <img src={brief.mapboxImageUrl} alt="Satellite view" style={{ width: '100%', display: 'block' }} />
                </div>
              )}

              {/* Weather */}
              {brief.weather && (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Shoot day forecast</div>
                  <div style={{ fontSize: 13, color: '#C8C2BB' }}>{brief.weather.condition}</div>
                  <div style={{ fontSize: 13, color: '#C8C2BB' }}>{brief.weather.minTemp}° – {brief.weather.maxTemp}°C</div>
                  <div style={{ fontSize: 13, color: brief.weather.rainChance > 50 ? 'rgba(100,150,220,0.9)' : 'rgba(200,194,187,0.5)' }}>{brief.weather.rainChance}% chance of rain</div>
                  {brief.property?.listingUrl && <a href={brief.property.listingUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(100,150,220,0.8)', textDecoration: 'none' }}>View listing →</a>}
                </div>
              )}

              <button onClick={() => setBrief(null)} style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>↻ Generate new brief</button>
            </div>
          )}
          {/* SAVED BRIEFS */}
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Saved property briefs</div>
              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{savedBriefs.length} brief{savedBriefs.length !== 1 ? 's' : ''}</span>
            </div>
            {loadingBriefs && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.3)' }}>Loading...</div>}
            {!loadingBriefs && savedBriefs.length === 0 && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)', padding: '20px 0' }}>No saved briefs yet — generate one above</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {savedBriefs.map(b => {
                const isExpanded = expandedBrief === b.id
                const p = b.property_data || {}
                return (
                  <div key={b.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedBrief(isExpanded ? null : b.id)} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{b.address}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>
                          {new Date(b.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {b.shoot_date ? ` · Shoot: ${new Date(b.shoot_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {b.weather && <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{b.weather.condition} · {b.weather.minTemp}°–{b.weather.maxTemp}°C</span>}
                        <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.3)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div style={{ padding: '0 18px 18px', borderTop: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 14, marginBottom: 14 }}>
                          {[['Bedrooms', p.bedrooms], ['Bathrooms', p.bathrooms], ['Garage', p.garageSpaces], ['Floor', p.floorSize], ['Land', p.landSize]].map(([label, value]) => (
                            <div key={label as string} style={{ background: 'rgba(61,71,86,0.3)', borderRadius: 5, padding: '10px 12px' }}>
                              <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{value || '—'}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                          {[['RV', p.rateableValue], ['Last sale', p.lastSalePrice], ['Sale year', p.lastSaleDate]].map(([label, value]) => (
                            <div key={label as string} style={{ background: 'rgba(61,71,86,0.2)', borderRadius: 5, padding: '10px 12px' }}>
                              <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 12, color: '#C8C2BB' }}>{value || '—'}</div>
                            </div>
                          ))}
                        </div>
                        {p.description && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.7, marginBottom: 14 }}>{p.description}</div>}
                        {b.mapbox_image_url && <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}><img src={b.mapbox_image_url} alt="Satellite" style={{ width: '100%', display: 'block' }} /></div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
