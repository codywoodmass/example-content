'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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

type Quote = { id: string; project_name: string; client_name: string; client_email: string; status: string; data: any; project_id: string | null }

export default function PublicQuoteViewer() {
  const params = useParams()
  const id = params?.id as string
  const [quote, setQuote] = useState<Quote | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/view-quote?id=${id}`)
      .then(r => r.json())
      .then(data => { if (data.quote) setQuote(data.quote); else setNotFound(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function sendFeedback() {
    if (!feedbackText.trim() || !quote) return
    setSubmitting(true)
    const res = await fetch('/api/public-quote-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote.id, action: 'feedback', feedback: feedbackText }),
    })
    if (res.ok) setFeedbackSent(true)
    setSubmitting(false)
  }

  async function accept() {
    if (!quote) return
    setSubmitting(true)
    const res = await fetch('/api/public-quote-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote.id, action: 'accept' }),
    })
    if (res.ok) setQuote(q => q ? { ...q, status: 'approved' } : q)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main style={{ background: DOC.pageBg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: DOC.muted, fontSize: 13 }}>Loading...</div>
      </main>
    )
  }

  if (notFound || !quote) {
    return (
      <main style={{ background: DOC.pageBg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 32, objectFit: 'contain', filter: 'invert(1)', opacity: 0.7, marginBottom: 8 }} />
        <div style={{ color: DOC.muted, fontSize: 14 }}>This quote isn't available.</div>
        <div style={{ color: DOC.faint, fontSize: 12 }}>It may not have been sent yet. Contact Example Content if you think this is a mistake.</div>
      </main>
    )
  }

  const d = quote.data || {}
  const shootFee = (d.shootHours || 0) * (d.rateFilming || 0)
  const editFee = (d.editHours || 0) * (d.rateEditing || 0)
  const preProdFee = (d.preProdHours || 0) * (d.ratePreProd || 0)
  const travelFee = (d.travelKm || 0) * (d.rateTravelKm || 0)
  const hireTotal = (d.hireItems || []).reduce((s: number, h: any) => s + h.hireRate * h.days, 0)
  const subtotal = shootFee + editFee + (d.showPreProd ? preProdFee : 0) + (d.showTravel ? travelFee : 0) + hireTotal
  const gst = Math.round(subtotal * 0.15)
  const total = subtotal + gst

  return (
    <main style={{ background: DOC.pageBg, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: DOC.bg, minHeight: '100vh', color: DOC.text, padding: '56px 64px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${DOC.border}` }}>
          <div>
            <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 32, objectFit: 'contain', filter: 'invert(1)', opacity: 0.85, marginBottom: 14 }} />
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted }}>Quote — Prepared for</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DOC.heading }}>{quote.client_name || 'Client'}{d.contactName ? ` · ${d.contactName}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 4 }}>Date</div>
            <div style={{ fontSize: 12, color: DOC.heading }}>{new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 6 }}>{d.category}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: DOC.heading, letterSpacing: '-0.01em', marginBottom: 24 }}>{quote.project_name || 'Untitled project'}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, marginBottom: 36, padding: '16px 0', borderTop: `1px solid ${DOC.border}`, borderBottom: `1px solid ${DOC.border}` }}>
          {d.jobType && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Job type</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{d.jobType}</div></div>}
          {d.shootDates && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Shoot date</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{d.shootDates}</div></div>}
          {d.locations && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Location</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{d.locations}</div></div>}
          {d.deliveryEstimate && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Delivery</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{d.deliveryEstimate}</div></div>}
        </div>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Scope of Work</div>
          {d.jobDescription && <div style={{ fontSize: 13, color: DOC.text, lineHeight: 1.75, marginBottom: 20 }}>{d.jobDescription}</div>}
          {(d.deliverables || []).filter((x: any) => x.name).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.deliverables.filter((x: any) => x.name).map((del: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: DOC.highlightBg, borderRadius: 4 }}>
                  <span style={{ fontSize: 13, color: DOC.heading, fontWeight: 500 }}>{del.quantity}x {del.name}{del.duration ? ` (${del.duration})` : ''}</span>
                  {del.formats && del.formats.length > 0 && <span style={{ fontSize: 11, color: DOC.muted }}>{del.formats.join(' · ')}</span>}
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: DOC.muted }}>Filming — {d.shootHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${shootFee.toLocaleString()}</span></div>
                {d.filmingNotes && <div style={{ fontSize: 11, color: DOC.faint, marginTop: 3 }}>{d.filmingNotes}</div>}
              </div>
            )}
            {editFee > 0 && (
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: DOC.muted }}>Editing — {d.editHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${editFee.toLocaleString()}</span></div>
                {d.editingNotes && <div style={{ fontSize: 11, color: DOC.faint, marginTop: 3 }}>{d.editingNotes}</div>}
              </div>
            )}
            {d.showPreProd && preProdFee > 0 && (
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: DOC.muted }}>Pre-production — {d.preProdHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${preProdFee.toLocaleString()}</span></div>
                {d.preProdNotes && <div style={{ fontSize: 11, color: DOC.faint, marginTop: 3 }}>{d.preProdNotes}</div>}
              </div>
            )}
            {d.showTravel && travelFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>Travel — {d.travelKm} km</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${travelFee.toFixed(2)}</span></div>}
            {(d.hireItems || []).filter((h: any) => h.name).map((h: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>{h.name} hire ×{h.days}</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${(h.hireRate * h.days).toLocaleString()}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px' }}><span style={{ fontSize: 12, color: DOC.muted }}>Subtotal</span><span style={{ fontSize: 12, color: DOC.heading }}>${subtotal.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 16px' }}><span style={{ fontSize: 12, color: DOC.muted }}>GST (15%)</span><span style={{ fontSize: 12, color: DOC.heading }}>${gst.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: DOC.highlightBg, borderRadius: 4 }}><span style={{ fontSize: 15, fontWeight: 700, color: DOC.heading }}>Total inc. GST</span><span style={{ fontSize: 22, fontWeight: 800, color: DOC.heading }}>${total.toLocaleString()}</span></div>
          </div>
        </div>

        {d.openQuestions && (
          <div style={{ marginBottom: 36, padding: '16px 20px', background: 'rgba(210,175,80,0.08)', border: '1px solid rgba(210,175,80,0.25)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a6d1a', marginBottom: 8, fontWeight: 700 }}>To confirm before we finalise this quote</div>
            <div style={{ fontSize: 13, color: '#5c4a12', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{d.openQuestions}</div>
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Terms & Conditions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...TERMS, d.tcNotes].filter(Boolean).map((term, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: DOC.muted, lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0, fontWeight: 700, color: DOC.faint }}>{i + 1}.</span>{term}
              </div>
            ))}
          </div>
        </div>

        {/* ACCEPT / FEEDBACK */}
        <div style={{ paddingTop: 24, borderTop: `1px solid ${DOC.border}` }}>
          {quote.status === 'approved' ? (
            <div style={{ padding: '16px 20px', background: 'rgba(100,180,100,0.1)', border: '1px solid rgba(100,180,100,0.3)', borderRadius: 4, textAlign: 'center', fontSize: 13, color: '#2d6a2d' }}>✓ Quote accepted — we'll be in touch shortly to confirm details</div>
          ) : feedbackSent ? (
            <div style={{ padding: '16px 20px', background: 'rgba(100,150,220,0.1)', border: '1px solid rgba(100,150,220,0.3)', borderRadius: 4, textAlign: 'center', fontSize: 13, color: '#2a4f8a' }}>✓ Feedback sent — Example Content will review and update your quote</div>
          ) : (
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: DOC.heading, marginBottom: 14 }}>Questions or changes before you accept?</div>
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Let us know here..." style={{ width: '100%', background: '#fafafa', border: `1px solid ${DOC.border}`, borderRadius: 4, padding: 12, fontSize: 13, color: DOC.text, fontFamily: 'inherit', outline: 'none', lineHeight: 1.6, resize: 'vertical', minHeight: 90, marginBottom: 16, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button onClick={sendFeedback} disabled={submitting || !feedbackText.trim()} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 18px', borderRadius: 3, border: `1px solid ${DOC.border}`, color: DOC.muted, background: 'transparent', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>Send feedback</button>
                <button onClick={accept} disabled={submitting} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 24px', borderRadius: 3, background: DOC.heading, color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Accept quote</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${DOC.border}`, textAlign: 'center', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DOC.faint }}>
          Example Content Ltd · examplecontent.co.nz
        </div>
      </div>
    </main>
  )
}
