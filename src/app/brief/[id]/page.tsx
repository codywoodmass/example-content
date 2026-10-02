'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatTime12 } from '@/lib/time'

type Brief = { id: string; project_name: string; client_name: string; client_email: string; status: string; data: any; project_id: string | null }

export default function PublicBriefViewer() {
  const params = useParams()
  const id = params?.id as string
  const [brief, setBrief] = useState<Brief | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [briefFeedback, setBriefFeedback] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/view-brief?id=${id}`)
      .then(r => r.json())
      .then(data => { if (data.brief) setBrief(data.brief); else setNotFound(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function sendFeedback() {
    if (!briefFeedback.trim() || !brief) return
    setSubmitting(true)
    const res = await fetch('/api/public-brief-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefId: brief.id, action: 'feedback', feedback: briefFeedback }),
    })
    if (res.ok) setFeedbackSent(true)
    setSubmitting(false)
  }

  async function approve() {
    if (!brief) return
    setSubmitting(true)
    const res = await fetch('/api/public-brief-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefId: brief.id, action: 'approve' }),
    })
    if (res.ok) setBrief(b => b ? { ...b, status: 'approved' } : b)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
      </main>
    )
  }

  if (notFound || !brief) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 36, objectFit: 'contain', opacity: 0.6, marginBottom: 8 }} />
        <div style={{ color: 'rgba(200,194,187,0.5)', fontSize: 14 }}>This brief isn't available.</div>
        <div style={{ color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>It may not have been sent yet. Contact Example Content if you think this is a mistake.</div>
      </main>
    )
  }

  const d = brief.data || {}

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB' }}>
      <style>{`@media (max-width: 760px) { .ec-brief-grid { grid-template-columns: 1fr !important; } }`}</style>
      <div style={{ maxWidth: 800, margin: '0 auto', background: '#1A1F28', minHeight: '100vh' }}>
        {/* COVER SECTION */}
        <div style={{ padding: 'clamp(32px, 8vw, 48px) clamp(20px, 6vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 44, objectFit: 'contain', marginBottom: 24, opacity: 0.9 }} />
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>Production Brief — Prepared for</div>
          <div style={{ fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700, color: '#fff', marginBottom: 6 }}>{(brief.client_name || '').toUpperCase()}</div>
          <div style={{ fontSize: 16, color: 'rgba(200,194,187,0.5)', marginBottom: 32 }}>{brief.project_name}</div>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' as const }}>
            {d.shootDates && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Shoot Date</div><div style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>{d.shootDates}</div></div>}
            {d.shootStartTime && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Time</div><div style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>{formatTime12(d.shootStartTime)}{d.shootEndTime ? ' – ' + formatTime12(d.shootEndTime) : ''}</div></div>}
            {d.draftDue && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Draft Due</div><div style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>{d.draftDue}</div></div>}
            {d.finalsDue && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Finals Due</div><div style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>{d.finalsDue}</div></div>}
            {d.locations && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Location</div><div style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>{d.locations.split(',')[0]}</div></div>}
          </div>
        </div>
        {/* SCOPE SECTION */}
        <div style={{ padding: '32px clamp(20px, 6vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>The Scope</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 20 }}>{(d.jobType || '').toUpperCase()}</div>
          <div className="ec-brief-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10, fontWeight: 700 }}>Overview</div>
              <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.7)', lineHeight: 1.75 }}>{d.jobDescription}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 10, fontWeight: 700 }}>Deliverables</div>
              {(d.deliverables || []).map((del: any, i: number) => (
                <div key={i} style={{ borderBottom: '0.5px solid rgba(200,194,187,0.07)', paddingBottom: 10, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#C8C2BB', fontWeight: 500 }}>{del.quantity}x {del.name}</span>
                    {del.duration && <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', background: 'rgba(200,194,187,0.07)', padding: '2px 8px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.12)' }}>{del.duration}</span>}
                  </div>
                  {del.formats && del.formats.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>{del.formats.map((f: string, fi: number) => <span key={fi} style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', background: 'rgba(200,194,187,0.04)', padding: '2px 6px', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 2 }}>{f}</span>)}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* INVESTMENT SECTION */}
        {d.total > 0 && (
          <div style={{ padding: '32px clamp(20px, 6vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Investment</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 20 }}>PRICING</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {d.shootFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)' }}>Filming — {d.shootHours}hrs</span><span style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>${(d.shootFee || 0).toLocaleString()}</span></div>}
              {d.editFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)' }}>Editing — {d.editHours}hrs</span><span style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>${(d.editFee || 0).toLocaleString()}</span></div>}
              {d.showPreProd && d.calcPreProd > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)' }}>Pre-production — {d.preProdHours}hrs</span><span style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>${(d.calcPreProd || 0).toLocaleString()}</span></div>}
              {d.showTravel && d.calcTravel > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize: 14, color: 'rgba(200,194,187,0.55)' }}>Travel — {d.travelKm}km</span><span style={{ fontSize: 14, color: '#C8C2BB', fontWeight: 600 }}>${(d.calcTravel || 0).toFixed(2)}</span></div>}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,194,187,0.12)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)' }}>Subtotal</span><span style={{ fontSize: 13, color: '#C8C2BB' }}>${(d.subtotal || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)' }}>GST (15%)</span><span style={{ fontSize: 13, color: '#C8C2BB' }}>${(d.gst || 0).toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Total inc. GST</span><span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>${(d.total || 0).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        )}
        {/* TEAM SECTION */}
        {d.crew && d.crew.length > 0 && (
          <div style={{ padding: '32px clamp(20px, 6vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>The Team</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 20 }}>YOUR CREW</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {d.crew.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.08)', borderRadius: 6 }}>
                  {c.photoUrl ? <img src={c.photoUrl} alt={c.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(200,194,187,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'rgba(200,194,187,0.4)', flexShrink: 0 }}>{c.name?.[0]}</div>}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* EQUIPMENT SECTION */}
        {d.equipment && d.equipment.filter((e: any) => e.selected).length > 0 && (
          <div style={{ padding: '32px clamp(20px, 6vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Equipment</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 20 }}>GEAR LIST</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {d.equipment.filter((e: any) => e.selected).map((e: any, i: number) => (
                <span key={i} style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', background: 'rgba(200,194,187,0.05)', padding: '6px 14px', border: '0.5px solid rgba(200,194,187,0.12)', borderRadius: 4 }}>{e.name}</span>
              ))}
            </div>
          </div>
        )}
        {/* SHOT LISTS */}
        {d.shotLists && Object.keys(d.shotLists).length > 0 && d.slides && d.slides.filter((s: any) => s.type === 'shotlist').map((slide: any) => {
          const sl = d.shotLists[slide.id]
          if (!sl || !sl.shots || sl.shots.length === 0) return null
          const deliv = d.deliverables?.find((del: any) => del.id === sl.deliverableId)
          return (
            <div key={slide.id} style={{ padding: '32px clamp(20px, 6vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Shot List</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 20 }}>{deliv ? deliv.name.toUpperCase() : 'SHOTS'}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 0, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', fontWeight: 700 }}>Time</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', fontWeight: 700 }}>Shot</div>
                </div>
                {sl.shots.map((shot: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 0, padding: '12px 0', borderTop: '0.5px solid rgba(200,194,187,0.07)' }}>
                    <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.4)' }}>{shot.time || '—'}</div>
                    <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.7)', lineHeight: 1.6 }}>{shot.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {/* FEEDBACK / APPROVE SECTION */}
        <div style={{ padding: '32px clamp(20px, 6vw, 40px)' }}>
          {brief.status === 'approved' ? (
            <div style={{ padding: '16px 20px', background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, textAlign: 'center', fontSize: 13, color: 'rgba(100,200,130,0.9)' }}>✓ Brief approved — we will be in touch shortly</div>
          ) : feedbackSent ? (
            <div style={{ padding: '16px 20px', background: 'rgba(100,150,220,0.08)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 6, textAlign: 'center', fontSize: 13, color: 'rgba(100,150,220,0.9)' }}>✓ Feedback sent — Example Content will review and update your brief</div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 16 }}>Your response</div>
              <textarea value={briefFeedback} onChange={e => setBriefFeedback(e.target.value)} placeholder="Any changes or feedback? Let us know here..." style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '12px', fontSize: 13, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.65, resize: 'vertical' as const, minHeight: 100, marginBottom: 16, boxSizing: 'border-box' as const }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' as const }}>
                <button onClick={sendFeedback} disabled={submitting || !briefFeedback.trim()} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 18px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Send feedback</button>
                <button onClick={approve} disabled={submitting} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 24px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Approve brief</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
