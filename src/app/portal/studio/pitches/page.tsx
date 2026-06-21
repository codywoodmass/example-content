'use client'
import { useState } from 'react'

const TEMPLATES = {
  bold: {
    id: 'bold', name: 'Dark & Bold', desc: 'High energy — sport, gym, events',
    preview: { bg: '#080808', accent: '#FFFFFF', line: '#FFFFFF' },
    aiTone: 'Bold, punchy and direct. Short powerful sentences. Active voice. High energy. Use strong verbs. No fluff.',
  },
  clean: {
    id: 'clean', name: 'Light & Clean', desc: 'Professional — corporate, legal, architecture',
    preview: { bg: '#F5F3F0', accent: '#1A1A1A', line: '#1A1A1A' },
    aiTone: 'Professional, measured and precise. Longer structured sentences. Formal but warm. Focus on trust, expertise and process.',
  },
  editorial: {
    id: 'editorial', name: 'Minimal & Editorial', desc: 'Creative — fashion, art, design',
    preview: { bg: '#0E1014', accent: '#C8C2BB', line: '#C8C2BB' },
    aiTone: 'Considered, creative and conceptual. Slightly poetic but not flowery. Focus on craft, intention and vision. Understated confidence.',
  },
}

const SECTIONS = ['Cover', 'Creative Direction', 'Scope & Deliverables', 'Pricing', 'Timeline & Crew', 'Terms & Conditions']

const EQUIPMENT_REGISTER = [
  { id: 'fx3-1', name: 'Sony FX3 — Body #1', category: 'Camera', dayRate: 150 },
  { id: 'fx3-2', name: 'Sony FX3 — Body #2', category: 'Camera', dayRate: 150 },
  { id: 'a74', name: 'Sony A7 IV — Stills', category: 'Camera', dayRate: 100 },
  { id: 'mavic3', name: 'DJI Mavic 3 Pro', category: 'Drone', dayRate: 200 },
  { id: 'air3', name: 'DJI Air 3 — Backup', category: 'Drone', dayRate: 120 },
  { id: 'sigma', name: 'Sigma 24-70mm f/2.8', category: 'Lens', dayRate: 80 },
  { id: 'aputure', name: 'Aputure 600D Pro (2x kit)', category: 'Lighting', dayRate: 180 },
]

const TEAM_MEMBERS = [
  { id: 'jd', name: 'Jordan D.', role: 'Director / Shooter', dayRate: 800 },
  { id: 'sk', name: 'Sam K.', role: 'Shooter / Editor', dayRate: 650 },
  { id: 'mt', name: 'Mia T.', role: 'Editor', dayRate: 550 },
]

type LineItem = { id: string; description: string; qty: number; rate: number }
type EquipmentItem = { id: string; name: string; days: number; rate: number; custom?: boolean }
type CrewItem = { id: string; name: string; role: string; days: number; rate: number; custom?: boolean }

export default function PitchDeckPage() {
  const [view, setView] = useState<'list' | 'template' | 'new' | 'export'>('list')
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('editorial')
  const [generating, setGenerating] = useState(false)
  const [sections, setSections] = useState<Record<number, string>>({})
  const [sectionLoading, setSectionLoading] = useState<Record<number, boolean>>({})
  const [copiedSection, setCopiedSection] = useState<number | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [pitchLink, setPitchLink] = useState('')
  const [pdfLink, setPdfLink] = useState('')
  const [customCrewName, setCustomCrewName] = useState('')
  const [customCrewRole, setCustomCrewRole] = useState('')
  const [customCrewRate, setCustomCrewRate] = useState('')
  const [customEquipment, setCustomEquipment] = useState('')
  const [customEquipmentRate, setCustomEquipmentRate] = useState('')

  const [form, setForm] = useState({
    clientName: '', contactName: '', clientEmail: '', logoUrl: '', brandGuidelinesUrl: '',
    project: '', category: 'Commercial', projectGoals: '', tone: '', references: '',
    moodboardUrl: '', deliverables: '', shootDays: '1', shootDates: '', locations: '',
    deliveryEstimate: '10–14 business days', notes: '',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Director — day rate', qty: 1, rate: 800 },
    { id: '2', description: 'Post production & edit', qty: 1, rate: 1200 },
  ])
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem[]>([])
  const [selectedCrew, setSelectedCrew] = useState<CrewItem[]>([])

  const t = TEMPLATES[selectedTemplate]
  const lineTotal = lineItems.reduce((sum, i) => sum + i.qty * i.rate, 0)
  const equipmentTotal = selectedEquipment.reduce((sum, e) => sum + e.days * e.rate, 0)
  const crewTotal = selectedCrew.reduce((sum, c) => sum + c.days * c.rate, 0)
  const grandTotal = lineTotal + equipmentTotal + crewTotal

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }
  const panel: React.CSSProperties = { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, marginBottom: 14 }

  function addLine() { setLineItems(p => [...p, { id: Date.now().toString(), description: '', qty: 1, rate: 0 }]) }
  function updateLine(id: string, field: keyof LineItem, value: string | number) { setLineItems(p => p.map(i => i.id === id ? { ...i, [field]: value } : i)) }
  function removeLine(id: string) { setLineItems(p => p.filter(i => i.id !== id)) }
  function toggleEquipment(eq: typeof EQUIPMENT_REGISTER[0]) { setSelectedEquipment(p => p.find(e => e.id === eq.id) ? p.filter(e => e.id !== eq.id) : [...p, { id: eq.id, name: eq.name, days: parseInt(form.shootDays) || 1, rate: eq.dayRate }]) }
  function addCustomEquipment() { if (!customEquipment) return; setSelectedEquipment(p => [...p, { id: Date.now().toString(), name: customEquipment, days: parseInt(form.shootDays) || 1, rate: parseFloat(customEquipmentRate) || 0, custom: true }]); setCustomEquipment(''); setCustomEquipmentRate('') }
  function toggleCrew(m: typeof TEAM_MEMBERS[0]) { setSelectedCrew(p => p.find(c => c.id === m.id) ? p.filter(c => c.id !== m.id) : [...p, { id: m.id, name: m.name, role: m.role, days: parseInt(form.shootDays) || 1, rate: m.dayRate }]) }
  function addCustomCrew() { if (!customCrewName) return; setSelectedCrew(p => [...p, { id: Date.now().toString(), name: customCrewName, role: customCrewRole, days: parseInt(form.shootDays) || 1, rate: parseFloat(customCrewRate) || 0, custom: true }]); setCustomCrewName(''); setCustomCrewRole(''); setCustomCrewRate('') }

  function copySection(idx: number) {
    navigator.clipboard.writeText(`--- ${SECTIONS[idx].toUpperCase()} ---\n\n${sections[idx]}`)
    setCopiedSection(idx)
    setTimeout(() => setCopiedSection(null), 2000)
  }

  function copyAll() {
    const full = SECTIONS.map((name, idx) => `--- ${name.toUpperCase()} ---\n\n${sections[idx] || '[Not yet generated]'}`).join('\n\n\n')
    navigator.clipboard.writeText(full)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  async function generateAllSections() {
    setGenerating(true)
    try {
      const res = await fetch('/api/pitch-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, lineItems, selectedEquipment, selectedCrew, grandTotal, template: selectedTemplate, aiTone: t.aiTone }),
      })
      const data = await res.json()
      if (data.sections) { setSections(data.sections); setView('export') }
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  async function regenerateSection(idx: number) {
    setSectionLoading(p => ({ ...p, [idx]: true }))
    try {
      const res = await fetch('/api/pitch-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, lineItems, selectedEquipment, selectedCrew, grandTotal, template: selectedTemplate, aiTone: t.aiTone, sectionOnly: idx }),
      })
      const data = await res.json()
      if (data.sections?.[idx]) setSections(p => ({ ...p, [idx]: data.sections[idx] }))
    } catch (e) { console.error(e) }
    setSectionLoading(p => ({ ...p, [idx]: false }))
  }

  const decks = [
    { title: 'Elephant Hill — Harvest Season Brand Film', client: 'Elephant Hill Winery', meta: 'Created 10 Jun 2026', status: 'Awaiting review', sc: 'rgba(100,150,220,0.85)', sb: 'rgba(25,45,80,0.5)', template: 'editorial' },
    { title: 'Black Barn — Season Campaign 2026', client: 'Black Barn Retreats', meta: 'Accepted 1 May 2026', status: 'Accepted', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)', template: 'editorial' },
    { title: 'Studio Forma — Architectural Portfolio', client: 'Studio Forma', meta: 'Accepted 18 Mar 2026', status: 'Accepted', sc: 'rgba(100,200,130,0.85)', sb: 'rgba(30,70,45,0.5)', template: 'clean' },
    { title: 'Napier City Brewers — Brand Film', client: 'Napier City Brewers', meta: 'Draft · Not sent', status: 'Draft', sc: 'rgba(200,194,187,0.6)', sb: 'rgba(200,194,187,0.1)', template: 'bold' },
  ]

  const btnPrimary: React.CSSProperties = { fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }
  const btnGhost: React.CSSProperties = { fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13 }}>

      {/* TOPBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
            {view === 'list' ? 'Pitch Decks' : view === 'template' ? 'Choose a template' : view === 'new' ? 'New Pitch Deck' : `${form.project || 'Untitled'} — Content Ready`}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>
            {view === 'list' ? 'Commercial & architectural proposals' : view === 'template' ? 'Sets the visual style and AI writing tone' : view === 'new' ? 'Brief the project — Claude drafts all 6 sections' : 'Copy content into Pitch.com or Canva to design, then paste the link back here'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view === 'template' && <button style={btnGhost} onClick={() => setView('list')}>← Back</button>}
          {view === 'new' && <button style={btnGhost} onClick={() => setView('template')}>← Change template</button>}
          {view === 'export' && <button style={btnGhost} onClick={() => setView('new')}>← Edit brief</button>}
          {view === 'list' && <button style={btnPrimary} onClick={() => setView('template')}>+ New deck</button>}
          {view === 'export' && <button style={btnPrimary} onClick={() => setSendModal(true)}>Send to client</button>}
        </div>
      </div>

      {/* LIST */}
      {view === 'list' && (
        <div style={{ padding: 28 }}>
          <div style={panel}>
            {decks.map((deck, i) => {
              const tmpl = TEMPLATES[deck.template as keyof typeof TEMPLATES]
              return (
                <div key={i} onClick={() => { setSelectedTemplate(deck.template as keyof typeof TEMPLATES); setView('export') }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < decks.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                  <div style={{ width: 48, height: 34, background: tmpl.preview.bg, border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 8px', gap: 4, flexShrink: 0 }}>
                    <div style={{ height: 2, background: tmpl.preview.accent, borderRadius: 1, width: '70%' }} />
                    <div style={{ height: 1, background: tmpl.preview.line, opacity: 0.4, borderRadius: 1 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>{deck.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{deck.client} · {deck.meta} · {tmpl.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: deck.sb, color: deck.sc, border: `0.5px solid ${deck.sc}44` }}>{deck.status}</span>
                    <button style={{ ...btnGhost, fontSize: 10, padding: '5px 10px' }} onClick={e => e.stopPropagation()}>Edit</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TEMPLATE PICKER */}
      {view === 'template' && (
        <div style={{ padding: 28, maxWidth: 780 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Select a template — sets the visual style and AI writing tone</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {Object.values(TEMPLATES).map(tmpl => (
              <div key={tmpl.id} onClick={() => setSelectedTemplate(tmpl.id as keyof typeof TEMPLATES)} style={{ border: `0.5px solid ${selectedTemplate === tmpl.id ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', background: '#1A1F28', position: 'relative' }}>
                {selectedTemplate === tmpl.id && <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 12, color: '#C8C2BB' }}>✓</span>}
                <div style={{ background: tmpl.preview.bg, padding: '24px 20px', minHeight: 120 }}>
                  <div style={{ height: 3, background: tmpl.preview.accent, borderRadius: 2, width: '60%', marginBottom: 10 }} />
                  <div style={{ height: 1.5, background: tmpl.preview.line, opacity: 0.5, borderRadius: 1, marginBottom: 6 }} />
                  <div style={{ height: 1.5, background: tmpl.preview.line, opacity: 0.3, borderRadius: 1, width: '80%', marginBottom: 6 }} />
                  <div style={{ height: 1.5, background: tmpl.preview.line, opacity: 0.3, borderRadius: 1, width: '65%', marginBottom: 14 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ height: 20, width: 60, background: tmpl.preview.accent, borderRadius: 2, opacity: 0.7 }} />
                  </div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 4 }}>{tmpl.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{tmpl.desc}</div>
                  <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', marginTop: 8, lineHeight: 1.5, fontStyle: 'italic' }}>"{tmpl.aiTone.split('.')[0]}."</div>
                </div>
              </div>
            ))}
          </div>
          <button style={{ ...btnPrimary, width: '100%', padding: '13px', fontSize: 12 }} onClick={() => setView('new')}>Use {t.name} template →</button>
        </div>
      )}

      {/* NEW DECK FORM */}
      {view === 'new' && (
        <div style={{ padding: 28, maxWidth: 780 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5 }}>
            <div style={{ width: 24, height: 18, background: t.preview.bg, border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '3px 4px', gap: 2, flexShrink: 0 }}>
              <div style={{ height: 2, background: t.preview.accent, borderRadius: 1 }} />
              <div style={{ height: 1, background: t.preview.line, opacity: 0.4, borderRadius: 1 }} />
            </div>
            <span style={{ fontSize: 12, color: '#C8C2BB' }}>{t.name}</span>
            <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>— {t.desc}</span>
            <button onClick={() => setView('template')} style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Change →</button>
          </div>

          <div style={{ background: 'rgba(100,150,220,0.07)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 7, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,150,220,0.9)', marginBottom: 4 }}>AI-assisted pitch deck</div>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', lineHeight: 1.65 }}>Complete the brief. Claude drafts all 6 sections in the {t.name} tone. You then paste the content into Pitch.com or Canva to design visually, and share the link back here for the client.</div>
            </div>
          </div>

          {/* CLIENT */}
          <div style={panel}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Client & project</div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Client / brand name</label><input style={inp} value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. Elephant Hill Winery" /></div>
                <div><label style={lbl}>Contact person</label><input style={inp} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="e.g. Marcus Reid" /></div>
                <div><label style={lbl}>Client email</label><input style={inp} type="email" value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="email@client.co.nz" /></div>
                <div><label style={lbl}>Project name</label><input style={inp} value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} placeholder="e.g. Harvest Season Brand Film 2026" /></div>
                <div><label style={lbl}>Logo URL</label><input style={inp} value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." /></div>
                <div><label style={lbl}>Brand guidelines URL</label><input style={inp} value={form.brandGuidelinesUrl} onChange={e => setForm(f => ({ ...f, brandGuidelinesUrl: e.target.value }))} placeholder="https://..." /></div>
              </div>
              <div>
                <label style={lbl}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Commercial', 'Architectural', 'Events', 'Documentary', 'Social Content', 'Sport & Fitness'].map(cat => (
                    <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))} style={{ fontSize: 11, padding: '7px 14px', borderRadius: 3, border: `0.5px solid ${form.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: form.category === cat ? 'rgba(200,194,187,0.08)' : 'transparent', color: form.category === cat ? '#C8C2BB' : 'rgba(200,194,187,0.35)', cursor: 'pointer', fontFamily: 'inherit' }}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CREATIVE */}
          <div style={panel}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Creative direction</div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>Project goals & objectives</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={3} value={form.projectGoals} onChange={e => setForm(f => ({ ...f, projectGoals: e.target.value }))} placeholder="What does the client want to achieve? Target audience? What feeling or action should the content inspire?" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Tone & mood</label><input style={inp} value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))} placeholder="e.g. Cinematic, warm, premium, understated" /></div>
                <div><label style={lbl}>Moodboard / visual reference URL</label><input style={inp} value={form.moodboardUrl} onChange={e => setForm(f => ({ ...f, moodboardUrl: e.target.value }))} placeholder="https://Pinterest, Behance..." /></div>
              </div>
              <div><label style={lbl}>References & inspiration</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={2} value={form.references} onChange={e => setForm(f => ({ ...f, references: e.target.value }))} placeholder="Specific films, brands, directors or visual styles..." /></div>
            </div>
          </div>

          {/* SCOPE */}
          <div style={panel}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Scope & deliverables</div>
            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}><label style={lbl}>What will be delivered</label><textarea style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }} rows={4} value={form.deliverables} onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))} placeholder="e.g. 1x hero brand film (2-3 min), 4x social reels, 1x BTS cut..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div><label style={lbl}>Shoot days</label><input style={inp} type="number" min="1" value={form.shootDays} onChange={e => setForm(f => ({ ...f, shootDays: e.target.value }))} /></div>
                <div><label style={lbl}>Shoot dates</label><input style={inp} value={form.shootDates} onChange={e => setForm(f => ({ ...f, shootDates: e.target.value }))} placeholder="e.g. 15–16 Jul 2026" /></div>
                <div><label style={lbl}>Delivery estimate</label><input style={inp} value={form.deliveryEstimate} onChange={e => setForm(f => ({ ...f, deliveryEstimate: e.target.value }))} /></div>
              </div>
              <div><label style={lbl}>Locations</label><input style={inp} value={form.locations} onChange={e => setForm(f => ({ ...f, locations: e.target.value }))} placeholder="e.g. Winery estate, Te Mata Peak, studio" /></div>
            </div>
          </div>

          {/* PRICING */}
          <div style={panel}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Pricing</span>
              <button onClick={addLine} style={{ ...btnGhost, fontSize: 10, padding: '5px 12px' }}>+ Add line</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 32px', gap: 8, marginBottom: 8 }}>
                {['Description','Qty','Rate ($)',''].map(h => <span key={h} style={{ ...lbl, marginBottom: 0, fontSize: 9 }}>{h}</span>)}
              </div>
              {lineItems.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px 32px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input style={inp} value={item.description} onChange={e => updateLine(item.id, 'description', e.target.value)} placeholder="e.g. Director day rate" />
                  <input style={{ ...inp, textAlign: 'center' as const }} type="number" min="1" value={item.qty} onChange={e => updateLine(item.id, 'qty', parseInt(e.target.value) || 1)} />
                  <input style={inp} type="number" value={item.rate} onChange={e => updateLine(item.id, 'rate', parseFloat(e.target.value) || 0)} />
                  <button onClick={() => removeLine(item.id)} style={{ fontSize: 14, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* CREW */}
          <div style={panel}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Crew</div>
            <div style={{ padding: 18 }}>
              <label style={lbl}>Select from team</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {TEAM_MEMBERS.map(m => {
                  const sel = selectedCrew.find(c => c.id === m.id)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 5, border: `0.5px solid ${sel ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, background: sel ? 'rgba(200,194,187,0.04)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleCrew(m)}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${sel ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: sel ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{sel && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: '#C8C2BB' }}>{m.name}</div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{m.role} · ${m.dayRate}/day</div></div>
                      {sel && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={e => e.stopPropagation()}><span style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>Days:</span><input type="number" min="1" value={sel.days} onChange={e => setSelectedCrew(p => p.map(c => c.id === m.id ? { ...c, days: parseInt(e.target.value) || 1 } : c))} style={{ ...inp, width: 50, padding: '4px 8px' }} /></div>}
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 14 }}>
                <label style={lbl}>Add freelancer</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 64px', gap: 8 }}>
                  <input style={inp} value={customCrewName} onChange={e => setCustomCrewName(e.target.value)} placeholder="Name" />
                  <input style={inp} value={customCrewRole} onChange={e => setCustomCrewRole(e.target.value)} placeholder="Role" />
                  <input style={inp} type="number" value={customCrewRate} onChange={e => setCustomCrewRate(e.target.value)} placeholder="$/day" />
                  <button onClick={addCustomCrew} style={{ ...btnPrimary, padding: '9px' }}>Add</button>
                </div>
                {selectedCrew.filter(c => c.custom).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '8px 12px', borderRadius: 4, background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.08)' }}>
                    <span style={{ flex: 1, fontSize: 12, color: '#C8C2BB' }}>{c.name} — {c.role}</span>
                    <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>${c.rate}/day × {c.days}d = ${(c.rate * c.days).toLocaleString()}</span>
                    <button onClick={() => setSelectedCrew(p => p.filter(x => x.id !== c.id))} style={{ fontSize: 12, color: 'rgba(210,90,90,0.7)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EQUIPMENT */}
          <div style={panel}>
            <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Equipment</div>
            <div style={{ padding: 18 }}>
              <label style={lbl}>Select from register</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {EQUIPMENT_REGISTER.map(eq => {
                  const sel = selectedEquipment.find(e => e.id === eq.id)
                  return (
                    <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 5, border: `0.5px solid ${sel ? '#C8C2BB' : 'rgba(200,194,187,0.09)'}`, background: sel ? 'rgba(200,194,187,0.04)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleEquipment(eq)}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${sel ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: sel ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{sel && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                      <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: '#C8C2BB' }}>{eq.name}</div><div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{eq.category} · ${eq.dayRate}/day</div></div>
                      {sel && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} onClick={e => e.stopPropagation()}><span style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>Days:</span><input type="number" min="1" value={sel.days} onChange={e => setSelectedEquipment(p => p.map(x => x.id === eq.id ? { ...x, days: parseInt(e.target.value) || 1 } : x))} style={{ ...inp, width: 50, padding: '4px 8px' }} /></div>}
                    </div>
                  )
                })}
              </div>
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 14 }}>
                <label style={lbl}>Add custom / hire item</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 64px', gap: 8 }}>
                  <input style={inp} value={customEquipment} onChange={e => setCustomEquipment(e.target.value)} placeholder="e.g. Gimbal hire" />
                  <input style={inp} type="number" value={customEquipmentRate} onChange={e => setCustomEquipmentRate(e.target.value)} placeholder="$/day" />
                  <button onClick={addCustomEquipment} style={{ ...btnPrimary, padding: '9px' }}>Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* TOTAL */}
          <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.12)', borderRadius: 7, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total estimate</div>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', marginTop: 2 }}>Lines ${lineTotal.toLocaleString()} + Crew ${crewTotal.toLocaleString()} + Equipment ${equipmentTotal.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(200,194,187,0.4)' }}>+ GST</span></div>
          </div>

          <button onClick={generateAllSections} disabled={generating || !form.clientName || !form.project} style={{ width: '100%', background: generating || !form.clientName || !form.project ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: generating || !form.clientName || !form.project ? 'rgba(200,194,187,0.25)' : '#111', border: 'none', borderRadius: 3, padding: '14px', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, cursor: generating || !form.clientName || !form.project ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {generating ? `✦ Drafting all 6 sections in ${t.name} style...` : `✦ Generate pitch deck — ${t.name}`}
          </button>
          {(!form.clientName || !form.project) && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', textAlign: 'center', marginTop: 8 }}>Client name and project name required</div>}
        </div>
      )}

      {/* EXPORT / CONTENT VIEW */}
      {view === 'export' && (
        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, maxWidth: 1100 }}>

          {/* LEFT: SECTIONS */}
          <div>
            {/* WORKFLOW STEPS */}
            <div style={{ background: 'rgba(100,150,220,0.07)', border: '0.5px solid rgba(100,150,220,0.2)', borderRadius: 7, padding: '16px 18px', marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,150,220,0.9)', marginBottom: 12 }}>How to finish your pitch deck</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { step: '1', label: 'Copy each section below', desc: 'Use the copy buttons to grab each section\'s content' },
                  { step: '2', label: 'Open Pitch.com or Canva', desc: 'Paste into slides using the ' + t.name + ' visual style as your guide' },
                  { step: '3', label: 'Design and export', desc: 'Add your branding, client logo, images and export as PDF' },
                  { step: '4', label: 'Paste the link back here', desc: 'Add the Pitch share link or PDF link in the panel on the right, then send to client' },
                ].map(({ step, label, desc }) => (
                  <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(100,150,220,0.15)', border: '0.5px solid rgba(100,150,220,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'rgba(100,150,220,0.85)', flexShrink: 0 }}>{step}</div>
                    <div><div style={{ fontSize: 12, color: '#C8C2BB', marginBottom: 2 }}>{label}</div><div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{desc}</div></div>
                  </div>
                ))}
              </div>
            </div>

            {/* COPY ALL */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>All 6 sections — {t.name} tone</span>
              <button onClick={copyAll} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}>
                {copiedAll ? '✓ Copied!' : '⎘ Copy all sections'}
              </button>
            </div>

            {/* INDIVIDUAL SECTIONS */}
            {SECTIONS.map((name, idx) => (
              <div key={idx} style={{ ...panel, marginBottom: 12 }}>
                <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', minWidth: 16 }}>{idx + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{name}</span>
                    {sections[idx] && <span style={{ fontSize: 9, color: 'rgba(100,200,130,0.7)' }}>✓ Ready</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => regenerateSection(idx)} disabled={sectionLoading[idx]} style={{ ...btnGhost, fontSize: 10, padding: '4px 10px', borderColor: 'rgba(100,150,220,0.3)', color: 'rgba(100,150,220,0.7)' }}>
                      {sectionLoading[idx] ? 'Redrafting...' : '✦ Redraft'}
                    </button>
                    <button onClick={() => copySection(idx)} disabled={!sections[idx]} style={{ ...btnGhost, fontSize: 10, padding: '4px 10px', opacity: sections[idx] ? 1 : 0.4 }}>
                      {copiedSection === idx ? '✓ Copied!' : '⎘ Copy'}
                    </button>
                  </div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  {sections[idx] ? (
                    <>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.7)', lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{sections[idx]}</div>
                      <textarea value={sections[idx]} onChange={e => setSections(p => ({ ...p, [idx]: e.target.value }))} style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.7, minHeight: 80, fontSize: 12, color: 'rgba(200,194,187,0.5)', marginTop: 8 }} />
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)', fontStyle: 'italic', padding: '8px 0' }}>Not yet generated — click Redraft to generate this section</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: LINKS + SUMMARY */}
          <div>
            {/* DECK LINKS */}
            <div style={{ ...panel, marginBottom: 14 }}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Deck links</div>
              <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Pitch.com share link</label>
                  <input style={inp} value={pitchLink} onChange={e => setPitchLink(e.target.value)} placeholder="https://pitch.com/v/..." />
                  <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', marginTop: 4 }}>Paste after designing in Pitch.com</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>PDF link (Google Drive or Dropbox)</label>
                  <input style={inp} value={pdfLink} onChange={e => setPdfLink(e.target.value)} placeholder="https://drive.google.com/..." />
                  <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', marginTop: 4 }}>Paste after exporting PDF from Canva or Pitch</div>
                </div>
                <button onClick={() => setSendModal(true)} disabled={!pitchLink && !pdfLink} style={{ width: '100%', background: pitchLink || pdfLink ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: pitchLink || pdfLink ? '#111' : 'rgba(200,194,187,0.25)', border: 'none', borderRadius: 3, padding: '11px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500, cursor: pitchLink || pdfLink ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  Send to client portal
                </button>
                {!pitchLink && !pdfLink && <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', textAlign: 'center', marginTop: 6 }}>Add a link above to send to client</div>}
              </div>
            </div>

            {/* SUMMARY */}
            <div style={panel}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Deck summary</div>
              {[
                { k: 'Client', v: form.clientName || '—' },
                { k: 'Project', v: form.project || '—' },
                { k: 'Category', v: form.category },
                { k: 'Template', v: t.name },
                { k: 'Shoot dates', v: form.shootDates || 'TBC' },
                { k: 'Delivery', v: form.deliveryEstimate },
              ].map(({ k, v }) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '0.5px solid rgba(200,194,187,0.05)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{k}</span>
                  <span style={{ fontSize: 11, color: '#C8C2BB', fontWeight: 500, textAlign: 'right', maxWidth: 150 }}>{v}</span>
                </div>
              ))}
              <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Total</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()}<span style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}> + GST</span></span>
              </div>
            </div>

            {/* COMPLETION */}
            <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Sections complete</div>
              <div style={{ height: 4, background: 'rgba(200,194,187,0.07)', borderRadius: 2, marginBottom: 8 }}><div style={{ height: '100%', width: `${(Object.keys(sections).length / SECTIONS.length) * 100}%`, background: '#C8C2BB', opacity: 0.5, borderRadius: 2, transition: 'width 0.3s' }} /></div>
              <div style={{ fontSize: 12, color: '#C8C2BB' }}>{Object.keys(sections).length} of {SECTIONS.length} sections ready</div>
            </div>
          </div>
        </div>
      )}

      {/* SEND MODAL */}
      {sendModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: 440, maxWidth: '95vw' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Send pitch deck to client</div>
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 20, lineHeight: 1.6 }}>The client will receive a notification in their portal with the link to view and accept the deck.</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Send to</label><input style={inp} defaultValue={form.clientEmail} placeholder="client@email.com" /></div>
            {pitchLink && <div style={{ marginBottom: 14 }}><label style={lbl}>Pitch.com link</label><input style={{ ...inp, color: 'rgba(100,150,220,0.8)' }} value={pitchLink} readOnly /></div>}
            {pdfLink && <div style={{ marginBottom: 14 }}><label style={lbl}>PDF download link</label><input style={{ ...inp, color: 'rgba(100,150,220,0.8)' }} value={pdfLink} readOnly /></div>}
            <div style={{ marginBottom: 18 }}><label style={lbl}>Personal note (optional)</label><textarea style={{ ...inp, resize: 'none' as const, lineHeight: 1.6 }} rows={3} placeholder={`Hi ${form.contactName || 'there'}, please find our proposal for ${form.project} below...`} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setSendModal(false)} style={btnGhost}>Cancel</button>
              <button onClick={() => { setSendModal(false); setView('list') }} style={btnPrimary}>Send now</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
