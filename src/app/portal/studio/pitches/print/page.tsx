'use client'
import { useEffect, useState } from 'react'
import { formatTime12 } from '@/lib/time'

export default function PitchPrintPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pitch_print_data')
      if (stored) setData(JSON.parse(stored))
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (data) {
      setTimeout(() => window.print(), 800)
    }
  }, [data])

  if (!data) return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: 40, color: '#333' }}>
      <p>No pitch deck data found. Please go back and click "↓ PDF" from the pitch deck viewer.</p>
    </div>
  )

  const { slides, template, clientName, projectName, category, shootDates, shootStartTime, shootEndTime, draftDue, finalsDue, locations, shootDuration, shootDays, jobType, jobDescription, jobDeliverables, projectGoals, tone, references, deliverables, crew, equipment, pricingNotes, showDeposit, tcNotes, moodboardImages, deliveryEstimate, extraHours, shootHours, editHours, preProdHours, travelKm, rateFilming, rateEditing, ratePreProd, rateTravelKm, shootFee, editFee, calcPreProd, calcTravel, subtotal, gst, total, showPreProd, showTravel, shotLists } = data

  const DURATION_LABELS: Record<string, string> = {
    hourly: 'Hourly (2hr min)', halfday: 'Half day (4hrs)',
    fullday: 'Full day (8hrs)', multiday: 'Multi-day'
  }

  const TEMPLATES: Record<string, any> = {
    editorial: { bg: '#0C0E12', surfaceAlt: '#1A1F28', accent: '#C8C2BB', accentDim: 'rgba(200,194,187,0.5)', muted: 'rgba(200,194,187,0.28)', text: 'rgba(200,194,187,0.82)', border: 'rgba(200,194,187,0.09)', headingWeight: 700, headingSize: 52 },
    bold: { bg: '#050505', surfaceAlt: '#181818', accent: '#FFFFFF', accentDim: 'rgba(255,255,255,0.55)', muted: 'rgba(255,255,255,0.22)', text: 'rgba(255,255,255,0.88)', border: 'rgba(255,255,255,0.07)', headingWeight: 900, headingSize: 60 },
    clean: { bg: '#F4F2EF', surfaceAlt: '#ECEAE7', accent: '#111111', accentDim: 'rgba(0,0,0,0.45)', muted: 'rgba(0,0,0,0.28)', text: 'rgba(0,0,0,0.72)', border: 'rgba(0,0,0,0.07)', headingWeight: 700, headingSize: 52 },
  }

  const t = TEMPLATES[template] || TEMPLATES.editorial
  const HW = t.headingWeight
  const HS = t.headingSize

  const slideStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    background: t.bg,
    boxSizing: 'border-box',
    padding: '72px 96px 56px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    pageBreakAfter: 'always',
    overflow: 'hidden',
  }

  const altSlideStyle: React.CSSProperties = {
    ...slideStyle,
    background: t.surfaceAlt,
  }

  const footer = (idx: number) => (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 96px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `0.5px solid ${t.border}`, background: 'inherit' }}>
      <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: t.muted, fontWeight: 700 }}>EXAMPLE CONTENT</span>
      <span style={{ fontSize: 11, color: t.muted }}>{idx + 1} / {slides.length}</span>
    </div>
  )

  const label = (text: string) => (
    <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: t.muted, fontWeight: 700, marginBottom: 24 }}>{text}</div>
  )

  const rule = () => <div style={{ height: 0.5, background: t.border, margin: '28px 0' }} />

  function renderSlide(slide: any, idx: number) {
    const base = idx % 2 === 0 ? slideStyle : altSlideStyle

    if (slide.type === 'cover') return (
      <div key={idx} style={{ ...base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ marginBottom: 48 }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 70, objectFit: 'contain', opacity: 0.9 }} />
        </div>
        <div style={{ height: 0.5, background: t.border, width: 80, marginBottom: 48 }} />
        <div style={{ marginBottom: 12, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted }}>Production Brief &mdash; Prepared for</div>
        <div style={{ fontSize: HS * 0.85, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 16 }}>{(clientName || '').toUpperCase()}</div>
        <div style={{ fontSize: 22, color: t.accentDim, marginBottom: 48 }}>{projectName}</div>
        <div style={{ height: 0.5, background: t.border, width: 80, marginBottom: 48 }} />
        <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {shootDates && <div><div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Shoot Date</div><div style={{ fontSize: 14, color: t.accent, fontWeight: 600 }}>{shootDates}{shootStartTime ? ' at ' + formatTime12(shootStartTime) : ''}</div></div>}
          {draftDue && <div><div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Draft Due</div><div style={{ fontSize: 14, color: t.accent, fontWeight: 600 }}>{draftDue}</div></div>}
          {finalsDue && <div><div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Finals Due</div><div style={{ fontSize: 14, color: t.accent, fontWeight: 600 }}>{finalsDue}</div></div>}
          {locations && <div><div style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Location</div><div style={{ fontSize: 14, color: t.accent, fontWeight: 600 }}>{locations.split(',')[0]}</div></div>}
        </div>
        {footer(idx)}
      </div>
    )

    if (slide.type === 'brief') return (
      <div key={idx} style={base}>
        {label('The Scope')}
        <div style={{ fontSize: HS * 0.55, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 28 }}>{(jobType || 'Job Type').toUpperCase()}</div>
        {rule()}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 16, fontWeight: 700 }}>Overview</div>
            <div style={{ fontSize: 14, color: t.text, lineHeight: 1.75 }}>{jobDescription}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 16, fontWeight: 700 }}>Deliverables</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(deliverables || []).map((d: any, i: number) => (
                <div key={i} style={{ borderBottom: `0.5px solid ${t.border}`, paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, color: t.text, fontWeight: 500 }}>{d.quantity}x {d.name}</div>
                    {d.duration && <div style={{ fontSize: 11, color: t.accent, background: 'rgba(200,194,187,0.08)', padding: '2px 10px', borderRadius: 2, border: `0.5px solid ${t.border}` }}>{d.duration}</div>}
                  </div>
                  {d.formats && d.formats.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {d.formats.map((fmt: string, fi: number) => (
                        <span key={fi} style={{ fontSize: 10, color: t.muted, background: 'rgba(200,194,187,0.04)', padding: '2px 8px', borderRadius: 2, border: `0.5px solid ${t.border}` }}>{fmt}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {rule()}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {shootDates && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Shoot Date</div><div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>{shootDates}</div></div>}
          {(shootStartTime || shootEndTime) && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Time</div><div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>{formatTime12(shootStartTime)}{shootEndTime ? ' – ' + formatTime12(shootEndTime) : ''}</div></div>}
          {draftDue && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Draft Due</div><div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>{draftDue}</div></div>}
          {finalsDue && <div><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Finals Due</div><div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>{finalsDue}</div></div>}
          {locations && <div style={{ gridColumn: 'span 4' }}><div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 6 }}>Location(s)</div><div style={{ fontSize: 13, color: t.accent, fontWeight: 600 }}>{locations}</div></div>}
        </div>
        {footer(idx)}
      </div>
    )

   if (slide.type === 'deliverables') return (
      <div key={idx} style={base}>
        {label('Scope & Deliverables')}
        <div style={{ fontSize: HS * 0.55, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 32 }}>WHAT YOU RECEIVE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {(deliverables || []).map((d: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 28, padding: '20px 24px', background: t.surfaceAlt, alignItems: 'center' }}>
              <div style={{ fontSize: 22, color: t.muted, minWidth: 40, fontWeight: 700 }}>{String(i+1).padStart(2,'0')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, color: t.accent, fontWeight: 700, marginBottom: 4 }}>{d.name}</div>
                <div style={{ fontSize: 14, color: t.accentDim }}>{[d.quantity > 1 ? `${d.quantity}x` : '', d.duration, (d.formats || []).join(' · ')].filter(Boolean).join(' — ')}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, fontSize: 14, color: t.muted }}>Delivery estimate: <span style={{ color: t.accentDim }}>{deliveryEstimate}</span></div>
        {footer(idx)}
      </div>
    )

    if (slide.type === 'team') return (
      <div key={idx} style={{ ...base, padding: '56px 72px 56px' }}>
        {label('Your Team')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, flex: 1, minHeight: 0 }}>
          {(crew || []).filter((c: any) => c.selected).map((c: any, i: number) => (
            <div key={i} style={{ borderRadius: 4, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={c.name} style={{ width: '100%', flex: 1, objectFit: 'cover', objectPosition: 'top center', minHeight: 0 }} />
              ) : (
                <div style={{ flex: 1, background: t.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 700, color: t.accent }}>{(c.name || '').split(' ').map((n: string) => n[0]).join('')}</div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)', padding: '48px 16px 16px' }}>
                <div style={{ fontSize: 18, color: '#fff', fontWeight: 700, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{c.role}</div>
                {c.bio && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{c.bio}</div>}
              </div>
            </div>
          ))}
        </div>
        {(equipment || []).filter((e: any) => e.selected).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.muted, marginBottom: 10, fontWeight: 700 }}>Equipment</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(equipment || []).filter((e: any) => e.selected).map((e: any, i: number) => (
                <span key={i} style={{ fontSize: 12, padding: '4px 14px', border: `0.5px solid ${t.border}`, color: t.accentDim }}>{e.name}</span>
              ))}
            </div>
          </div>
        )}
        {footer(idx)}
      </div>
    )

    if (slide.type === 'moodboard') return (
      <div key={idx} style={base}>
        {label('Moodboard')}
        <div style={{ display: 'grid', gridTemplateColumns: (moodboardImages || []).length <= 2 ? `repeat(${(moodboardImages || []).length || 1}, 1fr)` : 'repeat(3, 1fr)', gap: 16, flex: 1, minHeight: 0 }}>
          {((moodboardImages || []).length > 0 ? moodboardImages : [null, null, null, null, null, null]).map((entry: any, i: number) => {
            if (!entry) return <div key={i} style={{ background: t.surfaceAlt, borderRadius: 4 }} />
            const isVideo = entry.startsWith('video:')
            const thumb = isVideo ? entry.split(':').pop() : entry
            return (
              <div key={i} style={{ borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {isVideo && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}><div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>▶</div></div>}
              </div>
            )
          })}
        </div>
        {footer(idx)}
      </div>
    )

    if (slide.type === 'investment') return (
      <div key={idx} style={base}>
        {label('Investment')}
        <div style={{ fontSize: HS * 0.55, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 32 }}>PRICING</div>
        <div style={{ flex: 1 }}>
          {shootFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: `0.5px solid ${t.border}` }}><span style={{ fontSize: 15, color: t.accentDim }}>Filming &mdash; {shootHours}hrs</span><span style={{ fontSize: 15, color: t.accent, fontWeight: 700 }}>{'$'+(shootFee||0).toLocaleString()}</span></div>}
          {editFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: `0.5px solid ${t.border}` }}><span style={{ fontSize: 15, color: t.accentDim }}>Editing &mdash; {editHours}hrs</span><span style={{ fontSize: 15, color: t.accent, fontWeight: 700 }}>{'$'+(editFee||0).toLocaleString()}</span></div>}
          {showPreProd && calcPreProd > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: `0.5px solid ${t.border}` }}><span style={{ fontSize: 15, color: t.accentDim }}>Pre-production &mdash; {preProdHours}hrs</span><span style={{ fontSize: 15, color: t.accent, fontWeight: 700 }}>{'$'+(calcPreProd||0).toLocaleString()}</span></div>}
          {showTravel && calcTravel > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: `0.5px solid ${t.border}` }}><span style={{ fontSize: 15, color: t.accentDim }}>Travel &mdash; {travelKm}km</span><span style={{ fontSize: 15, color: t.accent, fontWeight: 700 }}>{'$'+(calcTravel||0).toFixed(2)}</span></div>}
          {(equipment||[]).filter((e:any)=>e.hire).map((e:any,i:number)=><div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: `0.5px solid ${t.border}` }}><span style={{ fontSize: 15, color: t.accentDim }}>{e.name} hire x{e.days}</span><span style={{ fontSize: 15, color: t.accent, fontWeight: 700 }}>{'$'+(e.hireRate*e.days).toLocaleString()}</span></div>)}
          <div style={{ marginTop: 20, borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 14, color: t.muted }}>Subtotal</span><span style={{ fontSize: 14, color: t.accent }}>{'$'+(subtotal||0).toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><span style={{ fontSize: 14, color: t.muted }}>GST (15%)</span><span style={{ fontSize: 14, color: t.accent }}>{'$'+(gst||0).toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 18, fontWeight: 700, color: t.accent }}>Total inc. GST</span><span style={{ fontSize: 22, fontWeight: 900, color: t.accent }}>{'$'+(total||0).toLocaleString()}</span></div>
          </div>
          {pricingNotes && <div style={{ fontSize: 14, color: t.muted, marginTop: 16 }}>{pricingNotes}</div>}
        </div>
        {showDeposit && <div style={{ padding: '16px 20px', background: t.surfaceAlt, fontSize: 14, color: t.muted, marginTop: 16 }}>50% deposit required to confirm. Balance due on delivery.</div>}
        {footer(idx)}
      </div>
    )

    if (slide.type === 'shotlist') {
      const sl = (shotLists || {})[slide.id] || { deliverableId: '', shots: [] }
      const deliv = (deliverables || []).find((d: any) => d.id === sl.deliverableId)
      return (
        <div key={idx} style={base}>
          {label('Shot List')}
          <div style={{ fontSize: HS * 0.55, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: 28 }}>{deliv ? deliv.name.toUpperCase() : 'SHOT LIST'}</div>
          <div style={{ height: 0.5, background: t.border, marginBottom: 28 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0, marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, fontWeight: 700 }}>Time</div>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, fontWeight: 700 }}>Shot</div>
            </div>
            {(sl.shots || []).map((shot: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 0, padding: '14px 0', borderTop: `0.5px solid ${t.border}` }}>
                <div style={{ fontSize: 14, color: t.muted }}>{shot.time || '—'}</div>
                <div style={{ fontSize: 15, color: t.text, lineHeight: 1.6 }}>{shot.description}</div>
              </div>
            ))}
          </div>
          {footer(idx)}
        </div>
      )
    }
    if (slide.type === 'terms') return (
      <div key={idx} style={base}>
        {label('Terms & Conditions')}
        <div style={{ fontSize: HS * 1.1, fontWeight: HW, color: t.accent, lineHeight: 0.95, letterSpacing: '-0.03em', marginBottom: 40 }}>LET'S GET<br/>THIS<br/>STARTED.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {['Proposal valid 14 days from issue', '50% deposit to confirm, balance due on delivery', 'Cancellations within 48hrs incur a 25% fee', 'Example Content retains portfolio rights unless waiver requested in writing', 'All prices exclude GST', 'Files delivered via Google Drive, retained 60 days', tcNotes].filter(Boolean).map((tc: string, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 14, fontSize: 14, color: t.text, lineHeight: 1.6 }}>
              <span style={{ color: t.muted, flexShrink: 0 }}>—</span>{tc}
            </div>
          ))}
        </div>
        {footer(idx)}
      </div>
    )

    return <div key={idx} style={base}><div style={{ color: t.muted }}>{slide.label}</div>{footer(idx)}</div>
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: landscape; margin: 0; }
          body { margin: 0; }
        }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      {(slides || []).map((slide: any, idx: number) => renderSlide(slide, idx))}
    </>
  )
}
