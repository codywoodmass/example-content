'use client'
import StudioSidebar from '../StudioSidebar'
import { supabase } from '@/lib/supabase'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'
import React, { useState, useEffect, useRef } from 'react'

// A quote is a single A4 business document, not a creative pitch deck — one
// fixed, print-appropriate light style rather than a template picker.
const DOC = {
  bg: '#FFFFFF', pageBg: '#F4F2EF', text: 'rgba(0,0,0,0.75)', heading: '#111111',
  muted: 'rgba(0,0,0,0.42)', faint: 'rgba(0,0,0,0.28)', border: 'rgba(0,0,0,0.1)',
  accent: '#111111', highlightBg: '#F4F2EF',
}

type DeliverableItem = { id: string; name: string; quantity: number; duration: string; formats: string[] }
type HireItem = { id: string; name: string; hireRate: number; days: number }

const VIDEO_FORMATS = ['1920×1080', '1080×1080', '9×16 Vertical', '4×5', '4K 3840×2160', 'ProRes Master']
const PHOTO_FORMATS = ['High-res JPEG', 'RAW Files', 'Web-res JPEG', 'PNG Transparent']
const CATEGORIES = ['Commercial', 'Architectural', 'Events', 'Documentary', 'Social Content', 'Sport & Fitness']

// Matches the house terms & conditions used on property package bookings —
// 24hr postponement/cancellation window, GST-exclusive pricing, 12-month
// Drive retention — with a 25% deposit, which is specific to bespoke quoted
// work rather than the fixed-price packages (which take no deposit).
const TERMS = [
  'This quote is valid for 14 days from the date of issue.',
  'A 25% deposit is required to confirm this booking, with the balance due on delivery.',
  'Postponement or cancellation within 24 hours of the scheduled shoot date, for reasons other than adverse weather, will incur a fee of 25% of the total quoted cost.',
  'Example Content Ltd retains full intellectual property rights over all footage and photography produced, and reserves the right to use this material for portfolio, marketing and promotional purposes.',
  'All prices quoted are exclusive of GST, which will be applied at the prevailing rate.',
  'Final deliverables are stored securely in Google Drive for 12 months from the date of delivery, after which files will be permanently deleted — please download and retain your own copies.',
]

export default function QuotePage() {
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list')
  const [sendModal, setSendModal] = useState(false)

  const [clientName, setClientName] = useState('')
  const [contactName, setContactName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [projectName, setProjectName] = useState('')
  const [category, setCategory] = useState('Commercial')
  const [jobType, setJobType] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [shootDates, setShootDates] = useState('')
  const [draftDue, setDraftDue] = useState('')
  const [finalsDue, setFinalsDue] = useState('')
  const [locations, setLocations] = useState('')
  const [locationList, setLocationList] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [locationDebounce, setLocationDebounce] = useState<any>(null)
  const [deliveryEstimate, setDeliveryEstimate] = useState('10-14 business days')
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([
    { id: '1', name: '', quantity: 1, duration: '', formats: [] },
  ])
  const [hireItems, setHireItems] = useState<HireItem[]>([])

  const [openQuestions, setOpenQuestions] = useState('')
  const [tcNotes, setTcNotes] = useState('')
  const [shootHours, setShootHours] = useState(0)
  const [editHours, setEditHours] = useState(0)
  const [preProdHours, setPreProdHours] = useState(0)
  const [travelKm, setTravelKm] = useState(0)
  const [showPreProd, setShowPreProd] = useState(false)
  const [showTravel, setShowTravel] = useState(false)
  const [rateFilming, setRateFilming] = useState(175)
  const [rateEditing, setRateEditing] = useState(100)
  const [ratePreProd, setRatePreProd] = useState(50)
  const [rateTravelKm, setRateTravelKm] = useState(1.17)

  const [quoteId, setQuoteId] = useState<string | null>(null)
  const quoteIdRef = useRef<string | null>(null)
  const [quoteStatus, setQuoteStatus] = useState<'draft' | 'sent' | 'approved'>('draft')
  useEffect(() => { quoteIdRef.current = quoteId }, [quoteId])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [clients, setClients] = useState<any[]>([])
  const [savedQuotes, setSavedQuotes] = useState<any[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; quote: any } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)

  const [aiPasteText, setAiPasteText] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiUploadName, setAiUploadName] = useState('')

  useEffect(() => {
    supabase.from('clients1').select('*').order('name').then(({ data }) => { if (data) setClients(data) })
    supabase.from('quotes1').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setSavedQuotes(data) })
  }, [])

  async function generateQuoteWithAI() {
    if (!aiPasteText.trim()) { notify('Paste or upload the client\'s info first.', 'error'); return }
    setAiGenerating(true)
    try {
      const res = await fetch('/api/quote-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiPasteText }),
      })
      const data = await res.json()
      if (!res.ok || !data.quote) { notify('Could not generate a quote: ' + (data.error || 'unknown error'), 'error'); return }
      const q = data.quote
      if (q.projectName) setProjectName(q.projectName)
      if (q.jobType) setJobType(q.jobType)
      if (q.jobDescription) setJobDescription(q.jobDescription)
      if (q.category) setCategory(q.category)
      if (q.locations) setLocations(q.locations)
      if (Array.isArray(q.deliverables) && q.deliverables.length > 0) {
        setDeliverables(q.deliverables.map((d: any, i: number) => ({
          id: Date.now().toString() + i, name: d.name || '', quantity: d.quantity || 1,
          duration: d.duration || '', formats: Array.isArray(d.formats) ? d.formats : [],
        })))
      }
      if (typeof q.shootHours === 'number') setShootHours(q.shootHours)
      if (typeof q.editHours === 'number') setEditHours(q.editHours)
      if (typeof q.preProdHours === 'number') { setPreProdHours(q.preProdHours); setShowPreProd(q.preProdHours > 0) }
      if (typeof q.travelKm === 'number') { setTravelKm(q.travelKm); setShowTravel(q.travelKm > 0) }
      if (q.assumptions) setOpenQuestions(q.assumptions)
      notify('Quote drafted — review the scope and pricing below', 'success')
    } catch (e) {
      notify('Could not reach the AI quoting service', 'error')
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleAiFileUpload(file: File) {
    if (!file.type.startsWith('text/') && !file.name.endsWith('.txt')) {
      notify('Only plain text (.txt) files can be read directly — paste the content instead for PDFs/Word docs.', 'error')
      return
    }
    const text = await file.text()
    setAiPasteText(p => (p ? p + '\n\n' : '') + text)
    setAiUploadName(file.name)
  }

  async function searchLocations(query: string) {
    if (!query || query.length < 3) { setLocationSuggestions([]); return }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=NZ&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`)
      const data = await res.json()
      setLocationSuggestions(data.features || [])
      setShowLocationSuggestions(true)
    } catch (e) { setLocationSuggestions([]) }
  }

  function handleLocationInput(val: string) {
    setLocationInput(val)
    if (locationDebounce) clearTimeout(locationDebounce)
    setLocationDebounce(setTimeout(() => searchLocations(val), 350))
  }

  function addLocation(placeName: string) {
    if (!locationList.includes(placeName)) {
      const newList = [...locationList, placeName]
      setLocationList(newList)
      setLocations(newList.join(', '))
    }
    setLocationInput(''); setLocationSuggestions([]); setShowLocationSuggestions(false)
  }

  function removeLocation(loc: string) {
    const newList = locationList.filter(l => l !== loc)
    setLocationList(newList); setLocations(newList.join(', '))
  }

  function resetForm() {
    setClientName(''); setContactName(''); setClientEmail(''); setProjectName('')
    setCategory('Commercial'); setJobType(''); setJobDescription('')
    setShootDates(''); setDraftDue(''); setFinalsDue('')
    setLocations(''); setLocationList([]); setDeliveryEstimate('10-14 business days')
    setDeliverables([{ id: '1', name: '', quantity: 1, duration: '', formats: [] }])
    setHireItems([]); setOpenQuestions(''); setTcNotes('')
    setShootHours(0); setEditHours(0); setPreProdHours(0); setTravelKm(0)
    setShowPreProd(false); setShowTravel(false)
    setRateFilming(175); setRateEditing(100); setRatePreProd(50); setRateTravelKm(1.17)
    setQuoteId(null); setQuoteStatus('draft')
    setAiPasteText(''); setAiUploadName('')
  }

  async function saveQuote() {
    setSaving(true)
    const quoteData = {
      clientName, contactName, clientEmail, projectName, category, jobType, jobDescription,
      shootDates, draftDue, finalsDue, locations, locationList, deliveryEstimate,
      deliverables, hireItems, openQuestions, tcNotes,
      shootHours, editHours, preProdHours, travelKm, showPreProd, showTravel,
      rateFilming, rateEditing, ratePreProd, rateTravelKm,
    }
    const currentId = quoteIdRef.current || quoteId
    if (currentId) {
      await supabase.from('quotes1').update({ data: quoteData, client_name: clientName, client_email: clientEmail, project_name: projectName }).eq('id', currentId)
    } else {
      const { data } = await supabase.from('quotes1').insert([{ client_name: clientName, client_email: clientEmail, project_name: projectName, status: 'draft', data: quoteData }]).select().single()
      if (data) setQuoteId(data.id)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    supabase.from('quotes1').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setSavedQuotes(data) })
  }

  async function sendQuoteToClient() {
    await saveQuote()
    if (!quoteId) return
    await supabase.from('quotes1').update({ status: 'sent' }).eq('id', quoteId)
    setQuoteStatus('sent')
    try {
      await fetch('/api/notify-quote-ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, clientName, clientEmail }),
      })
    } catch (e) { console.error('Quote notify error:', e) }
    notify('Quote sent to ' + clientEmail, 'success')
    setSendModal(false)
  }

  async function convertToProject() {
    if (!(await confirmDialog('Convert this quote to a project?'))) return
    const deliverablesText = deliverables.filter(d => d.name).map(d => `${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}`).join(', ')
    const { data, error } = await supabase.from('projects1').insert([{
      title: projectName, client: clientName, email: clientEmail,
      category: category === 'Commercial' ? 'Commercial' : 'Property',
      stage: 'Enquiry', progress: 0,
      shoot_date: shootDates || null, draft_due: draftDue || null, delivery_due: finalsDue || null,
      from_booking: false, general_notes: jobDescription,
      deliverables: 'PACKAGE: ' + jobType + '\nDELIVERABLES: ' + deliverablesText,
      amount: total || null,
    }]).select().single()
    if (error) { notify('Could not create project: ' + error.message, 'error'); return }
    if (data) {
      if (quoteId) await supabase.from('quotes1').update({ project_id: data.id, status: 'approved' }).eq('id', quoteId)
      notify('Project created successfully!', 'success')
    }
  }

  // Auto-save while editing
  useEffect(() => {
    if (view !== 'form') return
    const timer = setTimeout(() => { if (clientName && projectName) saveQuote() }, 2000)
    return () => clearTimeout(timer)
  }, [clientName, contactName, clientEmail, projectName, category, jobType, jobDescription,
      shootDates, draftDue, finalsDue, locations, deliveryEstimate,
      deliverables, hireItems, openQuestions, tcNotes,
      shootHours, editHours, preProdHours, travelKm, showPreProd, showTravel,
      rateFilming, rateEditing, ratePreProd, rateTravelKm])

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }
  const panelS: React.CSSProperties = { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, marginBottom: 14 }
  const btnP: React.CSSProperties = { fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }
  const btnG: React.CSSProperties = { fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }

  function addDel() { setDeliverables(p => [...p, { id: Date.now().toString(), name: '', quantity: 1, duration: '', formats: [] }]) }
  function updateDel(id: string, field: keyof DeliverableItem, value: any) { setDeliverables(p => p.map(d => d.id === id ? { ...d, [field]: value } : d)) }
  function toggleFmt(id: string, fmt: string) { setDeliverables(p => p.map(d => d.id === id ? { ...d, formats: d.formats.includes(fmt) ? d.formats.filter(f => f !== fmt) : [...d.formats, fmt] } : d)) }
  function removeDel(id: string) { setDeliverables(p => p.filter(d => d.id !== id)) }
  function addHireItem() { setHireItems(p => [...p, { id: Date.now().toString(), name: '', hireRate: 0, days: 1 }]) }
  function updateHireItem(id: string, field: keyof HireItem, value: any) { setHireItems(p => p.map(h => h.id === id ? { ...h, [field]: value } : h)) }
  function removeHireItem(id: string) { setHireItems(p => p.filter(h => h.id !== id)) }

  const shootFee = shootHours * rateFilming
  const editFee = editHours * rateEditing
  const preProdFee = preProdHours * ratePreProd
  const travelFee = travelKm * rateTravelKm
  const hireTotal = hireItems.reduce((s, h) => s + h.hireRate * h.days, 0)
  const subtotal = shootFee + editFee + (showPreProd ? preProdFee : 0) + (showTravel ? travelFee : 0) + hireTotal
  const gst = Math.round(subtotal * 0.15)
  const total = subtotal + gst

  // The single A4 document — shared between the in-app preview and what
  // gets exported to the print page (see quotes/print/page.tsx). One page,
  // not a slide deck: scope, pricing, open questions, and terms all flow
  // down one document so the client can read it top to bottom.
  function QuoteDocument() {
    return (
      <div style={{ background: DOC.bg, color: DOC.text, width: '100%', maxWidth: 800, margin: '0 auto', padding: '56px 64px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${DOC.border}` }}>
          <div>
            <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 32, objectFit: 'contain', filter: 'invert(1)', opacity: 0.85, marginBottom: 14 }} />
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted }}>Quote — Prepared for</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: DOC.heading }}>{clientName || 'Client'}{contactName ? ` · ${contactName}` : ''}</div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 4 }}>Date</div>
            <div style={{ fontSize: 12, color: DOC.heading }}>{new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 6 }}>{category}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: DOC.heading, letterSpacing: '-0.01em', marginBottom: 24 }}>{projectName || 'Untitled project'}</div>

        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 28, marginBottom: 36, padding: '16px 0', borderTop: `1px solid ${DOC.border}`, borderBottom: `1px solid ${DOC.border}` }}>
          {jobType && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Job type</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{jobType}</div></div>}
          {shootDates && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Shoot date</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{shootDates}</div></div>}
          {locations && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Location</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{locations}</div></div>}
          {deliveryEstimate && <div><div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: DOC.faint, marginBottom: 3 }}>Delivery</div><div style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>{deliveryEstimate}</div></div>}
        </div>

        {/* SCOPE */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Scope of Work</div>
          {jobDescription && <div style={{ fontSize: 13, color: DOC.text, lineHeight: 1.75, marginBottom: 20 }}>{jobDescription}</div>}
          {deliverables.filter(d => d.name).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {deliverables.filter(d => d.name).map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: DOC.highlightBg, borderRadius: 4 }}>
                  <span style={{ fontSize: 13, color: DOC.heading, fontWeight: 500 }}>{d.quantity}x {d.name}{d.duration ? ` (${d.duration})` : ''}</span>
                  {d.formats.length > 0 && <span style={{ fontSize: 11, color: DOC.muted }}>{d.formats.join(' · ')}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRICING */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Pricing</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const }}>
            {shootFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>Filming — {shootHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${shootFee.toLocaleString()}</span></div>}
            {editFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>Editing — {editHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${editFee.toLocaleString()}</span></div>}
            {showPreProd && preProdFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>Pre-production — {preProdHours} hrs</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${preProdFee.toLocaleString()}</span></div>}
            {showTravel && travelFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>Travel — {travelKm} km</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${travelFee.toFixed(2)}</span></div>}
            {hireItems.filter(h => h.name).map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${DOC.border}` }}><span style={{ fontSize: 13, color: DOC.muted }}>{h.name} hire ×{h.days}</span><span style={{ fontSize: 13, color: DOC.heading, fontWeight: 600 }}>${(h.hireRate * h.days).toLocaleString()}</span></div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 4px' }}><span style={{ fontSize: 12, color: DOC.muted }}>Subtotal</span><span style={{ fontSize: 12, color: DOC.heading }}>${subtotal.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 16px' }}><span style={{ fontSize: 12, color: DOC.muted }}>GST (15%)</span><span style={{ fontSize: 12, color: DOC.heading }}>${gst.toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: DOC.highlightBg, borderRadius: 4 }}><span style={{ fontSize: 15, fontWeight: 700, color: DOC.heading }}>Total inc. GST</span><span style={{ fontSize: 22, fontWeight: 800, color: DOC.heading }}>${total.toLocaleString()}</span></div>
          </div>
        </div>

        {/* OPEN QUESTIONS */}
        {openQuestions && (
          <div style={{ marginBottom: 36, padding: '16px 20px', background: 'rgba(210,175,80,0.08)', border: '1px solid rgba(210,175,80,0.25)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8a6d1a', marginBottom: 8, fontWeight: 700 }}>To confirm before we finalise this quote</div>
            <div style={{ fontSize: 13, color: '#5c4a12', lineHeight: 1.65, whiteSpace: 'pre-wrap' as const }}>{openQuestions}</div>
          </div>
        )}

        {/* TERMS */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: DOC.muted, marginBottom: 14, fontWeight: 700 }}>Terms & Conditions</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {[...TERMS, tcNotes].filter(Boolean).map((term, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: DOC.muted, lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0, fontWeight: 700, color: DOC.faint }}>{i + 1}.</span>{term}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${DOC.border}`, textAlign: 'center' as const, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: DOC.faint }}>
          Example Content Ltd · examplecontent.co.nz
        </div>
      </div>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="quotes" />
      <div className="ec-studio-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 48, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {view !== 'list' && <button style={{ ...btnG, padding: '5px 10px', fontSize: 10 }} onClick={() => view === 'preview' ? setView('form') : setView('list')}>← {view === 'preview' ? 'Edit quote' : 'All quotes'}</button>}
            <span style={{ fontSize: 13, color: view === 'list' ? '#fff' : 'rgba(200,194,187,0.5)', fontWeight: view === 'list' ? 500 : 400 }}>{view === 'list' ? 'Quote Generator' : (projectName || 'Untitled quote')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {view === 'form' && <>
              {saved && <span style={{ fontSize: 11, color: 'rgba(100,200,130,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>✓ Saved</span>}
              <button style={btnG} onClick={saveQuote}>{saving ? 'Saving...' : 'Save draft'}</button>
              <button style={btnP} onClick={() => setView('preview')}>Preview quote</button>
              <button style={btnG} onClick={async () => { await saveQuote(); setView('list') }}>× Close</button>
            </>}
            {view === 'preview' && <>
              <button style={btnG} onClick={() => {
                localStorage.setItem('quote_print_data', JSON.stringify({ clientName, contactName, projectName, category, jobType, jobDescription, shootDates, locations, deliveryEstimate, deliverables, hireItems, openQuestions, tcNotes, shootHours, editHours, preProdHours, travelKm, showPreProd, showTravel, shootFee, editFee, preProdFee, travelFee, subtotal, gst, total }))
                window.open('/portal/studio/quotes/print', '_blank')
              }}>↓ Save as PDF</button>
              <button style={btnG} onClick={() => convertToProject()}>Convert to project</button>
              <button style={btnP} onClick={() => setSendModal(true)}>Send to client</button>
            </>}
            {view === 'list' && <button style={btnP} onClick={() => { resetForm(); setView('form') }}>+ New quote</button>}
          </div>
        </div>

        {/* LIST */}
        {view === 'list' && (
          <div style={{ padding: 28, overflowY: 'auto' }}>
            {savedQuotes.length === 0 ? (
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '40px 28px', textAlign: 'center', color: 'rgba(200,194,187,0.3)', fontSize: 13 }}>No quotes yet — create your first one</div>
            ) : (
              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                {savedQuotes.map((quote: any, i: number) => {
                  const d = quote.data || {}
                  const statusColors: Record<string, { c: string; b: string }> = { draft: { c: 'rgba(200,194,187,0.5)', b: 'rgba(200,194,187,0.1)' }, sent: { c: 'rgba(100,150,220,0.9)', b: 'rgba(25,45,80,0.4)' }, approved: { c: 'rgba(100,200,130,0.9)', b: 'rgba(30,70,45,0.4)' } }
                  const sc = statusColors[quote.status] || statusColors.draft
                  return (
                    <div key={quote.id} onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, quote }) }} onClick={() => {
                      setQuoteId(quote.id); setQuoteStatus(quote.status)
                      setClientName(d.clientName || ''); setContactName(d.contactName || ''); setClientEmail(d.clientEmail || '')
                      setProjectName(d.projectName || ''); setCategory(d.category || 'Commercial'); setJobType(d.jobType || '')
                      setJobDescription(d.jobDescription || ''); setShootDates(d.shootDates || '')
                      setDraftDue(d.draftDue || ''); setFinalsDue(d.finalsDue || '')
                      setLocationList(d.locationList || []); setLocations(d.locations || '')
                      setDeliveryEstimate(d.deliveryEstimate || '10-14 business days')
                      setDeliverables(d.deliverables && d.deliverables.length > 0 ? d.deliverables : [{ id: '1', name: '', quantity: 1, duration: '', formats: [] }])
                      setHireItems(d.hireItems || [])
                      setOpenQuestions(d.openQuestions || ''); setTcNotes(d.tcNotes || '')
                      setShootHours(d.shootHours || 0); setEditHours(d.editHours || 0)
                      setPreProdHours(d.preProdHours || 0); setTravelKm(d.travelKm || 0)
                      setShowPreProd(d.showPreProd || false); setShowTravel(d.showTravel || false)
                      setRateFilming(d.rateFilming || 175); setRateEditing(d.rateEditing || 100)
                      setRatePreProd(d.ratePreProd || 50); setRateTravelKm(d.rateTravelKm || 1.17)
                      setAiPasteText(''); setAiUploadName('')
                      setView('form')
                    }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < savedQuotes.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{quote.project_name || 'Untitled'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{quote.client_name} · {new Date(quote.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      </div>
                      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: sc.b, color: sc.c }}>{quote.status}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* CONTEXT MENU */}
        {contextMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setContextMenu(null)} />
            <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 6, zIndex: 100, overflow: 'hidden', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              <button onClick={async () => {
                const d = contextMenu.quote.data || {}
                await supabase.from('quotes1').insert([{ client_name: contextMenu.quote.client_name, client_email: contextMenu.quote.client_email, project_name: contextMenu.quote.project_name + ' (copy)', status: 'draft', data: { ...d, projectName: (d.projectName || '') + ' (copy)' } }])
                const { data } = await supabase.from('quotes1').select('*').order('created_at', { ascending: false }); if (data) setSavedQuotes(data); setContextMenu(null)
              }} style={{ display: 'block', width: '100%', padding: '11px 16px', fontSize: 12, color: '#C8C2BB', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(200,194,187,0.08)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Duplicate quote</button>
              <button onClick={() => { setDeleteConfirm(contextMenu.quote); setContextMenu(null) }} style={{ display: 'block', width: '100%', padding: '11px 16px', fontSize: 12, color: 'rgba(210,90,90,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(210,90,90,0.06)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Delete quote</button>
            </div>
          </>
        )}
        {/* DELETE CONFIRM */}
        {deleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 32, width: 400 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 8 }}>Delete quote</div>
              <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.5)', marginBottom: 24, lineHeight: 1.6 }}>Delete <strong style={{ color: '#C8C2BB' }}>{deleteConfirm.project_name}</strong>? This cannot be undone.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 11, padding: '9px 18px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={async () => { await supabase.from('quotes1').delete().eq('id', deleteConfirm.id); setSavedQuotes(p => p.filter(q => q.id !== deleteConfirm.id)); setDeleteConfirm(null) }} style={{ fontSize: 11, padding: '9px 18px', borderRadius: 3, background: 'rgba(210,90,90,0.15)', color: 'rgba(210,90,90,0.9)', border: '0.5px solid rgba(210,90,90,0.3)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* FORM */}
        {view === 'form' && (
          <div style={{ padding: 28, maxWidth: 780, overflowY: 'auto' }}>
            <div style={{ ...panelS, border: '0.5px solid rgba(100,150,220,0.25)', background: 'linear-gradient(135deg, rgba(100,150,220,0.06) 0%, #1A1F28 60%)' }}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(100,150,220,0.15)', fontSize: 12, fontWeight: 500, color: '#C8C2BB', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13 }}>✦</span> Draft with AI
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 10, lineHeight: 1.6 }}>Paste the email or brief the client sent through — Claude will propose a scope, deliverables and shoot/edit hours against our usual rates. Nothing's final: review and adjust everything below before sending.</div>
                <textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6, minHeight: 110 }} value={aiPasteText} onChange={e => setAiPasteText(e.target.value)} placeholder="Paste the client's email, brief, or requirements here..." />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <label style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {aiUploadName || '+ Upload .txt'}
                    <input type="file" accept=".txt,text/plain" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleAiFileUpload(e.target.files[0]) }} />
                  </label>
                  <button disabled={aiGenerating || !aiPasteText.trim()} onClick={generateQuoteWithAI} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: aiGenerating || !aiPasteText.trim() ? 'rgba(100,150,220,0.15)' : 'rgba(100,150,220,0.9)', color: aiGenerating || !aiPasteText.trim() ? 'rgba(200,194,187,0.3)' : '#0E1014', border: 'none', cursor: aiGenerating || !aiPasteText.trim() ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{aiGenerating ? 'Drafting...' : '✦ Generate quote'}</button>
                </div>
              </div>
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Client & project</div>
              <div style={{ padding: 18 }}>
                <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Client / brand</label>
                    <select style={inp} value={clientEmail} onChange={e => { const c = clients.find((cl: any) => cl.email === e.target.value); if (c) { setClientName(c.name); setClientEmail(c.email); setContactName(c.name) } }}>
                      <option value="">Select client...</option>
                      {clients.map((c: any) => <option key={c.id} value={c.email}>{c.name}{c.company ? ' — ' + c.company : ''}</option>)}
                    </select>
                  </div>
                  <div><label style={lbl}>Contact person</label><input style={inp} value={contactName} onChange={e => setContactName(e.target.value)} /></div>
                  <div><label style={lbl}>Client name</label><input style={inp} value={clientName} onChange={e => setClientName(e.target.value)} /></div>
                  <div><label style={lbl}>Client email</label><input style={inp} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
                  <div style={{ gridColumn: 'span 2' }}><label style={lbl}>Project name</label><input style={inp} value={projectName} onChange={e => setProjectName(e.target.value)} /></div>
                </div>
                <div><label style={lbl}>Category</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setCategory(cat)} style={{ fontSize: 11, padding: '6px 13px', borderRadius: 3, border: `0.5px solid ${category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Scope of work</div>
              <div style={{ padding: 18 }}>
                <div style={{ marginBottom: 14 }}><label style={lbl}>Job type</label><input style={inp} value={jobType} onChange={e => setJobType(e.target.value)} placeholder="e.g. Brand Film, Event Coverage" /></div>
                <div><label style={lbl}>Description — what's involved, so the client can see what the quoted hours cover</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={3} value={jobDescription} onChange={e => setJobDescription(e.target.value)} /></div>
              </div>
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Shoot details</div>
              <div style={{ padding: 18 }}>
                <div className="ec-form-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div><label style={lbl}>Shoot date</label><input style={inp} value={shootDates} onChange={e => setShootDates(e.target.value)} /></div>
                  <div><label style={lbl}>Draft due</label><input style={inp} type="date" value={draftDue} onChange={e => setDraftDue(e.target.value)} /></div>
                  <div><label style={lbl}>Delivery estimate</label><input style={inp} value={deliveryEstimate} onChange={e => setDeliveryEstimate(e.target.value)} placeholder="10-14 business days" /></div>
                  <div style={{ gridColumn: 'span 3', position: 'relative', zIndex: 30 }}>
                    <label style={lbl}>Locations</label>
                    <div style={{ position: 'relative' }}>
                      <input style={inp} value={locationInput} onChange={e => handleLocationInput(e.target.value)} onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)} placeholder="Search and add locations..." />
                      {showLocationSuggestions && locationSuggestions.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                          {locationSuggestions.map((s: any, i: number) => (
                            <div key={i} onClick={() => addLocation(s.place_name)} style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: i < locationSuggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>{s.place_name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    {locationList.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {locationList.map((loc, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(200,194,187,0.08)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 3, padding: '4px 10px', fontSize: 11, color: '#C8C2BB' }}>
                            <span>{loc.split(',')[0]}</span>
                            <button onClick={() => removeLocation(loc)} style={{ background: 'transparent', border: 'none', color: 'rgba(200,194,187,0.4)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Deliverables</span>
                <button onClick={addDel} style={{ ...btnG, fontSize: 10, padding: '4px 10px' }}>+ Add</button>
              </div>
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deliverables.map(d => (
                  <div key={d.id} style={{ background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(200,194,187,0.07)', borderRadius: 6, padding: 14 }}>
                    <div className="ec-shoot-date-row" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px 24px', gap: 10, marginBottom: 10, alignItems: 'end' }}>
                      <input style={inp} value={d.name} onChange={e => updateDel(d.id, 'name', e.target.value)} placeholder="e.g. Hero brand film..." />
                      <div><label style={{ ...lbl, marginBottom: 4 }}>Qty</label><input style={{ ...inp, textAlign: 'center' as const }} type="number" min="1" value={d.quantity} onChange={e => updateDel(d.id, 'quantity', parseInt(e.target.value) || 1)} /></div>
                      <div><label style={{ ...lbl, marginBottom: 4 }}>Length</label><input style={inp} value={d.duration} onChange={e => updateDel(d.id, 'duration', e.target.value)} placeholder="2-3 min" /></div>
                      {deliverables.length > 1 && <button onClick={() => removeDel(d.id)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>}
                    </div>
                    <div>
                      <label style={{ ...lbl, marginBottom: 6 }}>Formats</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {[...VIDEO_FORMATS, ...PHOTO_FORMATS].map(fmt => (
                          <button key={fmt} onClick={() => toggleFmt(d.id, fmt)} style={{ fontSize: 10, padding: '4px 9px', borderRadius: 3, border: `0.5px solid ${d.formats.includes(fmt) ? '#C8C2BB' : 'rgba(200,194,187,0.12)'}`, background: d.formats.includes(fmt) ? 'rgba(200,194,187,0.1)' : 'transparent', color: d.formats.includes(fmt) ? '#C8C2BB' : 'rgba(200,194,187,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}>{fmt}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Pricing</div>
              <div style={{ padding: 18 }}>
                <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  {[
                    { label: 'Filming ($/hr)', val: rateFilming, set: setRateFilming },
                    { label: 'Editing ($/hr)', val: rateEditing, set: setRateEditing },
                  ].map(({ label, val, set }) => (
                    <div key={label}><label style={lbl}>{label}</label><input style={inp} type="number" min="0" value={val} onChange={e => set(parseFloat(e.target.value) || 0)} /></div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <input style={{ ...inp, width: 70, padding: '7px 9px' }} type="number" min="0" value={shootHours} onChange={e => setShootHours(parseFloat(e.target.value) || 0)} />
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>hrs filming × ${rateFilming} = <strong style={{ color: '#C8C2BB' }}>${shootFee.toLocaleString()}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <input style={{ ...inp, width: 70, padding: '7px 9px' }} type="number" min="0" value={editHours} onChange={e => setEditHours(parseFloat(e.target.value) || 0)} />
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>hrs editing × ${rateEditing} = <strong style={{ color: '#C8C2BB' }}>${editFee.toLocaleString()}</strong></span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'rgba(200,194,187,0.6)', marginBottom: showPreProd ? 10 : 0 }}>
                  <input type="checkbox" checked={showPreProd} onChange={e => setShowPreProd(e.target.checked)} style={{ accentColor: '#C8C2BB' }} />Pre-production hours
                </label>
                {showPreProd && (
                  <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div><label style={lbl}>Hours</label><input style={inp} type="number" min="0" value={preProdHours} onChange={e => setPreProdHours(parseFloat(e.target.value) || 0)} /></div>
                    <div><label style={lbl}>Rate ($/hr)</label><input style={inp} type="number" min="0" value={ratePreProd} onChange={e => setRatePreProd(parseFloat(e.target.value) || 0)} /></div>
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'rgba(200,194,187,0.6)', marginBottom: showTravel ? 10 : 0 }}>
                  <input type="checkbox" checked={showTravel} onChange={e => setShowTravel(e.target.checked)} style={{ accentColor: '#C8C2BB' }} />Travel costs
                </label>
                {showTravel && (
                  <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>Distance (km)</label><input style={inp} type="number" min="0" value={travelKm} onChange={e => setTravelKm(parseFloat(e.target.value) || 0)} /></div>
                    <div><label style={lbl}>Rate ($/km)</label><input style={inp} type="number" min="0" step="0.01" value={rateTravelKm} onChange={e => setRateTravelKm(parseFloat(e.target.value) || 0)} /></div>
                  </div>
                )}
              </div>
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Equipment hire</span>
                <button onClick={addHireItem} style={{ ...btnG, fontSize: 10, padding: '4px 10px' }}>+ Add item</button>
              </div>
              {hireItems.length > 0 && (
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {hireItems.map(h => (
                    <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 24px', gap: 8, alignItems: 'center' }}>
                      <input style={inp} value={h.name} onChange={e => updateHireItem(h.id, 'name', e.target.value)} placeholder="e.g. Drone hire" />
                      <input style={inp} type="number" min="0" value={h.hireRate} onChange={e => updateHireItem(h.id, 'hireRate', parseFloat(e.target.value) || 0)} placeholder="$/day" />
                      <input style={inp} type="number" min="1" value={h.days} onChange={e => updateHireItem(h.id, 'days', parseInt(e.target.value) || 1)} placeholder="days" />
                      <button onClick={() => removeHireItem(h.id)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panelS}>
              <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Open questions & terms</div>
              <div style={{ padding: 18 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Questions or unknowns to resolve with the client before finalising — shown on the quote itself</label>
                  <textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={3} value={openQuestions} onChange={e => setOpenQuestions(e.target.value)} placeholder="e.g. Final location still TBC, number of locations may affect travel cost..." />
                </div>
                <div>
                  <label style={lbl}>Additional terms — appended after the standard terms below</label>
                  <textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={2} value={tcNotes} onChange={e => setTcNotes(e.target.value)} placeholder="e.g. Talent release forms required..." />
                </div>
                <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(200,194,187,0.03)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.07)' }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 8 }}>Standard terms (always included)</div>
                  {TERMS.map((term, i) => <div key={i} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6, marginBottom: 4 }}>{i + 1}. {term}</div>)}
                </div>
              </div>
            </div>

            <button style={{ ...btnP, width: '100%', padding: '12px', fontSize: 12 }} onClick={() => setView('preview')}>Preview quote →</button>
          </div>
        )}

        {/* PREVIEW — single A4 document */}
        {view === 'preview' && (
          <div style={{ flex: 1, overflowY: 'auto', background: DOC.pageBg, padding: '40px 20px' }}>
            <div style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}><QuoteDocument /></div>
          </div>
        )}

        {/* SEND MODAL */}
        {sendModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setSendModal(false) }}>
            <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 420 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Send quote to client</div>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', marginBottom: 20, lineHeight: 1.6 }}>Sends to <strong style={{ color: '#C8C2BB' }}>{clientEmail || 'no email set'}</strong> — an in-app notification if they have a portal account, otherwise an email.</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setSendModal(false)} style={btnG}>Cancel</button>
                <button disabled={!clientEmail} onClick={sendQuoteToClient} style={{ ...btnP, opacity: clientEmail ? 1 : 0.4, cursor: clientEmail ? 'pointer' : 'not-allowed' }}>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
