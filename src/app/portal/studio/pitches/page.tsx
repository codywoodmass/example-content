'use client'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TEMPLATES = {
  editorial: { id: 'editorial', name: 'Minimal & Editorial', bg: '#0C0E12', surface: '#13171E', surfaceAlt: '#1A1F28', accent: '#C8C2BB', accentDim: 'rgba(200,194,187,0.5)', muted: 'rgba(200,194,187,0.28)', text: 'rgba(200,194,187,0.82)', border: 'rgba(200,194,187,0.09)', headingWeight: 700, headingSize: 48 },
  bold: { id: 'bold', name: 'Dark & Bold', bg: '#050505', surface: '#0F0F0F', surfaceAlt: '#181818', accent: '#FFFFFF', accentDim: 'rgba(255,255,255,0.55)', muted: 'rgba(255,255,255,0.22)', text: 'rgba(255,255,255,0.88)', border: 'rgba(255,255,255,0.07)', headingWeight: 900, headingSize: 52 },
  clean: { id: 'clean', name: 'Light & Clean', bg: '#F4F2EF', surface: '#FFFFFF', surfaceAlt: '#ECEAE7', accent: '#111111', accentDim: 'rgba(0,0,0,0.45)', muted: 'rgba(0,0,0,0.28)', text: 'rgba(0,0,0,0.72)', border: 'rgba(0,0,0,0.07)', headingWeight: 700, headingSize: 44 },
}

type Template = keyof typeof TEMPLATES
type DurationType = 'hourly' | 'halfday' | 'fullday' | 'multiday'
type DeliverableItem = { id: string; name: string; quantity: number; duration: string; formats: string[]; notes: string }
type CrewMember = { id: string; name: string; role: string; bio: string; photoUrl: string; selected: boolean }
type EquipmentItem = { id: string; name: string; selected: boolean; hire: boolean; hireRate: number; days: number }
type SlideItem = { id: string; type: string; label: string }

const VIDEO_FORMATS = ['1920×1080', '1080×1080', '9×16 Vertical', '4×5', '4K 3840×2160', 'ProRes Master']
const PHOTO_FORMATS = ['High-res JPEG', 'RAW Files', 'Web-res JPEG', 'PNG Transparent']
const DURATION_LABELS: Record<DurationType, string> = {
  hourly: 'Hourly (2hr min)', halfday: 'Half day (4hrs)',
  fullday: 'Full day (8hrs)', multiday: 'Multi-day'
}

const DEFAULT_CREW: CrewMember[] = [
  { id: "cody", name: "Cody Woodmass", role: "Director", bio: "Founder and Director of Example Content. Specialises in high-end property and commercial film with a bold, cinematic approach.", photoUrl: "/images/cody.jpg", selected: true },
  { id: "fin", name: "Fin McLaren", role: "Lead Creative / Head Videographer & Editor", bio: "Lead Creative at Example Content. Fin brings a sharp editorial eye to every project, leading the creative vision from shoot through to final cut.", photoUrl: "/images/fin.jpg", selected: false },
  { id: "ben", name: "Ben Wilson", role: "Videographer", bio: "Videographer at Example Content. Ben brings energy and precision to every shoot, capturing compelling footage across property and commercial work.", photoUrl: "/images/ben.jpg", selected: false },
]

const DEFAULT_EQUIPMENT: EquipmentItem[] = [
  { id: 'fx3-1', name: 'Sony FX3 Body #1', selected: false, hire: false, hireRate: 150, days: 1 },
  { id: 'fx3-2', name: 'Sony FX3 Body #2', selected: false, hire: false, hireRate: 150, days: 1 },
  { id: 'a74', name: 'Sony A7 IV Stills', selected: false, hire: false, hireRate: 100, days: 1 },
  { id: 'mavic3', name: 'DJI Mavic 3 Pro', selected: false, hire: false, hireRate: 200, days: 1 },
  { id: 'air3', name: 'DJI Air 3 Backup', selected: false, hire: false, hireRate: 120, days: 1 },
  { id: 'sigma', name: 'Sigma 24-70mm f/2.8', selected: false, hire: false, hireRate: 80, days: 1 },
  { id: 'aputure', name: 'Aputure 600D Pro 2x', selected: false, hire: false, hireRate: 180, days: 1 },
]

const DEFAULT_SLIDES: SlideItem[] = [
  { id: 'cover', type: 'cover', label: 'Cover' },
  { id: 'brief', type: 'brief', label: 'The Scope' },
  { id: 'deliverables', type: 'deliverables', label: 'Deliverables' },
  { id: 'team', type: 'team', label: 'The Team' },
  { id: 'moodboard', type: 'moodboard', label: 'Moodboard' },
  { id: 'investment', type: 'investment', label: 'Investment' },
  { id: 'terms', type: 'terms', label: 'Terms' },
]

export default function PitchDeckPage() {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'template' | 'brief' | 'deck'>('list')
  const [template, setTemplate] = useState<Template>('editorial')
  const [activeSlide, setActiveSlide] = useState(0)
  const [slides, setSlides] = useState<SlideItem[]>(DEFAULT_SLIDES)
  const [sendModal, setSendModal] = useState(false)
  const [sendClient, setSendClient] = useState('')
  const [sendEmail, setSendEmail] = useState('')
  const [deckLink] = useState(`https://example-content.vercel.app/deck/${Math.random().toString(36).slice(2,8)}`)
  const [linkCopied, setLinkCopied] = useState(false)

  const [clientName, setClientName] = useState('Elephant Hill Winery')
  const [contactName, setContactName] = useState('Marcus Reid')
  const [clientEmail, setClientEmail] = useState('marcus@elephanthill.co.nz')
  const [logoUrl, setLogoUrl] = useState('')
  const [projectName, setProjectName] = useState('Harvest Season Brand Film 2026')
  const [category, setCategory] = useState('Commercial')
  const [jobType, setJobType] = useState('Brand Film')
  const [jobDescription, setJobDescription] = useState('A cinematic brand film capturing the harvest season at Elephant Hill — showcasing the winemaking process, estate lifestyle and the people behind the label.')
  const [jobDeliverables, setJobDeliverables] = useState('1x Hero Brand Film (2-3 min)\n4x Social Reels (vertical & landscape)\n1x Behind-the-Scenes Cut')
  const [projectGoals, setProjectGoals] = useState('Create a cinematic brand film capturing the harvest season at Elephant Hill, showcasing the winemaking process and lifestyle of the estate.')
  const [tone, setTone] = useState('Warm, cinematic, premium — golden hour palette')
  const [references, setReferences] = useState('')
  const [shootDuration, setShootDuration] = useState<DurationType>('fullday')
  const [shootDays, setShootDays] = useState(2)
  const [shootDates, setShootDates] = useState('15-16 Jul 2026')
  const [locations, setLocations] = useState('Elephant Hill Estate, Te Mata Peak')
  const [deliveryEstimate, setDeliveryEstimate] = useState('10-14 business days')
  const [extraHours, setExtraHours] = useState(0)
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>([
    { id: '1', name: 'Hero brand film', quantity: 1, duration: '2-3 min', formats: ['1920×1080'], notes: '' },
    { id: '2', name: 'Social reels', quantity: 4, duration: '30-60 sec', formats: ['9×16 Vertical', '1920×1080'], notes: '' },
  ])
  const [crew, setCrew] = useState<CrewMember[]>(DEFAULT_CREW)
  const [equipment, setEquipment] = useState<EquipmentItem[]>(DEFAULT_EQUIPMENT)
  const [pricingNotes, setPricingNotes] = useState('')
  const [showDeposit, setShowDeposit] = useState(true)
  const [tcNotes, setTcNotes] = useState('')
  const [shootHours, setShootHours] = useState(2)
  const [editHours, setEditHours] = useState(0)
  const [preProdFee, setPreProdFee] = useState(0)
  const [travelFee, setTravelFee] = useState(0)
  const [showPreProd, setShowPreProd] = useState(false)
  const [showTravel, setShowTravel] = useState(false)

  const [moodboardImages, setMoodboardImages] = useState<string[]>([])
  const [moodboardUploading, setMoodboardUploading] = useState(false)

  const t = TEMPLATES[template]
  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }
  const panelS: React.CSSProperties = { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, marginBottom: 14, overflow: 'hidden' }
  const btnP: React.CSSProperties = { fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }
  const btnG: React.CSSProperties = { fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }


  async function uploadMoodboardImage(file: File) {
    setMoodboardUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const filename = `moodboard/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('pitch-assets').upload(filename, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('pitch-assets').getPublicUrl(filename)
      setMoodboardImages(p => [...p, publicUrl])
    } catch (e) {
      console.error('Upload error:', e)
    }
    setMoodboardUploading(false)
  }

  function getVideoThumbnail(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
    if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`
    return null
  }

  async function addVideoLink(url: string) {
    const thumb = getVideoThumbnail(url)
    if (thumb) {
      setMoodboardImages(p => [...p, `video:${url}:${thumb}`])
    }
  }

  function addDel() { setDeliverables(p => [...p, { id: Date.now().toString(), name: '', quantity: 1, duration: '', formats: [], notes: '' }]) }
  function updateDel(id: string, field: keyof DeliverableItem, value: any) { setDeliverables(p => p.map(d => d.id === id ? { ...d, [field]: value } : d)) }
  function toggleFmt(id: string, fmt: string) { setDeliverables(p => p.map(d => d.id === id ? { ...d, formats: d.formats.includes(fmt) ? d.formats.filter(f => f !== fmt) : [...d.formats, fmt] } : d)) }
  function removeDel(id: string) { setDeliverables(p => p.filter(d => d.id !== id)) }
  function toggleCrew(id: string) { setCrew(p => p.map(c => c.id === id ? { ...c, selected: !c.selected } : c)) }
  function toggleEq(id: string) { setEquipment(p => p.map(e => e.id === id ? { ...e, selected: !e.selected } : e)) }
  function toggleHire(id: string) { setEquipment(p => p.map(e => e.id === id ? { ...e, hire: !e.hire } : e)) }
  function deleteSlide(id: string) {
    const idx = slides.findIndex(s => s.id === id)
    setSlides(p => p.filter(s => s.id !== id))
    setActiveSlide(Math.max(0, idx - 1))
  }

  const selCrew = crew.filter(c => c.selected)
  const selEq = equipment.filter(e => e.selected)
  const hireEq = selEq.filter(e => e.hire)

  const SHOOT_RATES: Record<string, number> = { hourly: 175, halfday: 700, fullday: 1400, multiday: 1400 }
  const shootFee = shootDuration === 'hourly' ? shootHours * 175 : shootDuration === 'halfday' ? 700 : shootDuration === 'fullday' ? 1400 : shootDays * 1400
  const editFee = editHours * 100
  const hireTotal = hireEq.reduce((s: number, e: any) => s + e.hireRate * e.days, 0)
  const subtotal = shootFee + editFee + (showPreProd ? preProdFee : 0) + (showTravel ? travelFee : 0) + hireTotal
  const gst = Math.round(subtotal * 0.15)
  const total = subtotal + gst

  const currentSlide = slides[activeSlide]

  function copyLink() {
    navigator.clipboard.writeText(deckLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const decks = [
    { title: 'Elephant Hill — Harvest Season Brand Film', client: 'Elephant Hill Winery', date: '10 Jun 2026', status: 'Awaiting review', sc: 'rgba(100,150,220,0.85)', sb: 'rgba(25,45,80,0.5)', tmpl: 'editorial' as Template },
    { title: 'Black Barn — Season Campaign 2026', client: 'Black Barn Retreats', date: 'Accepted 1 May', status: 'Accepted', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)', tmpl: 'editorial' as Template },
    { title: 'Studio Forma — Architectural Portfolio', client: 'Studio Forma', date: 'Accepted 18 Mar', status: 'Accepted', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)', tmpl: 'clean' as Template },
    { title: 'Napier City Brewers — Brand Film', client: 'Napier City Brewers', date: 'Draft', status: 'Draft', sc: 'rgba(200,194,187,0.6)', sb: 'rgba(200,194,187,0.1)', tmpl: 'bold' as Template },
  ]

  function SlidePreview({ slideItem, scale = 1 }: { slideItem: SlideItem; scale?: number }) {
    const isAlt = ['brief', 'team', 'terms'].includes(slideItem.type)
    const bg = isAlt ? t.surfaceAlt : t.bg
    const HW = t.headingWeight
    const HS = t.headingSize

    const footer = (
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${scale*5}px ${scale*24}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `0.5px solid ${t.border}`, background: bg }}>
        <span style={{ fontSize: scale * 5.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.muted, fontWeight: 600 }}>EXAMPLE CONTENT</span>
        <span style={{ fontSize: scale * 5, color: t.muted }}>{slides.indexOf(slideItem) + 1} / {slides.length}</span>
      </div>
    )

    if (slideItem.type === 'cover') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: `${scale*20}px ${scale*24}px ${scale*16}px` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale * 28 }}>
          <div>
            <div style={{ fontSize: scale * 7, letterSpacing: '0.28em', textTransform: 'uppercase', color: t.muted, fontWeight: 700, marginBottom: scale * 3 }}>EXAMPLE CONTENT</div>
            <div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, opacity: 0.6 }}>Ever Changing · Always Leading</div>
          </div>
          {logoUrl && <img src={logoUrl} alt="logo" style={{ height: scale * 18, opacity: 0.7 }} />}
        </div>
        <div>
          <div style={{ fontSize: scale * 6, letterSpacing: '0.18em', textTransform: 'uppercase', color: t.accentDim, marginBottom: scale * 6 }}>Prepared for</div>
          <div style={{ fontSize: scale * HS * 0.52, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: scale * 5 }}>{clientName.toUpperCase()}</div>
          <div style={{ fontSize: scale * 13, color: t.accentDim, fontWeight: 400, marginBottom: scale * 10 }}>{projectName}</div>
          <div style={{ height: 0.5, background: t.border, marginBottom: scale * 8 }} />
          <div style={{ display: 'flex', gap: scale * 6, flexWrap: 'wrap' }}>
            {category && <span style={{ fontSize: scale * 6, letterSpacing: '0.1em', textTransform: 'uppercase', padding: `${scale*2}px ${scale*8}px`, background: t.accent, color: t.bg, borderRadius: 1, fontWeight: 700 }}>{category}</span>}
            {shootDates && <span style={{ fontSize: scale * 6, letterSpacing: '0.08em', textTransform: 'uppercase', padding: `${scale*2}px ${scale*8}px`, border: `0.5px solid ${t.border}`, color: t.accentDim, borderRadius: 1 }}>{shootDates}</span>}
            <span style={{ fontSize: scale * 6, letterSpacing: '0.08em', textTransform: 'uppercase', padding: `${scale*2}px ${scale*8}px`, border: `0.5px solid ${t.border}`, color: t.accentDim, borderRadius: 1 }}>{DURATION_LABELS[shootDuration]}{shootDuration === 'multiday' ? ` ×${shootDays}` : ''}</span>
          </div>
        </div>
        {footer}
      </div>
    )

    if (slideItem.type === 'brief') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', padding: `${scale*18}px ${scale*24}px ${scale*16}px`, boxSizing: 'border-box' }}>
        <div style={{ fontSize: scale * 6, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, fontWeight: 600, marginBottom: scale * 6 }}>The Scope</div>
        <div style={{ fontSize: scale * HS * 0.35, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: scale * 8 }}>{(jobType || 'Job Type').toUpperCase()}</div>
        <div style={{ height: 0.5, background: t.border, marginBottom: scale * 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: scale * 10, marginBottom: scale * 8 }}>
          <div>
            <div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, marginBottom: scale * 4, fontWeight: 600 }}>Overview</div>
            <div style={{ fontSize: scale * 7, color: t.text, lineHeight: 1.65 }}>{jobDescription}</div>
          </div>
          <div>
            <div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, marginBottom: scale * 4, fontWeight: 600 }}>Deliverables</div>
            {jobDeliverables.split('\n').filter(Boolean).map((line: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: scale * 5, fontSize: scale * 7, color: t.text, lineHeight: 1.7 }}>
                <span style={{ color: t.muted }}>—</span>{line}
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 0.5, background: t.border, marginBottom: scale * 8 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: scale * 8 }}>
          {projectGoals && <div><div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, marginBottom: scale * 3, fontWeight: 600 }}>OUR APPROACH</div><div style={{ fontSize: scale * 6.5, color: t.text, lineHeight: 1.6 }}>{projectGoals}</div></div>}
          {tone && <div><div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, marginBottom: scale * 3, fontWeight: 600 }}>Tone & mood</div><div style={{ fontSize: scale * 6.5, color: t.text, lineHeight: 1.6 }}>{tone}</div></div>}
          {references && <div><div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, marginBottom: scale * 3, fontWeight: 600 }}>References</div><div style={{ fontSize: scale * 6.5, color: t.text, lineHeight: 1.6 }}>{references}</div></div>}
        </div>
        {footer}
      </div>
    )

    if (slideItem.type === 'deliverables') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', padding: `${scale*18}px ${scale*24}px ${scale*16}px`, boxSizing: 'border-box' }}>
        <div style={{ fontSize: scale * 6, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, fontWeight: 600, marginBottom: scale * 6 }}>Scope & Deliverables</div>
        <div style={{ fontSize: scale * HS * 0.35, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: scale * 10 }}>WHAT YOU RECEIVE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: scale * 5, flex: 1 }}>
          {deliverables.slice(0, 5).map((d, i) => (
            <div key={d.id} style={{ display: 'flex', gap: scale * 10, padding: `${scale*7}px ${scale*8}px`, background: t.surfaceAlt, borderRadius: scale * 2, alignItems: 'center', flex: 1 }}>
              <div style={{ fontSize: scale * 10, color: t.muted, minWidth: scale * 18, fontWeight: 700, letterSpacing: '-0.02em' }}>{String(i+1).padStart(2,'0')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: scale * 11, color: t.accent, fontWeight: 700, marginBottom: scale * 2 }}>{d.name || 'Deliverable'}</div>
                <div style={{ fontSize: scale * 7.5, color: t.accentDim, marginBottom: scale * 1.5 }}>{[d.quantity > 1 ? `${d.quantity}x` : '', d.duration].filter(Boolean).join(' — ')}</div>
                {d.formats.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: scale * 2, marginTop: scale * 2 }}>{d.formats.map((f: string) => <span key={f} style={{ fontSize: scale * 5.5, padding: `${scale*1.5}px ${scale*5}px`, border: `0.5px solid ${t.border}`, color: t.muted, borderRadius: scale }}>{f}</span>)}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: scale * 8, fontSize: scale * 7, color: t.muted, fontWeight: 500 }}>Delivery estimate: <span style={{ color: t.accentDim }}>{deliveryEstimate}</span></div>
        {footer}
      </div>
    )
    if (slideItem.type === 'team') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: `${scale*14}px ${scale*20}px ${scale*20}px` }}>
        <div style={{ fontSize: scale * 6, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, fontWeight: 600, marginBottom: scale * 10 }}>Your Team</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: scale * 6, flex: 1, minHeight: 0 }}>
          {(selCrew.length > 0 ? selCrew : DEFAULT_CREW.slice(0,3)).map(c => (
            <div key={c.id} style={{ borderRadius: scale * 2, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: t.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: scale * 22, fontWeight: 700, color: t.accent }}>{c.name.split(' ').map((n:string)=>n[0]).join('')}</div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)', padding: `${scale*16}px ${scale*6}px ${scale*6}px` }}>
                <div style={{ fontSize: scale * 8, color: '#fff', fontWeight: 700, marginBottom: scale * 1, lineHeight: 1.1 }}>{c.name}</div>
                <div style={{ fontSize: scale * 6, color: 'rgba(255,255,255,0.6)', marginBottom: scale * 2 }}>{c.role}</div>
                {c.bio && <div style={{ fontSize: scale * 5.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{c.bio}</div>}
              </div>
            </div>
          ))}
        </div>
        {selEq.length > 0 && (
          <div style={{ marginTop: scale * 8, flexShrink: 0 }}>
            <div style={{ fontSize: scale * 5.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.muted, marginBottom: scale * 3, fontWeight: 600 }}>Equipment</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: scale * 3 }}>
              {selEq.map(e => <span key={e.id} style={{ fontSize: scale * 5.5, padding: `${scale*2}px ${scale*6}px`, border: `0.5px solid ${t.border}`, color: t.accentDim, borderRadius: scale }}>{e.name}</span>)}
            </div>
          </div>
        )}
        {footer}
      </div>
    )
    if (slideItem.type === 'moodboard') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: `${scale*14}px ${scale*20}px ${scale*20}px` }}>
        <div style={{ fontSize: scale * 6, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, fontWeight: 600, marginBottom: scale * 10 }}>Moodboard</div>
        {moodboardImages.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: moodboardImages.length === 1 ? '1fr' : moodboardImages.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)', gap: scale * 4, flex: 1, minHeight: 0 }}>
            {moodboardImages.slice(0, 6).map((entry: string, i: number) => {
              const isVideo = entry.startsWith('video:')
              const parts = isVideo ? entry.split(':') : []
              const videoUrl = isVideo ? parts.slice(1, -1).join(':') : ''
              const thumb = isVideo ? parts[parts.length - 1] : entry
              return (
                <div key={i} style={{ borderRadius: scale * 2, overflow: 'hidden', position: 'relative', cursor: isVideo ? 'pointer' : 'default' }} onClick={() => isVideo && window.open(videoUrl, '_blank')}>
                  <img src={thumb} alt={`moodboard-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  {isVideo && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                      <div style={{ width: scale * 16, height: scale * 16, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: scale * 8, marginLeft: scale * 1.5 }}>▶</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: scale * 4 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ background: t.surfaceAlt, borderRadius: scale * 2, border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: scale * 6, color: t.muted }}>+ Add image</span>
              </div>
            ))}
          </div>
        )}
        {footer}
      </div>
    )
    if (slideItem.type === 'investment') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', padding: `${scale*18}px ${scale*24}px ${scale*16}px`, boxSizing: 'border-box' }}>
        <div style={{ fontSize: scale * 6, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, fontWeight: 600, marginBottom: scale * 6 }}>Investment</div>
        <div style={{ fontSize: scale * HS * 0.35, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: scale * 8 }}>PRICING</div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*3}px 0`, borderBottom: `0.5px solid ${t.border}` }}>
            <span style={{ fontSize: scale * 7, color: t.accentDim }}>{DURATION_LABELS[shootDuration]}{shootDuration === 'multiday' ? ` ×${shootDays}` : ''}{extraHours > 0 ? ` + ${extraHours}hrs` : ''}</span>
            <span style={{ fontSize: scale * 7, color: t.accent, fontWeight: 600 }}>${shootFee.toLocaleString()}</span>
          </div>
          {editHours > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*3}px 0`, borderBottom: `0.5px solid ${t.border}` }}>
              <span style={{ fontSize: scale * 7, color: t.accentDim }}>Editing — {editHours}hrs</span>
              <span style={{ fontSize: scale * 7, color: t.accent, fontWeight: 600 }}>${editFee.toLocaleString()}</span>
            </div>
          )}
          {showPreProd && preProdFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*3}px 0`, borderBottom: `0.5px solid ${t.border}` }}>
              <span style={{ fontSize: scale * 7, color: t.accentDim }}>Pre-production</span>
              <span style={{ fontSize: scale * 7, color: t.accent, fontWeight: 600 }}>${preProdFee.toLocaleString()}</span>
            </div>
          )}
          {showTravel && travelFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*3}px 0`, borderBottom: `0.5px solid ${t.border}` }}>
              <span style={{ fontSize: scale * 7, color: t.accentDim }}>Travel & expenses</span>
              <span style={{ fontSize: scale * 7, color: t.accent, fontWeight: 600 }}>${travelFee.toLocaleString()}</span>
            </div>
          )}
          {hireEq.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*3}px 0`, borderBottom: `0.5px solid ${t.border}` }}>
              <span style={{ fontSize: scale * 7, color: t.accentDim }}>{e.name} hire ×{e.days}</span>
              <span style={{ fontSize: scale * 7, color: t.accent, fontWeight: 600 }}>${(e.hireRate*e.days).toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*3}px 0`, borderBottom: `0.5px solid ${t.border}` }}>
            <span style={{ fontSize: scale * 6.5, color: t.muted }}>GST (15%)</span>
            <span style={{ fontSize: scale * 6.5, color: t.muted }}>${gst.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: `${scale*4}px 0` }}>
            <span style={{ fontSize: scale * 9, fontWeight: 700, color: t.accent }}>Total inc. GST</span>
            <span style={{ fontSize: scale * 9, fontWeight: 700, color: t.accent }}>${total.toLocaleString()}</span>
          </div>
          {pricingNotes && <div style={{ fontSize: scale * 6, color: t.muted, marginTop: scale * 2 }}>{pricingNotes}</div>}
        </div>
        {showDeposit && <div style={{ padding: `${scale*4}px ${scale*6}px`, background: t.surfaceAlt, borderRadius: scale * 2, fontSize: scale * 6, color: t.muted }}>50% deposit required to confirm. Balance due on delivery.</div>}
        {footer}
      </div>
    )

    if (slideItem.type === 'terms') return (
      <div style={{ width: '100%', height: '100%', background: bg, position: 'relative', overflow: 'hidden', padding: `${scale*18}px ${scale*24}px ${scale*16}px`, boxSizing: 'border-box' }}>
        <div style={{ fontSize: scale * 6, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, fontWeight: 600, marginBottom: scale * 6 }}>Terms & Conditions</div>
        <div style={{ fontSize: scale * HS * 0.75, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: scale * 4 }}>LET'S GET THIS</div>
        <div style={{ fontSize: scale * HS * 0.75, fontWeight: HW, color: t.accent, lineHeight: 1.0, letterSpacing: '-0.02em', marginBottom: scale * 10 }}>STARTED.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: scale * 4 }}>
          {['Proposal valid 14 days from issue', '50% deposit to confirm, balance due on delivery', 'Cancellations within 48hrs incur a 25% fee', 'Example Content retains portfolio rights unless waiver requested in writing', 'All prices exclude GST', 'Files delivered via Google Drive, retained 60 days', tcNotes].filter(Boolean).map((tc, i) => (
            <div key={i} style={{ display: 'flex', gap: scale * 5, fontSize: scale * 6.5, color: t.text, lineHeight: 1.55 }}>
              <span style={{ color: t.muted, flexShrink: 0 }}>—</span>{tc}
            </div>
          ))}
        </div>
        {footer}
      </div>
    )

    return <div style={{ width: '100%', height: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: t.muted, fontSize: scale * 8 }}>{slideItem.label}</span></div>
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13 }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 48, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {view !== 'list' && <button style={{ ...btnG, padding: '5px 10px', fontSize: 10 }} onClick={() => view === 'deck' ? setView('brief') : view === 'brief' ? setView('template') : setView('list')}>← {view === 'deck' ? 'Edit brief' : view === 'brief' ? 'Template' : 'All decks'}</button>}
          <span style={{ fontSize: 13, color: view === 'list' ? '#fff' : 'rgba(200,194,187,0.5)', fontWeight: view === 'list' ? 500 : 400 }}>{view === 'list' ? 'Pitch Decks' : view === 'template' ? 'Choose template' : view === 'brief' ? 'New deck' : (projectName || 'Untitled')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {view === 'deck' && <>
            <button style={{ ...btnG, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
              const printData = { slides, template, clientName, contactName, clientEmail, logoUrl, projectName, category, jobType, jobDescription, jobDeliverables, projectGoals, tone, references, shootDuration, shootDays, shootDates, locations, deliveryEstimate, extraHours, deliverables, crew, equipment, pricingNotes, showDeposit, tcNotes, moodboardImages }
              localStorage.setItem('pitch_print_data', JSON.stringify(printData))
              window.open('/portal/studio/pitches/print', '_blank')
            }}>↓ PDF</button>
            <button style={btnP} onClick={() => setSendModal(true)}>Send to client</button>
          </>}
          {view === 'brief' && <button style={btnP} onClick={() => { setView('deck'); setActiveSlide(0) }}>Preview deck →</button>}
          {view === 'list' && <button style={btnP} onClick={() => setView('template')}>+ New deck</button>}
        </div>
      </div>

      {/* LIST */}
      {view === 'list' && (
        <div style={{ padding: 28 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
            {decks.map((deck, i) => {
              const dt = TEMPLATES[deck.tmpl]
              return (
                <div key={i} onClick={() => { setTemplate(deck.tmpl); setClientName(deck.client); setProjectName(deck.title); setSlides(DEFAULT_SLIDES); setView('deck') }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < decks.length-1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 56, height: 35, background: dt.bg, border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 3, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 9px', gap: 4 }}>
                    <div style={{ height: 3, background: dt.accent, borderRadius: 1, width: '60%' }} />
                    <div style={{ height: 1.5, background: dt.accent, opacity: 0.3, borderRadius: 1 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{deck.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{deck.client} · {deck.date} · {dt.name}</div>
                  </div>
                  <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: deck.sb, color: deck.sc, border: `0.5px solid ${deck.sc}33` }}>{deck.status}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TEMPLATE PICKER */}
      {view === 'template' && (
        <div style={{ padding: 28, maxWidth: 680 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {Object.values(TEMPLATES).map(tmpl => (
              <div key={tmpl.id} onClick={() => setTemplate(tmpl.id as Template)} style={{ border: `0.5px solid ${template === tmpl.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#1A1F28', position: 'relative' }}>
                {template === tmpl.id && <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 11, color: '#C8C2BB', zIndex: 1 }}>✓</span>}
                <div style={{ background: tmpl.bg, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 20px', gap: 8 }}>
                  <div style={{ height: 3, background: tmpl.accent, borderRadius: 2, width: '55%' }} />
                  <div style={{ height: 1.5, background: tmpl.accent, opacity: 0.4, borderRadius: 1 }} />
                  <div style={{ height: 1.5, background: tmpl.accent, opacity: 0.2, borderRadius: 1, width: '40%' }} />
                </div>
                <div style={{ padding: '10px 14px' }}><div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{tmpl.name}</div></div>
              </div>
            ))}
          </div>
          <button style={{ ...btnP, width: '100%', padding: '12px', fontSize: 12 }} onClick={() => setView('brief')}>Use {TEMPLATES[template].name} →</button>
        </div>
      )}

      {/* BRIEF FORM */}
      {view === 'brief' && (
        <div style={{ padding: 28, maxWidth: 780 }}>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Client & project</div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Client / brand</label><input style={inp} value={clientName.toUpperCase()} onChange={e => setClientName(e.target.value)} /></div>
                <div><label style={lbl}>Contact person</label><input style={inp} value={contactName} onChange={e => setContactName(e.target.value)} /></div>
                <div><label style={lbl}>Client email</label><input style={inp} type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} /></div>
                <div><label style={lbl}>Project name</label><input style={inp} value={projectName} onChange={e => setProjectName(e.target.value)} /></div>
                <div><label style={lbl}>Logo URL</label><input style={inp} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." /></div>
              </div>
              <div><label style={lbl}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Commercial','Architectural','Events','Documentary','Social Content','Sport & Fitness'].map(cat => (
                    <button key={cat} onClick={() => setCategory(cat)} style={{ fontSize: 11, padding: '6px 13px', borderRadius: 3, border: `0.5px solid ${category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>The brief</div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Job type</label><input style={inp} value={jobType} onChange={e => setJobType(e.target.value)} placeholder="e.g. Brand Film, Event Coverage, Architectural Video" /></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Job description</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={3} value={jobDescription} onChange={e => setJobDescription(e.target.value)} /></div>
              <div><label style={lbl}>Key deliverables (one per line)</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={4} value={jobDeliverables} onChange={e => setJobDeliverables(e.target.value)} placeholder="1x Hero Brand Film (2-3 min)&#10;4x Social Reels&#10;1x BTS Cut" /></div>
            </div>
          </div>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Creative direction</div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Project goals</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={2} value={projectGoals} onChange={e => setProjectGoals(e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div><label style={lbl}>Tone & mood</label><input style={inp} value={tone} onChange={e => setTone(e.target.value)} /></div>
                <div><label style={lbl}>References</label><input style={inp} value={references} onChange={e => setReferences(e.target.value)} placeholder="Films, brands, visual styles..." /></div>
              </div>
            </div>
          </div>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Shoot details</div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Duration type</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(Object.entries(DURATION_LABELS) as [DurationType, string][]).map(([key, label]) => (
                    <button key={key} onClick={() => setShootDuration(key)} style={{ fontSize: 11, padding: '7px 13px', borderRadius: 3, border: `0.5px solid ${shootDuration === key ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: shootDuration === key ? 'rgba(200,194,187,0.08)' : 'transparent', color: shootDuration === key ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {shootDuration === 'multiday' && <div><label style={lbl}>Days</label><input style={inp} type="number" min="2" value={shootDays} onChange={e => setShootDays(parseInt(e.target.value)||2)} /></div>}
                <div><label style={lbl}>Additional hours</label><input style={inp} type="number" min="0" value={extraHours} onChange={e => setExtraHours(parseInt(e.target.value)||0)} /></div>
                <div><label style={lbl}>Shoot dates</label><input style={inp} value={shootDates} onChange={e => setShootDates(e.target.value)} /></div>
                <div><label style={lbl}>Locations</label><input style={inp} value={locations} onChange={e => setLocations(e.target.value)} /></div>
                <div><label style={lbl}>Delivery estimate</label><input style={inp} value={deliveryEstimate} onChange={e => setDeliveryEstimate(e.target.value)} /></div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px', gap: 10, marginBottom: 10 }}>
                    <input style={inp} value={d.name} onChange={e => updateDel(d.id,'name',e.target.value)} placeholder="e.g. Hero brand film..." />
                    <div><label style={{ ...lbl, marginBottom: 4 }}>Qty</label><input style={{ ...inp, textAlign: 'center' as const }} type="number" min="1" value={d.quantity} onChange={e => updateDel(d.id,'quantity',parseInt(e.target.value)||1)} /></div>
                    <div><label style={{ ...lbl, marginBottom: 4 }}>Length</label><input style={inp} value={d.duration} onChange={e => updateDel(d.id,'duration',e.target.value)} placeholder="2-3 min" /></div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ ...lbl, marginBottom: 6 }}>Formats</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[...VIDEO_FORMATS,...PHOTO_FORMATS].map(fmt => (
                        <button key={fmt} onClick={() => toggleFmt(d.id,fmt)} style={{ fontSize: 10, padding: '4px 9px', borderRadius: 3, border: `0.5px solid ${d.formats.includes(fmt) ? '#C8C2BB' : 'rgba(200,194,187,0.12)'}`, background: d.formats.includes(fmt) ? 'rgba(200,194,187,0.1)' : 'transparent', color: d.formats.includes(fmt) ? '#C8C2BB' : 'rgba(200,194,187,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}>{fmt}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input style={{ ...inp, fontSize: 11 }} value={d.notes} onChange={e => updateDel(d.id,'notes',e.target.value)} placeholder="Notes..." />
                    {deliverables.length > 1 && <button onClick={() => removeDel(d.id)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Crew</div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {crew.map(c => (
                  <div key={c.id} style={{ borderRadius: 5, border: `0.5px solid ${c.selected ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, background: c.selected ? 'rgba(200,194,187,0.04)' : 'transparent', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px', cursor: 'pointer' }} onClick={() => toggleCrew(c.id)}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${c.selected ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: c.selected ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{c.selected && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: '#C8C2BB' }}>{c.name}</div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{c.role}</div></div>
                    </div>
                    {c.selected && (
                      <div style={{ padding: '0 13px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div><label style={lbl}>Photo URL</label><input style={inp} value={c.photoUrl} onChange={e => setCrew(p => p.map(x => x.id === c.id ? { ...x, photoUrl: e.target.value } : x))} placeholder="https://..." /></div>
                        <div><label style={lbl}>Short bio</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6 }} rows={2} value={c.bio} onChange={e => setCrew(p => p.map(x => x.id === c.id ? { ...x, bio: e.target.value } : x))} /></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Equipment</div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', marginBottom: 12 }}>Equipment costs are included in your rate. Tick "hire" only if renting externally.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {equipment.map(e => (
                  <div key={e.id} style={{ padding: '9px 13px', borderRadius: 5, border: `0.5px solid ${e.selected ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, background: e.selected ? 'rgba(200,194,187,0.04)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => toggleEq(e.id)}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${e.selected ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: e.selected ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{e.selected && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                      <span style={{ fontSize: 12, color: '#C8C2BB' }}>{e.name}</span>
                    </div>
                    {e.selected && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(200,194,187,0.07)', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: 'rgba(200,194,187,0.5)' }} onClick={ev => ev.stopPropagation()}>
                          <input type="checkbox" checked={e.hire} onChange={() => toggleHire(e.id)} style={{ accentColor: '#C8C2BB' }} />External hire
                        </label>
                        {e.hire && <>
                          <input style={{ ...inp, width: 80, padding: '4px 8px', fontSize: 11 }} type="number" value={e.hireRate} onChange={ev => setEquipment(p => p.map(x => x.id === e.id ? { ...x, hireRate: parseFloat(ev.target.value)||0 } : x))} placeholder="$/day" onClick={ev => ev.stopPropagation()} />
                          <input style={{ ...inp, width: 50, padding: '4px 8px', fontSize: 11 }} type="number" min="1" value={e.days} onChange={ev => setEquipment(p => p.map(x => x.id === e.id ? { ...x, days: parseInt(ev.target.value)||1 } : x))} placeholder="days" onClick={ev => ev.stopPropagation()} />
                        </>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={panelS}>
            <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Pricing & terms</div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Pricing notes</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={2} value={pricingNotes} onChange={e => setPricingNotes(e.target.value)} placeholder="e.g. Travel TBC..." /></div>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Additional terms</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={2} value={tcNotes} onChange={e => setTcNotes(e.target.value)} placeholder="e.g. Talent release forms required..." /></div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'rgba(200,194,187,0.6)' }}>
                <input type="checkbox" checked={showDeposit} onChange={e => setShowDeposit(e.target.checked)} style={{ accentColor: '#C8C2BB' }} />Show 50% deposit note
              </label>
            </div>
          </div>

          <button onClick={() => { setView('deck'); setActiveSlide(0) }} disabled={!clientName || !projectName} style={{ width: '100%', background: !clientName || !projectName ? 'rgba(200,194,187,0.08)' : '#C8C2BB', color: !clientName || !projectName ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', borderRadius: 3, padding: '13px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, cursor: !clientName || !projectName ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            Preview deck →
          </button>
        </div>
      )}

      {/* DECK VIEWER */}
      {view === 'deck' && (
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 280px', height: 'calc(100vh - 48px)' }}>

          {/* LEFT PANEL */}
          <div style={{ background: '#0A0C10', borderRight: '0.5px solid rgba(200,194,187,0.09)', overflowY: 'auto', padding: '14px 10px' }}>
            <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.22)', marginBottom: 12, padding: '0 6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Slides</span><span>{slides.length}</span>
            </div>
            {slides.map((slide, idx) => (
              <div key={slide.id} onClick={() => setActiveSlide(idx)} style={{ marginBottom: 10, cursor: 'pointer' }}>
                <div style={{ border: `1.5px solid ${activeSlide === idx ? '#C8C2BB' : 'transparent'}`, borderRadius: 4, overflow: 'hidden', opacity: activeSlide === idx ? 1 : 0.5, transition: 'all 0.15s', aspectRatio: '16/9', position: 'relative' }}>
                  <SlidePreview slideItem={slide} scale={0.3} />
                </div>
                <div style={{ padding: '4px 4px 0', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.22)' }}>{idx + 1}</span>
                  <span style={{ fontSize: 11, color: activeSlide === idx ? '#C8C2BB' : 'rgba(200,194,187,0.38)' }}>{slide.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CENTRE CANVAS */}
          <div style={{ background: '#07090C', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px' }}>
            <div style={{ width: '100%', maxWidth: 860, aspectRatio: '16/9', position: 'relative', borderRadius: 6, overflow: 'hidden', border: `0.5px solid ${t.border}` }}>
              {currentSlide && <SlidePreview slideItem={currentSlide} scale={1} />}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center' }}>
              <button onClick={() => setActiveSlide(s => Math.max(0,s-1))} disabled={activeSlide===0} style={{ ...btnG, opacity: activeSlide===0?0.3:1, padding: '6px 14px' }}>←</button>
              <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{activeSlide+1} / {slides.length}</span>
              <button onClick={() => setActiveSlide(s => Math.min(slides.length-1,s+1))} disabled={activeSlide===slides.length-1} style={{ ...btnG, opacity: activeSlide===slides.length-1?0.3:1, padding: '6px 14px' }}>→</button>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div style={{ background: '#0F1216', borderLeft: '0.5px solid rgba(200,194,187,0.09)', overflowY: 'auto' }}>
            <div style={{ padding: '13px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#C8C2BB', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{currentSlide?.label}</span>
              {slides.length > 2 && (
                <button onClick={() => currentSlide && deleteSlide(currentSlide.id)} style={{ fontSize: 10, color: 'rgba(210,90,90,0.7)', background: 'rgba(210,90,90,0.08)', border: '0.5px solid rgba(210,90,90,0.2)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Delete slide</button>
              )}
            </div>

            {/* Template switcher */}
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 10 }}>Style</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.values(TEMPLATES).map(tmpl => (
                  <div key={tmpl.id} onClick={() => setTemplate(tmpl.id as Template)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 4, border: `0.5px solid ${template === tmpl.id ? '#C8C2BB' : 'rgba(200,194,187,0.07)'}`, background: template === tmpl.id ? 'rgba(200,194,187,0.05)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 28, height: 18, background: tmpl.bg, border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 5px', gap: 3, flexShrink: 0 }}>
                      <div style={{ height: 2, background: tmpl.accent, borderRadius: 1 }} />
                      <div style={{ height: 1, background: tmpl.accent, opacity: 0.3, borderRadius: 1 }} />
                    </div>
                    <span style={{ fontSize: 11, color: template === tmpl.id ? '#C8C2BB' : 'rgba(200,194,187,0.4)' }}>{tmpl.name}</span>
                    {template === tmpl.id && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#C8C2BB' }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Slide-specific controls */}
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Slide content</div>
              {currentSlide?.type === 'cover' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={lbl}>Deck title</label><input style={inp} value={projectName} onChange={e => setProjectName(e.target.value)} /></div>
                  <div><label style={lbl}>Client</label><input style={inp} value={clientName.toUpperCase()} onChange={e => setClientName(e.target.value)} /></div>
                  <div><label style={lbl}>Logo URL</label><input style={inp} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." /></div>
                  <div><label style={lbl}>Shoot dates</label><input style={inp} value={shootDates} onChange={e => setShootDates(e.target.value)} /></div>
                </div>
              )}
              {currentSlide?.type === 'brief' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={lbl}>Job type</label><input style={inp} value={jobType} onChange={e => setJobType(e.target.value)} /></div>
                  <div><label style={lbl}>Description</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6 }} rows={3} value={jobDescription} onChange={e => setJobDescription(e.target.value)} /></div>
                  <div><label style={lbl}>Key deliverables (one per line)</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6 }} rows={4} value={jobDeliverables} onChange={e => setJobDeliverables(e.target.value)} /></div>
                </div>
              )}
              {currentSlide?.type === 'creative' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label style={lbl}>Project goals</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6 }} rows={3} value={projectGoals} onChange={e => setProjectGoals(e.target.value)} /></div>
                  <div><label style={lbl}>Tone & mood</label><input style={inp} value={tone} onChange={e => setTone(e.target.value)} /></div>
                  <div><label style={lbl}>References</label><input style={inp} value={references} onChange={e => setReferences(e.target.value)} /></div>
                </div>
              )}
              {currentSlide?.type === 'deliverables' && (
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6 }}>Edit deliverables in the brief. Click "← Edit brief" to modify.</div>
              )}
              {currentSlide?.type === 'team' && (
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6 }}>Crew selection and photos are set in the brief. Click "← Edit brief" to update.</div>
              )}
              {currentSlide?.type === 'moodboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6 }}>Upload images or add YouTube/Vimeo links. Up to 6 items.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ ...btnG, fontSize: 10, padding: '7px 12px', cursor: 'pointer', textAlign: 'center', flex: 1, opacity: moodboardUploading ? 0.5 : 1 }}>
                      {moodboardUploading ? 'Uploading...' : '↑ Upload image'}
                      <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async e => { const files = Array.from(e.target.files || []); for (const f of files) { await uploadMoodboardImage(f) } }} disabled={moodboardUploading} />
                    </label>
                  </div>
                  <div>
                    <label style={lbl}>Add YouTube or Vimeo URL</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input style={{ ...inp, flex: 1 }} placeholder="https://youtube.com/watch?v=..." onKeyDown={async e => { if (e.key === 'Enter') { await addVideoLink((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = '' } }} />
                      <button style={{ ...btnG, fontSize: 10, padding: '7px 10px', flexShrink: 0 }} onClick={async e => { const input = (e.currentTarget.previousSibling as HTMLInputElement); await addVideoLink(input.value); input.value = '' }}>Add</button>
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', marginTop: 4 }}>Press Enter or click Add</div>
                  </div>
                  {moodboardImages.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={lbl}>Current items ({moodboardImages.length}/6)</label>
                      {moodboardImages.map((entry, i) => {
                        const isVideo = entry.startsWith('video:')
                        const label = isVideo ? '▶ Video' : `Image ${i + 1}`
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                            <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                            <button onClick={() => setMoodboardImages(p => p.filter((_, j) => j !== i))} style={{ fontSize: 12, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              {currentSlide?.type === 'investment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 4 }}>Shoot fee</div>
                  {shootDuration === 'hourly' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input style={{ ...inp, width: 55, padding: '5px 8px' }} type="number" min="2" value={shootHours} onChange={e => setShootHours(parseInt(e.target.value)||2)} />
                      <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>hrs × $175 = <strong style={{ color: '#C8C2BB' }}>${(shootHours*175).toLocaleString()}</strong></span>
                    </div>
                  )}
                  {shootDuration !== 'hourly' && <div style={{ fontSize: 12, color: '#C8C2BB' }}>${shootFee.toLocaleString()}</div>}
                  <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 8 }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 6 }}>Editing hours</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input style={{ ...inp, width: 55, padding: '5px 8px' }} type="number" min="0" value={editHours} onChange={e => setEditHours(parseInt(e.target.value)||0)} />
                      <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>hrs × $100 = <strong style={{ color: '#C8C2BB' }}>${(editHours*100).toLocaleString()}</strong></span>
                    </div>
                  </div>
                  <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: 'rgba(200,194,187,0.55)', marginBottom: showPreProd ? 6 : 0 }}>
                      <input type="checkbox" checked={showPreProd} onChange={e => setShowPreProd(e.target.checked)} style={{ accentColor: '#C8C2BB' }} />Pre-production
                    </label>
                    {showPreProd && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>$</span><input style={{ ...inp, flex: 1, padding: '5px 8px' }} type="number" min="0" value={preProdFee} onChange={e => setPreProdFee(parseFloat(e.target.value)||0)} placeholder="0" /></div>}
                  </div>
                  <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: 'rgba(200,194,187,0.55)', marginBottom: showTravel ? 6 : 0 }}>
                      <input type="checkbox" checked={showTravel} onChange={e => setShowTravel(e.target.checked)} style={{ accentColor: '#C8C2BB' }} />Travel & expenses
                    </label>
                    {showTravel && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>$</span><input style={{ ...inp, flex: 1, padding: '5px 8px' }} type="number" min="0" value={travelFee} onChange={e => setTravelFee(parseFloat(e.target.value)||0)} placeholder="0" /></div>}
                  </div>
                  {hireEq.length > 0 && (
                    <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 8 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 6 }}>Equipment hire</div>
                      {hireEq.map((e: any) => <div key={e.id} style={{ fontSize: 11, color: 'rgba(200,194,187,0.45)', marginBottom: 2 }}>{e.name} ×{e.days} — ${(e.hireRate*e.days).toLocaleString()}</div>)}
                    </div>
                  )}
                  <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.15)', paddingTop: 10, marginTop: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}><span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>Subtotal</span><span style={{ fontSize: 11, color: '#C8C2BB' }}>${subtotal.toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>GST (15%)</span><span style={{ fontSize: 11, color: '#C8C2BB' }}>${gst.toLocaleString()}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total inc. GST</span><span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>${total.toLocaleString()}</span></div>
                  </div>
                  <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 8 }}>
                    <label style={lbl}>Pricing notes</label>
                    <textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6 }} rows={2} value={pricingNotes} onChange={e => setPricingNotes(e.target.value)} placeholder="Additional notes..." />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 11, color: 'rgba(200,194,187,0.55)' }}>
                    <input type="checkbox" checked={showDeposit} onChange={e => setShowDeposit(e.target.checked)} style={{ accentColor: '#C8C2BB' }} />Show deposit note
                  </label>
                </div>
              )}
              {currentSlide?.type === 'terms' && (
                <div><label style={lbl}>Additional terms</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.6 }} rows={4} value={tcNotes} onChange={e => setTcNotes(e.target.value)} placeholder="Project-specific terms..." /></div>
              )}
            </div>

            {/* Summary */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Deck summary</div>
              {[{k:'Client',v:clientName||'—'},{k:'Project',v:projectName||'—'},{k:'Category',v:category},{k:'Duration',v:DURATION_LABELS[shootDuration]},{k:'Dates',v:shootDates||'TBC'},{k:'Delivery',v:deliveryEstimate}].map(({k,v})=>(
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.32)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: '#C8C2BB', textAlign: 'right', maxWidth: 150 }}>{v}</span>
                </div>
              ))}
              <button onClick={() => setSendModal(true)} style={{ ...btnP, width: '100%', marginTop: 16, padding: '10px' }}>Send to client</button>
            </div>
          </div>
        </div>
      )}

      {/* SEND MODAL */}
      {sendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 460, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Send pitch deck</div>
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 20, lineHeight: 1.6 }}>The client will receive a notification in their portal and a shareable link to view the deck.</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Client name</label><input style={inp} value={sendClient || clientName} onChange={e => setSendClient(e.target.value)} placeholder="Client name" /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Client email</label><input style={inp} value={sendEmail || clientEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@email.com" /></div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Shareable deck link</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, color: 'rgba(100,150,220,0.8)', flex: 1 }} value={deckLink} readOnly />
                <button onClick={copyLink} style={{ ...btnG, flexShrink: 0, fontSize: 10, padding: '8px 12px', borderColor: linkCopied ? 'rgba(100,200,130,0.4)' : undefined, color: linkCopied ? 'rgba(100,200,130,0.8)' : undefined }}>{linkCopied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', marginTop: 6 }}>Share this link directly, or use Print → Save as PDF to generate a PDF version.</div>
            </div>
            <div style={{ marginBottom: 18 }}><label style={lbl}>Personal note (optional)</label><textarea style={{ ...inp, resize: 'none' as const, lineHeight: 1.6 }} rows={3} placeholder={`Hi ${contactName||'there'}, please find our proposal for ${projectName} attached.`} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => {
                    const printData = { slides, template, clientName, contactName, clientEmail, logoUrl, projectName, category, jobType, jobDescription, jobDeliverables, projectGoals, tone, references, shootDuration, shootDays, shootDates, locations, deliveryEstimate, extraHours, deliverables, crew, equipment, pricingNotes, showDeposit, tcNotes, moodboardImages }
                    localStorage.setItem('pitch_print_data', JSON.stringify(printData))
                    window.open('/portal/studio/pitches/print', '_blank')
                  }} style={{ ...btnG, display: 'flex', alignItems: 'center', gap: 6 }}>↓ Save as PDF</button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setSendModal(false)} style={btnG}>Cancel</button>
                <button onClick={() => { setSendModal(false); setView('list') }} style={btnP}>Send to portal</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
