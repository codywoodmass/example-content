'use client'
import { useEffect, useState } from 'react'

const DOC = {
  bg: '#FFFFFF', pageBg: '#F4F2EF', text: 'rgba(0,0,0,0.75)', heading: '#111111',
  muted: 'rgba(0,0,0,0.42)', faint: 'rgba(0,0,0,0.28)', border: 'rgba(0,0,0,0.1)',
  highlightBg: '#F4F2EF',
}

const TERMS = [
  'This quote is valid for 14 days from the date of issue.',
  'A 25% deposit is required to confirm this booking, with the balance due on delivery.',
  'Postponement or cancellation within 24 hours of the scheduled shoot date, for reasons other than adverse weather, will incur a fee of 25% of the total quoted cost.',
  'Example Content Ltd retains full intellectual property rights over all footage and photography produced, and reserves the right to use this material for portfolio, marketing and promotional purposes.',
  'All prices quoted are exclusive of GST, which will be applied at the prevailing rate.',
  'Final deliverables are stored securely in Google Drive for 12 months from the date of delivery, after which files will be permanently deleted — please download and retain your own copies.',
]

export default function QuotePrintPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('quote_print_data')
      if (stored) setData(JSON.parse(stored))
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 800)
  }, [data])

  if (!data) return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: 40, color: '#333' }}>
      <p>No quote data found. Please go back and click "↓ Save as PDF" from the Quote Generator.</p>
    </div>
  )

  const { clientName, contactName, projectName, category, jobType, jobDescription, shootDates, locations,
    deliveryEstimate, deliverables, hireItems, openQuestions, tcNotes,
    shootHours, editHours, preProdHours, travelKm, showPreProd, showTravel,
    shootFee, editFee, preProdFee, travelFee, subtotal, gst, total,
    filmingNotes, preProdNotes, editingNotes } = data

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; }
        }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <div style={{ background: DOC.bg, color: DOC.text, width: '100%', maxWidth: 800, margin: '0 auto', padding: '56px 64px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${DOC.border}` }}>
          <div>
            <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 32, objectFit: 'contain', filter: 'invert(1)', opacity: 0.85, marginBottom: 14 }} />
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted }}>Quote — Prepared for</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DOC.heading }}>{clientName || 'Client'}{contactName ? ` · ${contactName}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 4 }}>Date</div>
            <div style={{ fontSize: 12, color: DOC.heading }}>{new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 6 }}>{category}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: DOC.heading, letterSpacing: '-0.01em', marginBottom: 24 }}>{projectName || 'Untitled project'}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginBottom: 36, padding: '16px 0', borderTop: `1px solid ${DOC.border}`, borderBottom: `1px solid ${DOC.border}` }}>
          {jobType && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Job type</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{jobType}</div></div>}
          {shootDates && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Shoot date</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{shootDates}</div></div>}
          {locations && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Location</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{locations}</div></div>}
          {deliveryEstimate && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Delivery</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{deliveryEstimate}</div></div>}
        </div>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Scope of Work</div>
          {jobDescription && <div style={{ fontSize: 13, color: DOC.text, lineHeight: 1.75, marginBottom: 20 }}>{jobDescription}</div>}
          {(deliverables || []).filter((d: any) => d.name).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {deliverables.filter((d: any) => d.name).map((d: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: DOC.highlightBg, borderRadius: 4 }}>
                  <span style={{ fontSize: 13, color: DOC.heading, fontWeight: 500 }}>{d.quantity}x {d.name}{d.duration ? ` (${d.duration})` : ''}</span>
                  {d.formats && d.formats.length > 0 && <span style={{ fontSize: 11, color: DOC.muted }}>{d.formats.join(' · ')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Pricing</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shootFee > 0 && (
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: DOC.muted }}>Filming — {shootHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${shootFee.toLocaleString()}</span></div>
                {filmingNotes && <div style={{ fontSize: 11, color: DOC.faint, marginTop: 3 }}>{filmingNotes}</div>}
              </div>
            )}
            {editFee > 0 && (
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: DOC.muted }}>Editing — {editHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${editFee.toLocaleString()}</span></div>
                {editingNotes && <div style={{ fontSize: 11, color: DOC.faint, marginTop: 3 }}>{editingNotes}</div>}
              </div>
            )}
            {showPreProd && preProdFee > 0 && (
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: DOC.muted }}>Pre-production — {preProdHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${preProdFee.toLocaleString()}</span></div>
                {preProdNotes && <div style={{ fontSize: 11, color: DOC.faint, marginTop: 3 }}>{preProdNotes}</div>}
              </div>
            )}
            {showTravel && travelFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>Travel — {travelKm} km</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${travelFee.toFixed(2)}</span></div>}
            {(hireItems || []).filter((h: any) => h.name).map((h: any) => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>{h.name} hire ×{h.days}</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${(h.hireRate * h.days).toLocaleString()}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px' }}><span style={{ fontSize: 12, color: DOC.muted }}>Subtotal</span><span style={{ fontSize: 12, color: DOC.heading }}>${subtotal.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 16px' }}><span style={{ fontSize: 12, color: DOC.muted }}>GST (15%)</span><span style={{ fontSize: 12, color: DOC.heading }}>${gst.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: DOC.highlightBg, borderRadius: 4 }}><span style={{ fontSize: 15, fontWeight: 700, color: DOC.heading }}>Total inc. GST</span><span style={{ fontSize: 22, fontWeight: 800, color: DOC.heading }}>${total.toLocaleString()}</span></div>
          </div>
        </div>

        {openQuestions && (
          <div style={{ marginBottom: 36, padding: '16px 20px', background: 'rgba(210,175,80,0.08)', border: '1px solid rgba(210,175,80,0.25)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a6d1a', marginBottom: 8, fontWeight: 700 }}>To confirm before we finalise this quote</div>
            <div style={{ fontSize: 13, color: '#5c4a12', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{openQuestions}</div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Terms & Conditions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...TERMS, tcNotes].filter(Boolean).map((term, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: DOC.muted, lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0, fontWeight: 700, color: DOC.faint }}>{i + 1}.</span>{term}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${DOC.border}`, textAlign: 'center', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DOC.faint }}>
          Example Content Ltd · examplecontent.co.nz
        </div>
      </div>
    </>
  )
}
