'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

function DriveThumb({ project, onClick }: { project: any; onClick: () => void }) {
  const [firstFile, setFirstFile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!project.drive_url) { setLoading(false); return }
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(data => { 
        const files = data.files || []
        setFirstFile(files[0] || null)
        setLoading(false) 
      })
      .catch(() => setLoading(false))
  }, [project.drive_url])

  const isVideo = (mime: string) => mime?.includes('video')

  return (
    <div onClick={onClick} style={{ flexShrink:0, width:220, background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', cursor:'pointer' }} onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(200,194,187,0.2)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(200,194,187,0.09)')}>
      <div style={{ height:124, background:'#0E1014', position:'relative', overflow:'hidden' }}>
        {loading ? (
          <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(200,194,187,0.2)', fontSize:11 }}>Loading...</div>
        ) : firstFile ? (
          isVideo(firstFile.mimeType) ? (
            <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#0a0c10', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src={`/api/drive?thumb=${firstFile.id}`} alt={project.title} style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.8 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
              <div style={{ position:'absolute', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(200,194,187,0.4)' }}><span style={{ fontSize:14, marginLeft:3 }}>▶</span></div>
            </div>
          ) : (
            <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt={project.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
          )
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
            <span style={{ fontSize:28, opacity:0.25 }}>📁</span>
            <span style={{ fontSize:10, color:'rgba(200,194,187,0.25)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Coming soon</span>
          </div>
        )}
      </div>
      <div style={{ padding:'12px 14px' }}>
        <div style={{ fontSize:12, fontWeight:500, color:'#C8C2BB', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project.title}</div>
        <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)', marginBottom:8 }}>{project.delivery_due ? new Date(project.delivery_due+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
        <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'2px 7px', borderRadius:2, background:'rgba(100,200,130,0.15)', color:'rgba(100,200,130,0.9)', border:'0.5px solid rgba(100,200,130,0.3)' }}>Delivered</span>
      </div>
    </div>
  )
}

function DriveFolder({ project }: { project: any }) {
  const [files, setFiles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [previewFile, setPreviewFile] = React.useState<any>(null)

  React.useEffect(() => {
    if (!project.drive_url) return
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [project.drive_url])

  const isVideo = (mime: string) => mime?.includes('video')
  const isImage = (mime: string) => mime?.includes('image')

  if (loading) return <div style={{ marginBottom:32 }}><div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.28)', marginBottom:14 }}>{project.title}</div><div style={{ color:'rgba(200,194,187,0.2)', fontSize:12, padding:'20px 0' }}>Loading files...</div></div>
  if (files.length === 0) return null

  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.28)' }}>{project.title}</div>
        <a href={project.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'rgba(200,194,187,0.35)', textDecoration:'none', letterSpacing:'0.08em', textTransform:'uppercase' }}>Open in Drive →</a>
      </div>
      <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', marginBottom:8, padding:'14px 18px' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:4 }}>{project.title}</div>
        <div style={{ display:'flex', gap:16 }}>
          {project.shoot_date && <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Shoot: {new Date(project.shoot_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}</div>}
          {project.address && <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{project.address.split(',')[0]}</div>}
          <div style={{ fontSize:11, color:'rgba(100,200,130,0.7)' }}>{files.length} file{files.length!==1?'s':''}</div>
        </div>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', gap:14 }}>
        {files.map((file: any) => (
          <div key={file.id} style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', cursor:'pointer', width: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? 'calc(33% - 10px)' : 'calc(50% - 7px)' }} onClick={() => setPreviewFile(file)}>
            <div style={{ aspectRatio: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? '9/16' : '16/9', background:'#0E1014', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isVideo(file.mimeType) ? (
                <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#0a0c10' }} onClick={e => e.stopPropagation()}>
                  {file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? (
                <iframe src={`https://drive.google.com/file/d/${file.id}/preview`} style={{ width:'56%', height:'calc(100% + 220px)', border:'none', marginTop:'-110px', marginBottom:'-110px' }} allow="autoplay; fullscreen" allowFullScreen />
              ) : (
                <iframe src={`https://drive.google.com/file/d/${file.id}/preview`} style={{ width:'100%', height:'calc(100% + 220px)', border:'none', marginTop:'-110px', marginBottom:'-110px' }} allow="autoplay; fullscreen" allowFullScreen />
              )}
                </div>
              ) : isImage(file.mimeType) ? (
                <img src={`https://lh3.googleusercontent.com/d/${file.id}`} alt={file.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { const t=e.target as HTMLImageElement; t.src=`https://drive.google.com/thumbnail?id=${file.id}&sz=w800`; t.onerror=()=>{t.style.display='none'} }} />
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>📄</div>
              )}
              <span style={{ position:'absolute', top:8, left:8, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', background:'rgba(0,0,0,0.6)', color:'#C8C2BB', padding:'3px 8px', borderRadius:2 }}>{isVideo(file.mimeType) ? 'Video' : isImage(file.mimeType) ? 'Photo' : 'File'}</span>
              {file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) && <span style={{ position:'absolute', top:8, right:8, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', background:'rgba(0,0,0,0.6)', color:'rgba(200,194,187,0.7)', padding:'3px 8px', borderRadius:2 }}>Vertical</span>}
            </div>
            <div style={{ padding:'10px 14px 6px' }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#C8C2BB', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</div>
              {file.size && <div style={{ fontSize:10, color:'rgba(200,194,187,0.35)' }}>{(parseInt(file.size)/1024/1024).toFixed(1)} MB</div>}
            </div>
            <div style={{ display:'flex', gap:6, padding:'6px 14px 12px' }}>
              <button onClick={e => { e.stopPropagation(); setPreviewFile(file) }} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'5px 10px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.09)', color:'rgba(200,194,187,0.4)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Preview</button>
              <a href={`https://drive.google.com/uc?export=download&id=${file.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'5px 10px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.09)', color:'rgba(200,194,187,0.4)', background:'transparent', cursor:'pointer', fontFamily:'inherit', textDecoration:'none' }}>Download</a>
            </div>
          </div>
        ))}
      </div>
      {/* PREVIEW MODAL */}
      {previewFile && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setPreviewFile(null)}>
          <div style={{ position:'absolute', top:20, right:20, display:'flex', gap:12, alignItems:'center' }}>
            <a href={`https://drive.google.com/uc?export=download&id=${previewFile.id}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, background:'#C8C2BB', color:'#111', textDecoration:'none', fontFamily:'inherit', fontWeight:500 }}>Download</a>
            <button onClick={() => setPreviewFile(null)} style={{ fontSize:24, color:'rgba(200,194,187,0.5)', background:'transparent', border:'none', cursor:'pointer' }}>×</button>
          </div>
          <div style={{ maxWidth:'90vw', maxHeight:'85vh', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }} onClick={e => e.stopPropagation()}>
            {isVideo(previewFile.mimeType) ? (
              <iframe src={`https://drive.google.com/file/d/${previewFile.id}/preview`} style={{ width: previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width) ? 'min(400px,45vw)' : 'min(900px,90vw)', height: previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width) ? 'min(711px,80vh)' : 'min(506px,50vh)', border:'none', borderRadius:6 }} allow="autoplay" />
            ) : isImage(previewFile.mimeType) ? (
              <img src={`https://drive.google.com/uc?id=${previewFile.id}`} alt={previewFile.name} style={{ maxWidth:'90vw', maxHeight:'80vh', objectFit:'contain', borderRadius:6 }} />
            ) : (
              <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color:'#C8C2BB', fontSize:14 }}>Open file in Google Drive</a>
            )}
            <div style={{ fontSize:13, color:'rgba(200,194,187,0.6)' }}>{previewFile.name}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ClientPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const handleViewChange = (view: string) => {
    setActiveView(view)
    if (notifications.length > 0) setShowNotifications(true)
  }
  const [bookingStep, setBookingStep] = useState(1)
  const [selectedCat, setSelectedCat] = useState('')
  const [selectedShoot, setSelectedShoot] = useState<any>(null)
  const [selectedDel, setSelectedDel] = useState<any>(null)
  const [selectedSubDel, setSelectedSubDel] = useState<any>(null)
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [preferredDate, setPreferredDate] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressDebounce, setAddressDebounce] = useState<any>(null)
  const [bookingNotes, setBookingNotes] = useState("")
  const [accessNotes, setAccessNotes] = useState("")
  const [clientContactName, setClientContactName] = useState("")
  const [clientEmail2, setClientEmail2] = useState("")
  // Pre-fill email from logged in user
  useEffect(() => { if (user?.email && !clientEmail2) setClientEmail2(user.email) }, [user])
  const [draftDue, setDraftDue] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [propertyLiveDate, setPropertyLiveDate] = useState("")
  const [suggestedStoryline, setSuggestedStoryline] = useState("")
  const [shotList, setShotList] = useState("• \n• \n• \n• \n• ")
  const [prePlanning, setPrePlanning] = useState(false)
  const [deliveryDue, setDeliveryDue] = useState("")



  const [tcAccepted, setTcAccepted] = useState(false)
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [clientBookings, setClientBookings] = useState<any[]>([])
  const [clientBriefs, setClientBriefs] = useState<any[]>([])
  const [selectedBrief, setSelectedBrief] = useState<any>(null)
  const [libraryProject, setLibraryProject] = useState<any>(null)
  const [briefFeedback, setBriefFeedback] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [clientProfile, setClientProfile] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [changeRequest, setChangeRequest] = useState('')
  const [changeRequestSent, setChangeRequestSent] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOther, setCancelOther] = useState('')
  const [cancellationSent, setCancellationSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setLoading(false)
      const email = session.user.email
      // Redirect studio staff to studio portal
      if (email === 'cody@examplecontent.co.nz') {
        router.push('/portal/studio')
        return
      }
      // Load client profile
      const { data: profile } = await supabase.from('clients1').select('*').eq('email', email).single()
      if (profile) setClientProfile(profile)
      // Load projects linked to this client
      const { data: projects } = await supabase.from('projects1').select('*').eq('email', email).eq('archived', false).order('created_at', { ascending: false })
      if (projects) setClientProjects(projects)
      // Load bookings linked to this client
      const { data: bookings } = await supabase.from('bookings1').select('*').eq('client_email', email).order('created_at', { ascending: false })
      if (bookings) setClientBookings(bookings)
      const { data: briefs } = await supabase.from('briefs').select('*').eq('client_email', email).order('created_at', { ascending: false })
      if (briefs) setClientBriefs(briefs)
      const { data: notifs } = await supabase.from('notifications').select('*').eq('user_email', email).eq('read', false).order('created_at', { ascending: false })
      if (notifs) { setNotifications(notifs); if (notifs.length > 0) setShowNotifications(true) }
    })
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function searchAddresses(query: string) {
    if (!query || query.length < 3) { setAddressSuggestions([]); return }
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=NZ&types=address&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=5`)
      const data = await res.json()
      setAddressSuggestions(data.features || [])
      setShowAddressSuggestions(true)
    } catch (e) { setAddressSuggestions([]) }
  }

  function handleAddressChange(val: string) {
    setPropertyAddress(val)
    if (addressDebounce) clearTimeout(addressDebounce)
    setAddressDebounce(setTimeout(() => searchAddresses(val), 350))
  }

  function selectAddress(feature: any) {
    setPropertyAddress(feature.place_name)
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
  }

  function toggleAddon(addon: any) {
    setSelectedAddons(prev =>
      prev.find(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    )
  }

  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const grandTotal = (selectedShoot?.price || 0) + (selectedDel?.price || 0) + addonTotal

  const propertyShootPackages = [
    {
      name: 'Property Ad', price: 650,
      tag: 'Popular for socials',
      description: '20–30s social media highlight reel, optimised for maximum engagement across all platforms.',
      includes: ['20–30s social media highlights', 'Vertical & landscape formats'],
      deliverables: [
        { name: 'Property Ad (20–30s)', price: 0, includes: ['1x social-optimised video', 'Vertical & landscape formats', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Signature', price: 890,
      tag: 'Our base package',
      description: '60–90s cinematic property tour with a handful of agent lifestyle shots to bring the listing to life.',
      includes: ['60–90s property tour', 'Agent lifestyle shots'],
      deliverables: [
        { name: 'Walkthrough Film (60–90s)', price: 0, includes: ['1x walkthrough film', 'Google Drive delivery'] },
        { name: '2x Showcase Reels (20s)', price: 0, includes: ['2x 20s showcase reels', 'Vertical & landscape', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Lifestyle Package', price: 1280,
      tag: 'The lifestyle showcase',
      description: 'Everything in Signature, plus a full hour of lifestyle filming with talent to elevate the property narrative.',
      includes: ['60–90s property tour', '1hr lifestyle shoot with talent', 'Agent lifestyle shots'],
      deliverables: [
        { name: 'Showcase Film (60–90s)', price: 0, includes: ['1x cinematic film', 'Google Drive delivery'] },
        { name: '3x Reels + Carousel', price: 0, includes: ['3x social reels', '1x carousel', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Architectural', price: 2480,
      tag: 'Full production',
      description: 'Our most comprehensive package. Morning, afternoon & twilight shoot with lifestyle elements, talking to camera, and unlimited creative flexibility.',
      includes: ['Morning, afternoon & twilight shoot', 'Lifestyle shoot + talking to camera', 'Unlimited creative elements', '2 days editing', '1x Market-leading property tour (1–2 min)', '1x Social media reel (15–30s)'],
      deliverables: [
        { name: 'Full Architectural Package', price: 0, includes: ['1x Property tour (1–2 min)', '1x Social reel (15–30s)', 'Google Drive delivery'] },
      ]
    },
  ]

    const commercialShootPackages = [
    { name: 'Social Spark', price: 890, includes: ['Multi-format capture', 'Colour graded & edited', 'Google Drive delivery'] },
    { name: 'Brand Story', price: 1490, includes: ['Director-led production', 'Script & creative development', 'Colour graded & edited', 'Google Drive delivery'] },
    { name: 'Event Capture', price: 1190, includes: ['Full event coverage', 'Video + photo', 'Colour graded & edited', 'Google Drive delivery'] },
  ]

    const propertyDeliverables: any[] = []
  const commercialDeliverables = [
    { name: 'Hero Film + Social Cut', price: 290, includes: ['1x hero film (2-3 min)', '1x 60 sec social cut', 'Google Drive delivery'] },
    { name: 'Social Reels Pack (4x)', price: 390, includes: ['4x social reels', 'Multi-format', 'Google Drive delivery'] },
    { name: 'Single Social Reel', price: 140, includes: ['1x social reel', 'Vertical or landscape', 'Google Drive delivery'] },
    { name: 'Stills Pack', price: 240, includes: ['20-30 edited stills', 'High-res + web-res', 'Google Drive delivery'] },
  ]
  const propertyAddons = [
    { name: 'Additional 20s Reel', price: 250, desc: 'One additional 20s showcase reel' },
    { name: 'Additional 40s Reel', price: 400, desc: 'One additional 40s showcase reel' },
    { name: 'Carousel', price: 100, desc: 'Branded property carousel for social media' },
    { name: 'Open Home Story', price: 80, desc: 'Short-form story content for open home promotion' },
    { name: 'Content Library', price: 100, desc: 'Extended content library for ongoing social use' },
    { name: 'Twilight Shoot', price: 350, desc: 'Golden hour & dusk exterior shoot' },
  ]
  const commercialAddons = [
    { name: 'Additional Talent', price: 220, desc: 'Extra on-screen talent sourced by Example Content' },
    { name: 'Rush Delivery (48hr)', price: 180, desc: 'Priority turnaround within 48 hours' },
    { name: 'Voiceover & Sound Design', price: 260, desc: 'Professional voiceover and custom sound design' },
    { name: 'Extra Shoot Hours', price: 290, desc: 'Add additional hours to any package' },
  ]
  const shootPackages = selectedCat === 'property' ? propertyShootPackages : commercialShootPackages
  const deliverables = selectedCat === 'property' ? propertyDeliverables : commercialDeliverables
  const addons = selectedCat === 'property' ? propertyAddons : commercialAddons

  const s = { panel: { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7 } as React.CSSProperties }

  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', display: 'flex' }}>

      {/* SIDEBAR */}
      <aside style={{ width: 220, flexShrink: 0, background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 40, objectFit: 'contain', maxWidth: 150 }} />
          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(61,71,86,0.6)', color: '#C8C2BB', padding: '3px 7px', borderRadius: 2 }}>Client</span>
        </div>
        <div style={{ margin: '14px 14px 8px', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#C8C2BB', flexShrink: 0 }}>{clientProfile?.name ? clientProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{clientProfile?.name || user?.email?.split('@')[0] || 'Client'}</div>
            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{clientProfile?.company || user?.email || ''}</div>
          </div>
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'book', label: 'Book a Shoot' },
            { id: 'upcoming', label: 'Our Shoots' },
            { id: 'library', label: 'My Library' },
            { id: 'pitches', label: 'Our Briefs' },
            { id: 'invoices', label: 'Invoices' },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id); setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress('') }} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '9px 10px', borderRadius: 5, fontSize: 12, color: activeView === item.id ? '#C8C2BB' : 'rgba(200,194,187,0.38)', background: activeView === item.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: activeView === item.id ? '0.5px solid rgba(200,194,187,0.09)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 2, textAlign: 'left', fontFamily: 'inherit' }}>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: 14, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
          <button onClick={handleSignOut} style={{ width: '100%', padding: '9px 10px', borderRadius: 5, fontSize: 12, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (() => {
          const now = new Date()
          const hour = now.getHours()
          const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
          const clientName = clientProfile?.name || user?.email?.split('@')[0] || 'there'
          const confirmedShoots = clientProjects.filter((p: any) => p.shoot_date && new Date(p.shoot_date) >= now)
          const confirmedShootDates = new Set(clientProjects.map((p: any) => p.shoot_date).filter(Boolean))
          const pendingShootBookings = clientBookings.filter((b: any) => b.preferred_date && new Date(b.preferred_date) >= now && b.status === 'pending' && !confirmedShootDates.has(b.preferred_date)).map((b: any) => ({ id: b.id, title: b.address || b.shoot_package || 'Pending booking', shoot_date: b.preferred_date, stage: 'Pending', client: b.client_name, address: b.address, progress: 0, isPending: true, shoot_package: b.shoot_package, deliverables_type: b.deliverables, addons: b.addons, total: b.total }))
          const upcomingShoots = [...confirmedShoots, ...pendingShootBookings].sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime())
          const activeProjects = clientProjects.filter((p: any) => p.stage !== 'Awaiting Confirmation')
          const awaitingSchedule = clientBookings.filter((b: any) => !b.preferred_date && b.status === 'pending')
          const completedProjects = clientProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' || p.drive_url)
          const pendingBookings = clientBookings.filter((b: any) => b.status === 'pending')

          // Calendar
          const startOfWeek = new Date(now)
          const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
          startOfWeek.setDate(now.getDate() - dow)
          const weeks = Array.from({length: 5}, (_: any, wi: number) => Array.from({length: 7}, (_: any, di: number) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + wi * 7 + di); return d }))
          const eventsByDate: Record<string, string[]> = {}
          const addCalEvent = (date: string | null, type: string) => {
            if (!date) return
            if (!eventsByDate[date]) eventsByDate[date] = []
            eventsByDate[date].push(type)
          }
          clientProjects.forEach((p: any) => {
            addCalEvent(p.shoot_date, 'shoot')
            addCalEvent(p.delivery_due, 'delivery')
          })
          clientBookings.filter((b: any) => b.preferred_date).forEach((b: any) => {
            addCalEvent(b.preferred_date, b.status === 'confirmed' ? 'shoot' : 'pending')
          })

          return (
            <div>
              {/* TOPBAR */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{greeting}, {clientName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{now.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}{clientProfile?.company ? ' · ' + clientProfile.company : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setActiveView('book')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Book a shoot</button>
                  <button onClick={() => setActiveView('library')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>View my content</button>
                </div>
              </div>

              <div style={{ padding: 28 }}>
                {/* STAT CARDS */}
                <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Your account</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
                  {[
                    { label: 'Upcoming shoots', value: upcomingShoots.length, sub: upcomingShoots.length > 0 ? 'Next: ' + new Date(upcomingShoots[0].shoot_date + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : 'None scheduled' },
                    { label: 'Active projects', value: activeProjects.length, sub: activeProjects.length > 0 ? activeProjects[0].stage : 'All clear' },
                    { label: 'Pending bookings', value: pendingBookings.length, sub: pendingBookings.length > 0 ? 'Awaiting confirmation' : 'All confirmed', alert: pendingBookings.length > 0 },
                    { label: 'Projects complete', value: completedProjects.length, sub: 'Ready for delivery' },
                  ].map(({ label, value, sub, alert }: any) => (
                    <div key={label} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: alert ? 'rgba(210,175,80,0.9)' : '#fff', letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.28)', marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                  {/* LEFT: UPCOMING SHOOTS + ACTIVE PROJECTS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* UPCOMING SHOOTS */}
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Upcoming shoots</span>
                        <button onClick={() => setActiveView('book')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Book new</button>
                      </div>
                      {awaitingSchedule.length > 0 && awaitingSchedule.map((b: any) => (
                        <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                          <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 5, padding: '5px 3px' }}>
                            <div style={{ fontSize: 16, opacity: 0.5 }}>⏳</div>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Awaiting date confirmation from Example Content</div>
                          </div>
                          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(210,175,80,0.12)', color: 'rgba(210,175,80,0.9)', border: '0.5px solid rgba(210,175,80,0.25)', whiteSpace: 'nowrap' }}>Pending</span>
                        </div>
                      ))}
                      {upcomingShoots.length === 0 && awaitingSchedule.length === 0 ? (
                        <div style={{ padding: '24px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)', textAlign: 'center' }}>No upcoming shoots — book one above</div>
                      ) : upcomingShoots.map((p: any, i: number) => {
                        const d = new Date(p.shoot_date + 'T12:00:00')
                        const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'}, 'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}, 'Pending': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'} }
                        const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: i < upcomingShoots.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                            <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5, padding: '5px 3px' }}>
                              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                              <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.address ? p.address.split(',')[0] : p.client}</div>
                            </div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                          </div>
                        )
                      })}
                    </div>

                    {/* ACTIVE PROJECTS */}
                    {activeProjects.length > 0 && (
                      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Active projects</span>
                        </div>
                        {activeProjects.map((p: any, i: number) => {
                          const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'} }
                          const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < activeProjects.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.delivery_due ? 'Due: ' + new Date(p.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : p.stage}</div>
                              </div>
                              <div style={{ width: 80, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: p.progress + '%', background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{p.stage}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: CALENDAR */}
                  <div>
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{now.toLocaleDateString('en-NZ',{month:'long',year:'numeric'})}</span>
                      </div>
                      <div style={{ padding: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <div key={d} style={{ fontSize: 9, textAlign: 'center', color: 'rgba(200,194,187,0.3)' }}>{d}</div>)}
                        </div>
                        {weeks.map((week: any, wi: number) => (
                          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
                            {week.map((day: any, di: number) => {
                              const key = day.toISOString().split('T')[0]
                              const events = eventsByDate[key] || []
                              const hasEvents = events.length > 0
                              const isToday = day.toDateString() === now.toDateString()
                              const isCurrentMonth = day.getMonth() === now.getMonth()
                              const typeColors: Record<string,string> = { shoot: 'rgba(210,175,80,0.9)', delivery: 'rgba(100,200,130,0.9)', pending: 'rgba(160,100,220,0.9)' }
                              return (
                                <div key={di} style={{ height: 36, borderRadius: 3, background: hasEvents ? 'rgba(200,194,187,0.04)' : 'transparent', border: '0.5px solid ' + (isToday ? 'rgba(200,194,187,0.5)' : hasEvents ? 'rgba(200,194,187,0.12)' : 'rgba(200,194,187,0.05)'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px 0' }}>
                                  <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isCurrentMonth ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.2)' }}>{day.getDate()}</div>
                                  {hasEvents && (
                                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                      {events.slice(0,3).map((type: string, ei: number) => (
                                        <div key={ei} style={{ width: 4, height: 4, borderRadius: '50%', background: typeColors[type] || '#C8C2BB' }} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PENDING BOOKINGS */}
                    {pendingBookings.length > 0 && (
                      <div style={{ marginTop: 14, background: 'rgba(210,175,80,0.06)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 7, padding: '14px 18px' }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(210,175,80,0.9)', marginBottom: 6 }}>{pendingBookings.length} pending booking{pendingBookings.length !== 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Awaiting confirmation from Example Content</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT DELIVERABLES */}
                {completedProjects.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Recent deliverables</div>
                    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                      {completedProjects.map((p: any) => (
                        <DriveThumb key={p.id} project={p} onClick={() => { setLibraryProject(p); setActiveView('library') }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ===== BOOK A SHOOT ===== */}
        {activeView === 'book' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Book a Shoot</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Select your category, packages and preferred date</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: bookingStep === 1 ? 0 : 28 }}>

              {/* STEP INDICATOR */}
              {bookingStep > 1 && <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, padding: '0 28px' }}>
                {['Category','Packages','Deliverables','Add-ons','Details','Confirm'].map((step, i) => (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < 5 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${bookingStep > i + 1 ? 'rgba(100,200,130,0.5)' : bookingStep === i + 1 ? '#C8C2BB' : 'rgba(200,194,187,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: bookingStep > i + 1 ? 'rgba(100,200,130,0.8)' : bookingStep === i + 1 ? '#C8C2BB' : 'rgba(200,194,187,0.3)', background: bookingStep > i + 1 ? 'rgba(30,70,45,0.5)' : bookingStep === i + 1 ? 'rgba(200,194,187,0.08)' : 'transparent', flexShrink: 0 }}>{bookingStep > i + 1 ? '✓' : i + 1}</div>
                      <span style={{ fontSize: 11, color: bookingStep === i + 1 ? '#C8C2BB' : bookingStep > i + 1 ? 'rgba(100,200,130,0.7)' : 'rgba(200,194,187,0.3)', whiteSpace: 'nowrap' }}>{step}</span>
                    </div>
                    {i < 5 && <div style={{ flex: 1, height: 0.5, background: 'rgba(200,194,187,0.09)', margin: '0 10px' }} />}
                  </div>
                ))}
              </div>}

              {/* STEP 1: CATEGORY */}
              {bookingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 115px)' }}>
                  {/* SPLIT PANELS */}
                  <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 115px)' }}>
                    {[
                      {
                        id: 'property',
                        title: 'Property &\nArchitecture',
                        desc: 'Luxury, High End, Bold & Characteristic Residential, Lifestyle and Architectural Video.',
                        video: '/videos/property.mp4',
                        gradient: 'linear-gradient(160deg, #1a2535 0%, #0a0e14 100%)',
                      },
                      {
                        id: 'commercial',
                        title: 'Commercial\n& Events',
                        desc: 'Photo & Video Branding, Event Coverage, Commercial/Corporate Work, Other..',
                        video: '/videos/commercial.mp4',
                        gradient: 'linear-gradient(160deg, #1a1a1a 0%, #0a0a0a 100%)',
                      },
                    ].map((cat, i) => (
                      <div
                        key={cat.id}
                        onClick={() => { setSelectedCat(cat.id); setBookingStep(2) }}
                        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'pointer', borderRight: i === 0 ? '0.5px solid rgba(200,194,187,0.12)' : 'none', background: cat.gradient }}
                        onMouseEnter={e => { const ov = e.currentTarget.querySelector('.overlay') as HTMLElement; if(ov) ov.style.background = 'rgba(0,0,0,0.2)' }}
                        onMouseLeave={e => { const ov = e.currentTarget.querySelector('.overlay') as HTMLElement; if(ov) ov.style.background = 'rgba(0,0,0,0.55)' }}
                      >
                        {/* VIDEO BG */}
                        <video
                          src={cat.video}
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* GRADIENT OVERLAY */}
                        <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', transition: 'background 0.4s ease' }} />
                        {/* GRADIENT BOTTOM FADE */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)' }} />

                        {/* CONTENT */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '48px' }}>
                          <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.5)', marginBottom: 16 }}>0{i + 1}</div>
                          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, color: '#fff', lineHeight: 1.05, letterSpacing: '-0.02em', whiteSpace: 'pre-line', margin: '0 0 20px 0' }}>{cat.title}</h2>
                          <p style={{ fontSize: 13, color: 'rgba(200,194,187,0.65)', lineHeight: 1.7, maxWidth: 340, marginBottom: 36 }}>{cat.desc}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8C2BB', fontWeight: 500 }}>Select & continue</span>
                            <div style={{ width: 32, height: 1, background: '#C8C2BB' }} />
                            <span style={{ fontSize: 14, color: '#C8C2BB' }}>→</span>
                          </div>
                        </div>

                        {/* SELECTED INDICATOR */}
                        {selectedCat === cat.id && (
                          <div style={{ position: 'absolute', top: 24, right: 24, width: 28, height: 28, borderRadius: '50%', background: '#C8C2BB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#111', fontWeight: 700 }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {bookingStep === 2 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Select package</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:22 }}>
                    {shootPackages.map((pkg: any) => (
                      <div key={pkg.name} onClick={() => { setSelectedShoot(pkg); setSelectedSubDel(null); setSelectedDel(null) }} style={{ border:`0.5px solid ${selectedShoot?.name === pkg.name ? 'rgba(200,194,187,0.35)' : 'rgba(200,194,187,0.08)'}`, borderRadius:12, padding:'22px 24px', cursor:'pointer', background: selectedShoot?.name === pkg.name ? 'linear-gradient(135deg, rgba(35,42,56,0.95) 0%, rgba(22,27,38,0.98) 100%)' : 'linear-gradient(135deg, rgba(26,31,40,0.9) 0%, rgba(18,22,30,0.95) 100%)', position:'relative', transition:'all 0.2s', boxShadow: selectedShoot?.name === pkg.name ? '0 0 30px rgba(200,194,187,0.04) inset' : 'none', overflow:'hidden' }}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background: selectedShoot?.name === pkg.name ? 'linear-gradient(90deg, transparent, rgba(200,194,187,0.25), transparent)' : 'linear-gradient(90deg, transparent, rgba(200,194,187,0.06), transparent)' }} />
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                          <div>
                            {pkg.tag && <div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(100,200,130,0.6)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:4, height:4, borderRadius:'50%', background:'rgba(100,200,130,0.6)', display:'inline-block' }} />{pkg.tag}</div>}
                            <div style={{ fontSize:16, fontWeight:600, color:'#fff', letterSpacing:'-0.01em' }}>{pkg.name}</div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0, marginLeft:16 }}>
                            <div style={{ fontSize:24, fontWeight:700, color:'#fff', letterSpacing:'-0.03em', lineHeight:1 }}>${pkg.price.toLocaleString()}</div>
                            <div style={{ fontSize:9, color:'rgba(200,194,187,0.3)', letterSpacing:'0.08em', marginTop:2 }}>+ GST</div>
                          </div>
                        </div>
                        {pkg.description && <div style={{ fontSize:12, color:'rgba(200,194,187,0.45)', lineHeight:1.7, marginBottom:16, paddingBottom:16, borderBottom:'0.5px solid rgba(200,194,187,0.07)' }}>{pkg.description}</div>}
                        {pkg.includes && pkg.includes.length > 0 && (
                          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                            {pkg.includes.map((item: string) => (
                              <div key={item} style={{ display:'flex', gap:10, fontSize:11, color:'rgba(200,194,187,0.5)', alignItems:'flex-start' }}>
                                <span style={{ color:'rgba(100,200,130,0.55)', flexShrink:0, marginTop:1 }}>✓</span>{item}
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedShoot?.name === pkg.name && <div style={{ position:'absolute', top:16, right:16, width:22, height:22, borderRadius:'50%', background:'#C8C2BB', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 12px rgba(200,194,187,0.3)' }}><span style={{ fontSize:11, color:'#111', fontWeight:700 }}>✓</span></div>}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(1)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => selectedShoot && setBookingStep(3)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: selectedShoot ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedShoot ? '#111' : 'rgba(200,194,187,0.2)', border:'none', cursor: selectedShoot ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Continue →</button>
                  </div>
                </div>
              )}

              {/* STEP 3: DELIVERABLES */}
              {bookingStep === 3 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Choose your deliverable</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:22 }}>
                    {(selectedShoot?.deliverables || deliverables).map((del: any) => (
                      <div key={del.name} onClick={() => { setSelectedDel(del); setSelectedSubDel(del) }} style={{ border:`0.5px solid ${selectedDel?.name === del.name ? 'rgba(200,194,187,0.35)' : 'rgba(200,194,187,0.08)'}`, borderRadius:12, padding:'22px 24px', cursor:'pointer', background: selectedDel?.name === del.name ? 'linear-gradient(135deg,rgba(35,42,56,0.95),rgba(22,27,38,0.98))' : 'linear-gradient(135deg,rgba(26,31,40,0.9),rgba(18,22,30,0.95))', position:'relative', overflow:'hidden', transition:'all 0.2s', boxShadow: selectedDel?.name === del.name ? '0 0 30px rgba(200,194,187,0.04) inset' : 'none' }}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background: selectedDel?.name === del.name ? 'linear-gradient(90deg,transparent,rgba(200,194,187,0.25),transparent)' : 'linear-gradient(90deg,transparent,rgba(200,194,187,0.06),transparent)' }} />
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: del.includes?.length > 0 ? 12 : 0 }}>
                          <div style={{ fontSize:14, fontWeight:600, color:'#fff' }}>{del.name}</div>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            {del.price > 0 && <div style={{ fontSize:13, color:'rgba(200,194,187,0.5)' }}>+${del.price} GST</div>}
                            {selectedDel?.name === del.name && <div style={{ width:22, height:22, borderRadius:'50%', background:'#C8C2BB', display:'flex', alignItems:'center', justifyContent:'center' }}><span style={{ fontSize:11, color:'#111', fontWeight:700 }}>✓</span></div>}
                          </div>
                        </div>
                        {del.includes && del.includes.length > 0 && (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {del.includes.filter((i: string) => !i.includes('Google Drive')).map((item: string) => (
                              <span key={item} style={{ fontSize:10, color:'rgba(200,194,187,0.4)', background:'rgba(200,194,187,0.05)', padding:'3px 10px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.08)' }}>{item}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <button onClick={() => setBookingStep(2)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
                    <button onClick={() => selectedDel && setBookingStep(4)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, background: selectedDel ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedDel ? '#111' : 'rgba(200,194,187,0.2)', border:'none', cursor: selectedDel ? 'pointer' : 'not-allowed', fontWeight:500, fontFamily:'inherit' }}>Continue →</button>
                  </div>
                </div>
              )}
    {bookingStep === 4 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 6 }}>Add-ons <span style={{ color: 'rgba(200,194,187,0.2)', fontSize: 10, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>Optional — select any that apply</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                    {addons.map(addon => {
                      const selected = selectedAddons.find(a => a.name === addon.name)
                      return (
                        <div key={addon.name} onClick={() => toggleAddon(addon)} style={{ border: `0.5px solid ${selected ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '13px 15px', cursor: 'pointer', background: selected ? 'rgba(200,194,187,0.05)' : '#1A1F28', display: 'flex', gap: 10 }}>
                          <div style={{ width: 17, height: 17, borderRadius: 3, border: `1px solid ${selected ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: selected ? 'rgba(200,194,187,0.15)' : 'transparent', marginTop: 1 }}>{selected && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{addon.name}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 4 }}>+${addon.price} + GST</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', lineHeight: 1.4 }}>{addon.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>Current total (excl. GST)</span>
                    <span style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(2)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => setBookingStep(5)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Continue to details →</button>
                  </div>
                </div>
              )}

              {/* STEP 4: DETAILS */}
              {bookingStep === 5 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Your details</div>

                  {/* Contact info — always shown first */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>{selectedCat === 'property' ? 'Listing agent name' : 'Your name'}</label>
                      <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Jessica Moore" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Your email</label>
                      <input type="email" value={clientEmail2} onChange={e => setClientEmail2(e.target.value)} placeholder="your@email.com" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Property specific */}
                  {selectedCat === 'property' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property address</label>
                        <div style={{ position: 'relative' }}>
                          <input value={propertyAddress} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)} placeholder="Start typing an address..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                          {showAddressSuggestions && addressSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                              {addressSuggestions.map((s: any, i: number) => (
                                <div key={i} onClick={() => selectAddress(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < addressSuggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  {s.place_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property type</label>
                        <select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>Select type...</option><option>Standard Residential</option><option>High End Residential</option><option>Lifestyle Property</option><option>Townhouse</option><option>Section</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Access / key notes</label>
                        <input value={accessNotes} onChange={e => setAccessNotes(e.target.value)} placeholder="e.g. Key in lockbox, call owner on arrival" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                    </div>
                  )}

                  {/* Commercial specific */}
                  {selectedCat === 'commercial' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Business / brand name</label>
                        <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Black Barn Retreats" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Industry</label>
                        <select style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option>Hospitality & tourism</option><option>Retail & product</option><option>Corporate</option><option>Not-for-profit</option><option>Health & wellness</option><option>Other</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Shoot location</label>
                        <div style={{ position: 'relative' }}>
                          <input value={propertyAddress} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)} placeholder="Start typing an address..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                          {showAddressSuggestions && addressSuggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                              {addressSuggestions.map((s: any, i: number) => (
                                <div key={i} onClick={() => selectAddress(s)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < addressSuggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                  {s.place_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dates — always shown */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Preferred shoot date</label>
                      <div style={{ display:'flex', gap:10 }}>
                        <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', flex:1 }} />
                        <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>Preferred time</option>
                          {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','16:00','17:00','17:30','18:00'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Property going live</label>
                      <input type="date" value={propertyLiveDate} onChange={e => setPropertyLiveDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Final delivery needed by</label>
                      <input type="date" value={deliveryDue} onChange={e => setDeliveryDue(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Brief & special requirements</label>
                    <textarea rows={3} value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Style references, key features, specific requirements, timeline notes..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.65 }} />
                    <div style={{ marginTop:16 }}>
                      <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', display:'block', marginBottom:6 }}>Suggested storyline</label>
                      <textarea rows={3} value={suggestedStoryline} onChange={e => setSuggestedStoryline(e.target.value)} placeholder='e.g. A warm family home nestled in a quiet cul-de-sac...' style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.65, width:'100%' }} />
                    </div>
                    <div style={{ marginTop:16 }}>
                      <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', display:'block', marginBottom:6 }}>Suggested shot list</label>
                      <textarea rows={6} value={shotList} onChange={e => setShotList(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.75, width:'100%' }} />
                    </div>
                    <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setPrePlanning(p => !p)}>
                      <div style={{ width:18, height:18, borderRadius:4, border:`1px solid ${prePlanning ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, background: prePlanning ? 'rgba(200,194,187,0.15)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{prePlanning && <span style={{ fontSize:11, color:'#C8C2BB' }}>✓</span>}</div>
                      <span style={{ fontSize:12, color:'rgba(200,194,187,0.55)' }}>Does this project involve pre-planning?</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(4)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => setBookingStep(6)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Review & confirm →</button>
                  </div>
                </div>
              )}

              {/* STEP 5: CONFIRM */}
              {bookingStep === 6 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>Review your booking</div>
                  <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 8, padding: '18px 22px', marginBottom: 18 }}>
                    {[
                      { key: 'Category', val: selectedCat === 'property' ? 'Property & Architecture' : 'Commercial & Events' },
                      { key: 'Shoot package', val: `${selectedShoot?.name} — $${selectedShoot?.price?.toLocaleString()} + GST` },
                      { key: 'Deliverable package', val: `${selectedDel?.name} — $${selectedDel?.price} + GST` },
                      { key: 'Add-ons', val: selectedAddons.length ? selectedAddons.map(a => `${a.name} (+$${a.price})`).join(', ') : 'None' },
                      { key: 'Preferred date', val: 'TBC — confirmed within 24 hrs' },
                    ].map(({ key, val }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{key}</span>
                        <span style={{ fontSize: 13, color: '#C8C2BB', fontWeight: 500, textAlign: 'right', maxWidth: 360 }}>{val}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, marginTop: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>Total estimate</span>
                      <span style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()} + GST</span>
                    </div>
                  </div>
                  <div style={{ border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '13px 16px', marginBottom: 16, maxHeight: 96, overflowY: 'auto', fontSize: 11, color: 'rgba(200,194,187,0.35)', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)' }}>
                    <strong style={{ color: 'rgba(200,194,187,0.5)' }}>Terms & Conditions — Example Content Ltd</strong><br /><br />
                    <ol style={{ margin: 0, padding: '0 0 0 16px' }}>
                      <li style={{ marginBottom: 8 }}>A booking request does not constitute a confirmed engagement until Example Content Ltd has confirmed availability and acceptance in writing.</li>
                      <li style={{ marginBottom: 8 }}>Postponement of a scheduled shoot within 24 hours of the confirmed shoot date, for reasons other than adverse weather conditions, will incur a postponement fee of 25% of the total shoot cost.</li>
                      <li style={{ marginBottom: 8 }}>Three or more postponements for reasons other than adverse weather conditions will incur a fee of 25% of the total shoot cost per occurrence.</li>
                      <li style={{ marginBottom: 8 }}>Cancellation of a confirmed booking within 24 hours of the scheduled shoot date will incur a cancellation fee of 25% of the total shoot cost.</li>
                      <li style={{ marginBottom: 8 }}>Example Content Ltd retains full intellectual property rights over all footage, photography, and associated media produced during the engagement, and reserves the right to use such material for portfolio, marketing, and promotional purposes without limitation.</li>
                      <li style={{ marginBottom: 8 }}>All quoted prices are exclusive of GST, which will be applied at the prevailing rate.</li>
                      <li>Final deliverables will be stored securely in Google Drive for a period of 12 months from the date of delivery, after which all files will be permanently deleted. Clients are advised to download and retain their own copies.</li>
                    </ol></div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }} onClick={() => setTcAccepted(!tcAccepted)}>
                    <div style={{ width: 15, height: 15, borderRadius: 2, border: `1px solid ${tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, background: tcAccepted ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{tcAccepted && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                    <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.6 }}>I have read and agree to the Terms & Conditions. I confirm the above package selection and authorise Example Content Ltd to proceed with my booking request.</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(5)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={async () => {
                      if (!tcAccepted) return
                      try {
                        await supabase.from('bookings1').insert([{
                          client_id: user?.id,
                          client_name: clientContactName || user?.email,
                          category: selectedCat,
                          shoot_package: selectedShoot?.name || '',
                          deliverables: selectedDel?.name || '',
                          addons: selectedAddons.map((a: any) => a.name).join(', '),
                          preferred_date: preferredDate,
                          preferred_time: preferredTime || null,
                          client_email: clientEmail2 || user?.email,
                          draft_due: draftDue || null,
                          delivery_due: deliveryDue || null,
                          property_live_date: propertyLiveDate || null,
                          address: propertyAddress,
                          notes: [
                            bookingNotes ? 'Notes: ' + bookingNotes : '',
                            accessNotes ? 'Access: ' + accessNotes : '',
                            suggestedStoryline ? 'Storyline: ' + suggestedStoryline : '',
                            shotList ? 'Shot list:\n' + shotList : '',
                            prePlanning ? 'Pre-planning required' : '',
                          ].filter(Boolean).join('\n\n'),
                          total: `$${((selectedShoot?.price || 0) + (selectedDel?.price || 0) + selectedAddons.reduce((s: number, a: any) => s + a.price, 0)).toLocaleString()} + GST`,
                          tc_accepted: true,
                          status: 'pending',
                        }])
                      } catch (e) { console.error('Booking save error:', e) }
                      try {
                        await supabase.from('clients1').upsert([{
                          email: clientEmail2 || user?.email,
                          name: clientContactName || '',
                          category: selectedCat === 'property' ? 'Property' : 'Commercial',
                          total_bookings: 1,
                        }], { onConflict: 'email', ignoreDuplicates: false })
                      } catch (e) { console.error('Client upsert error:', e) }
                      setBookingStep(7)
                    }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: tcAccepted ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: tcAccepted ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Submit booking request →</button>
                  </div>
                </div>
              )}

              {/* STEP 6: SUCCESS */}
              {bookingStep === 7 && (
                <div style={{ textAlign: 'center', padding: '60px 32px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1px solid rgba(100,200,130,0.4)', background: 'rgba(100,200,130,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28 }}>✓</div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: '#fff', marginBottom: 10 }}>Booking request submitted</div>
                  <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 32px' }}>We've received your request and will confirm availability within 24 hours. You'll hear from the Example Content team shortly.</div>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Back to dashboard</button>
                    <button onClick={() => { setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress('') }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Book another shoot</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== OUR SHOOTS ===== */}
        {activeView === 'upcoming' && (() => {
          const now = new Date()
          const upcomingProjects = clientProjects.filter((p: any) => p.shoot_date && new Date(p.shoot_date) >= now).sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime())
          const deliveredProjects = clientProjects.filter((p: any) => p.stage === 'Awaiting Confirmation').sort((a: any, b: any) => new Date(b.delivery_due || b.created_at).getTime() - new Date(a.delivery_due || a.created_at).getTime())
          const pendingBookings = clientBookings.filter((b: any) => b.status === 'pending')
          return (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px', borderBottom:'0.5px solid rgba(200,194,187,0.09)', background:'#14181F', position:'sticky', top:0, zIndex:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>Our Shoots</div>
                  <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)', marginTop:2 }}>{upcomingProjects.length} upcoming · {deliveredProjects.length} delivered</div>
                </div>
                <button onClick={() => setActiveView('book')} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background:'#C8C2BB', color:'#111', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>+ Book new</button>
              </div>
              <div style={{ padding:28, display:'flex', flexDirection:'column', gap:24 }}>
                {/* PENDING BOOKINGS */}
                {pendingBookings.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)', marginBottom:12 }}>Pending confirmation</div>
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden' }}>
                      {pendingBookings.map((b: any, i: number) => (
                        <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < pendingBookings.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none' }}>
                          <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(210,175,80,0.08)', border:'0.5px solid rgba(210,175,80,0.2)', borderRadius:5, padding:'6px 4px' }}>
                            <div style={{ fontSize:16, opacity:0.5 }}>⏳</div>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                            <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{b.shoot_package} {b.preferred_date ? '· ' + new Date(b.preferred_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                          </div>
                          <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(210,175,80,0.12)', color:'rgba(210,175,80,0.9)', border:'0.5px solid rgba(210,175,80,0.25)' }}>Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* UPCOMING SHOOTS */}
                <div>
                  <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)', marginBottom:12 }}>Upcoming shoots</div>
                  {upcomingProjects.length === 0 ? (
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, padding:'32px 20px', textAlign:'center', color:'rgba(200,194,187,0.25)', fontSize:12 }}>No upcoming shoots — book one above</div>
                  ) : (
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden' }}>
                      {upcomingProjects.map((p: any, i: number) => {
                        const d = new Date(p.shoot_date+'T12:00:00')
                        return (
                          <div key={p.id} onClick={() => setSelectedProject(p)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < upcomingProjects.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none', cursor:'pointer' }}>
                            <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(61,71,86,0.3)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:5, padding:'6px 4px' }}>
                              <div style={{ fontSize:16, fontWeight:600, color:'#fff', lineHeight:1 }}>{d.getDate()}</div>
                              <div style={{ fontSize:9, color:'rgba(200,194,187,0.4)', textTransform:'uppercase' }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{p.title}</div>
                              <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{p.address?.split(',')[0]} {p.delivery_due ? '· Due: '+new Date(p.delivery_due+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : ''}</div>
                            </div>
                            <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,150,220,0.12)', color:'rgba(100,150,220,0.9)', border:'0.5px solid rgba(100,150,220,0.2)' }}>{p.stage}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {/* DELIVERED */}
                {deliveredProjects.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)', marginBottom:12 }}>Delivered</div>
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden' }}>
                      {deliveredProjects.map((p: any, i: number) => (
                        <div key={p.id} onClick={() => setSelectedProject(p)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < deliveredProjects.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none', cursor:'pointer' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{p.title}</div>
                            <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{p.address?.split(',')[0]}</div>
                          </div>
                          {p.drive_url && <a href={p.drive_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'6px 12px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit', textDecoration:'none' }}>View files</a>}
                          <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,200,130,0.12)', color:'rgba(100,200,130,0.9)', border:'0.5px solid rgba(100,200,130,0.2)' }}>Delivered</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ===== LIBRARY ===== */}
        {activeView === 'library' && (() => {
          const projectsWithDrive = clientProjects.filter((p: any) => p.drive_url)
          return (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px', borderBottom:'0.5px solid rgba(200,194,187,0.09)', background:'#14181F', position:'sticky', top:0, zIndex:10 }}>
                <div>
                  {libraryProject ? (
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <button onClick={() => setLibraryProject(null)} style={{ fontSize:11, color:'rgba(200,194,187,0.4)', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>← All projects</button>
                      <span style={{ color:'rgba(200,194,187,0.2)' }}>/</span>
                      <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>{libraryProject.title}</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>My Content Library</div>
                      <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)', marginTop:2 }}>{projectsWithDrive.length} project{projectsWithDrive.length!==1?'s':''} with deliverables</div>
                    </div>
                  )}
                </div>
                <button onClick={() => { setLibraryProject(null); setActiveView('dashboard') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>← Back</button>
              </div>
              <div style={{ padding:28 }}>
                {!libraryProject ? (
                  /* PROJECT LIST */
                  projectsWithDrive.length === 0 ? (
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, padding:'40px 20px', textAlign:'center', color:'rgba(200,194,187,0.25)', fontSize:13 }}>No delivered content yet</div>
                  ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
                      {projectsWithDrive.map((p: any) => (
                        <div key={p.id} onClick={() => setLibraryProject(p)} style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, padding:'20px 22px', cursor:'pointer', display:'flex', alignItems:'center', gap:16 }} onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(200,194,187,0.2)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(200,194,187,0.09)')}>
                          <div style={{ width:48, height:48, borderRadius:8, background:'rgba(200,194,187,0.06)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📁</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:4 }}>{p.title}</div>
                            <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{p.shoot_date ? new Date(p.shoot_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}{p.address ? ' · '+p.address.split(',')[0] : ''}</div>
                          </div>
                          <div style={{ fontSize:12, color:'rgba(200,194,187,0.3)' }}>→</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* FILE VIEW */
                  <DriveFolder project={libraryProject} />
                )}
              </div>
            </div>
          )
        })()}

        {activeView === 'pitches' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Our Briefs</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>Review and approve proposals from Example Content</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
            </div>
            <div style={{ padding: 28 }}>
              {clientBriefs.length === 0 ? (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '40px 28px', textAlign: 'center', color: 'rgba(200,194,187,0.3)', fontSize: 13 }}>No briefs received yet</div>
              ) : (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  {clientBriefs.map((brief: any, i: number) => {
                    const statusColors: Record<string,{c:string,b:string}> = { draft:{c:'rgba(200,194,187,0.5)',b:'rgba(200,194,187,0.1)'}, sent:{c:'rgba(100,150,220,0.9)',b:'rgba(25,45,80,0.4)'}, approved:{c:'rgba(100,200,130,0.9)',b:'rgba(30,70,45,0.4)'} }
                    const sc = statusColors[brief.status] || statusColors.sent
                    return (
                      <div key={brief.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'16px 20px', borderBottom: i < clientBriefs.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none' }}>
                        <div style={{ width:36, height:36, borderRadius:5, background:'rgba(61,71,86,0.4)', border:'0.5px solid rgba(200,194,187,0.09)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 }}>▤</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{brief.project_name || 'Untitled brief'}</div>
                          <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Received {new Date(brief.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}</div>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                          <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:sc.b, color:sc.c }}>{brief.status}</span>
                          <button onClick={() => setSelectedBrief(brief)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Open</button>
                          {brief.status === 'sent' && (
                            <button onClick={async () => { await supabase.from('briefs').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', brief.id); setClientBriefs(p => p.map(b => b.id===brief.id ? {...b, status:'approved'} : b)) }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background:'#C8C2BB', color:'#111', border:'none', cursor:'pointer', fontWeight:500, fontFamily:'inherit' }}>Approve</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            {/* BRIEF VIEWER MODAL */}
            {selectedBrief && (
              <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.9)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px', overflowY:'auto' }}>
                <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.15)', borderRadius:10, width:'100%', maxWidth:800, marginBottom:20 }}>
                  {/* HEADER */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'0.5px solid rgba(200,194,187,0.09)', position:'sticky', top:0, background:'#1A1F28', zIndex:10, borderRadius:'10px 10px 0 0' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>{selectedBrief.project_name}</div>
                      <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)', marginTop:2 }}>Production Brief · {selectedBrief.client_name}</div>
                    </div>
                    <button onClick={() => { setSelectedBrief(null); setBriefFeedback(''); setFeedbackSent(false) }} style={{ fontSize:20, color:'rgba(200,194,187,0.4)', background:'transparent', border:'none', cursor:'pointer' }}>×</button>
                  </div>
                  {(() => {
                    const d = selectedBrief.data || {}
                    return (
                      <div>
                        {/* COVER SECTION */}
                        <div style={{ padding:'48px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)', textAlign:'center', background:'rgba(0,0,0,0.2)' }}>
                          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height:44, objectFit:'contain', marginBottom:24, opacity:0.9 }} />
                          <div style={{ fontSize:11, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', marginBottom:8 }}>Production Brief — Prepared for</div>
                          <div style={{ fontSize:32, fontWeight:700, color:'#fff', marginBottom:6 }}>{(selectedBrief.client_name||'').toUpperCase()}</div>
                          <div style={{ fontSize:16, color:'rgba(200,194,187,0.5)', marginBottom:32 }}>{selectedBrief.project_name}</div>
                          <div style={{ display:'flex', gap:32, justifyContent:'center', flexWrap:'wrap' }}>
                            {d.shootDates && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Shoot Date</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.shootDates}</div></div>}
                            {d.shootStartTime && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Time</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.shootStartTime}{d.shootEndTime?' – '+d.shootEndTime:''}</div></div>}
                            {d.draftDue && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Draft Due</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.draftDue}</div></div>}
                            {d.finalsDue && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Finals Due</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.finalsDue}</div></div>}
                            {d.locations && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Location</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.locations.split(',')[0]}</div></div>}
                          </div>
                        </div>
                        {/* SCOPE SECTION */}
                        <div style={{ padding:'32px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
                          <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>The Scope</div>
                          <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>{(d.jobType||'').toUpperCase()}</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, marginBottom:24 }}>
                            <div>
                              <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', marginBottom:10, fontWeight:700 }}>Overview</div>
                              <div style={{ fontSize:14, color:'rgba(200,194,187,0.7)', lineHeight:1.75 }}>{d.jobDescription}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', marginBottom:10, fontWeight:700 }}>Deliverables</div>
                              {(d.deliverables||[]).map((del: any, i: number) => (
                                <div key={i} style={{ borderBottom:'0.5px solid rgba(200,194,187,0.07)', paddingBottom:10, marginBottom:10 }}>
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                    <span style={{ fontSize:13, color:'#C8C2BB', fontWeight:500 }}>{del.quantity}x {del.name}</span>
                                    {del.duration && <span style={{ fontSize:11, color:'rgba(200,194,187,0.5)', background:'rgba(200,194,187,0.07)', padding:'2px 8px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.12)' }}>{del.duration}</span>}
                                  </div>
                                  {del.formats && del.formats.length > 0 && <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{del.formats.map((f:string,fi:number) => <span key={fi} style={{ fontSize:10, color:'rgba(200,194,187,0.35)', background:'rgba(200,194,187,0.04)', padding:'2px 6px', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:2 }}>{f}</span>)}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* INVESTMENT SECTION */}
                        {d.total > 0 && (
                          <div style={{ padding:'32px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
                            <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>Investment</div>
                            <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>PRICING</div>
                            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                              {d.shootFee > 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize:14, color:'rgba(200,194,187,0.55)' }}>Filming — {d.shootHours}hrs</span><span style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>${(d.shootFee||0).toLocaleString()}</span></div>}
                              {d.editFee > 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize:14, color:'rgba(200,194,187,0.55)' }}>Editing — {d.editHours}hrs</span><span style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>${(d.editFee||0).toLocaleString()}</span></div>}
                              {d.showPreProd && d.calcPreProd > 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize:14, color:'rgba(200,194,187,0.55)' }}>Pre-production — {d.preProdHours}hrs</span><span style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>${(d.calcPreProd||0).toLocaleString()}</span></div>}
                              {d.showTravel && d.calcTravel > 0 && <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'0.5px solid rgba(200,194,187,0.07)' }}><span style={{ fontSize:14, color:'rgba(200,194,187,0.55)' }}>Travel — {d.travelKm}km</span><span style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>${(d.calcTravel||0).toFixed(2)}</span></div>}
                              <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(200,194,187,0.12)' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}><span style={{ fontSize:13, color:'rgba(200,194,187,0.4)' }}>Subtotal</span><span style={{ fontSize:13, color:'#C8C2BB' }}>${(d.subtotal||0).toLocaleString()}</span></div>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}><span style={{ fontSize:13, color:'rgba(200,194,187,0.4)' }}>GST (15%)</span><span style={{ fontSize:13, color:'#C8C2BB' }}>${(d.gst||0).toLocaleString()}</span></div>
                                <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:16, fontWeight:700, color:'#fff' }}>Total inc. GST</span><span style={{ fontSize:20, fontWeight:800, color:'#fff' }}>${(d.total||0).toLocaleString()}</span></div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* TEAM SECTION */}
                        {d.crew && d.crew.length > 0 && (
                          <div style={{ padding:'32px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
                            <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>The Team</div>
                            <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>YOUR CREW</div>
                            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                              {d.crew.map((c: any, i: number) => (
                                <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', background:'rgba(200,194,187,0.03)', border:'0.5px solid rgba(200,194,187,0.08)', borderRadius:6 }}>
                                  {c.photoUrl ? <img src={c.photoUrl} alt={c.name} style={{ width:40, height:40, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} /> : <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(200,194,187,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'rgba(200,194,187,0.4)', flexShrink:0 }}>{c.name?.[0]}</div>}
                                  <div>
                                    <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB' }}>{c.name}</div>
                                    <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{c.role}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* EQUIPMENT SECTION */}
                        {d.equipment && d.equipment.filter((e: any) => e.selected).length > 0 && (
                          <div style={{ padding:'32px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
                            <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>Equipment</div>
                            <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>GEAR LIST</div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                              {d.equipment.filter((e: any) => e.selected).map((e: any, i: number) => (
                                <span key={i} style={{ fontSize:12, color:'rgba(200,194,187,0.6)', background:'rgba(200,194,187,0.05)', padding:'6px 14px', border:'0.5px solid rgba(200,194,187,0.12)', borderRadius:4 }}>{e.name}</span>
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
                            <div key={slide.id} style={{ padding:'32px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
                              <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>Shot List</div>
                              <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>{deliv ? deliv.name.toUpperCase() : 'SHOTS'}</div>
                              <div style={{ display:'flex', flexDirection:'column' }}>
                                <div style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:0, marginBottom:8 }}>
                                  <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', fontWeight:700 }}>Time</div>
                                  <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', fontWeight:700 }}>Shot</div>
                                </div>
                                {sl.shots.map((shot: any, i: number) => (
                                  <div key={i} style={{ display:'grid', gridTemplateColumns:'100px 1fr', gap:0, padding:'12px 0', borderTop:'0.5px solid rgba(200,194,187,0.07)' }}>
                                    <div style={{ fontSize:13, color:'rgba(200,194,187,0.4)' }}>{shot.time || '—'}</div>
                                    <div style={{ fontSize:14, color:'rgba(200,194,187,0.7)', lineHeight:1.6 }}>{shot.description}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                        {/* FEEDBACK / APPROVE SECTION */}
                        <div style={{ padding:'32px 40px' }}>
                          {selectedBrief.status === 'approved' ? (
                            <div style={{ padding:'16px 20px', background:'rgba(100,200,130,0.08)', border:'0.5px solid rgba(100,200,130,0.2)', borderRadius:6, textAlign:'center', fontSize:13, color:'rgba(100,200,130,0.9)' }}>✓ Brief approved — we will be in touch shortly</div>
                          ) : feedbackSent ? (
                            <div style={{ padding:'16px 20px', background:'rgba(100,150,220,0.08)', border:'0.5px solid rgba(100,150,220,0.2)', borderRadius:6, textAlign:'center', fontSize:13, color:'rgba(100,150,220,0.9)' }}>✓ Feedback sent — Example Content will review and update your brief</div>
                          ) : (
                            <div>
                              <div style={{ fontSize:12, fontWeight:500, color:'#C8C2BB', marginBottom:16 }}>Your response</div>
                              <textarea value={briefFeedback} onChange={e => setBriefFeedback(e.target.value)} placeholder="Any changes or feedback? Let us know here..." style={{ width:'100%', background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'12px', fontSize:13, color:'#C8C2BB', fontFamily:'inherit', outline:'none', lineHeight:1.65, resize:'vertical', minHeight:100, marginBottom:16, boxSizing:'border-box' }} />
                              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                                <button onClick={async () => {
                                  if (!briefFeedback.trim()) return
                                  await supabase.from('notifications').insert([{ user_email:'cody@examplecontent.co.nz', type:'brief_feedback', title:'Brief feedback received', message: selectedBrief.client_name + ' sent feedback on ' + selectedBrief.project_name + ': ' + briefFeedback, read:false, project_id: selectedBrief.project_id }])
                                  await supabase.from('briefs').update({ data: { ...(selectedBrief.data||{}), clientFeedback: briefFeedback, feedbackAt: new Date().toISOString() } }).eq('id', selectedBrief.id)
                                  setFeedbackSent(true)
                                }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'10px 18px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Send feedback</button>
                                <button onClick={async () => {
                                  await supabase.from('briefs').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', selectedBrief.id)
                                  await supabase.from('notifications').insert([{ user_email:'cody@examplecontent.co.nz', type:'brief_approved', title:'Brief approved', message: selectedBrief.client_name + ' has approved the brief for ' + selectedBrief.project_name, read:false, project_id: selectedBrief.project_id }])
                                  setClientBriefs(p => p.map(b => b.id===selectedBrief.id ? {...b, status:'approved'} : b))
                                  setSelectedBrief({...selectedBrief, status:'approved'})
                                }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'10px 24px', borderRadius:3, background:'#C8C2BB', color:'#111', border:'none', cursor:'pointer', fontWeight:500, fontFamily:'inherit' }}>Approve brief</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
                {activeView === 'invoices' && (
          <div>
            <div style={{ padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Invoices</div>
            </div>
            <div style={{ padding: 28, textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>🧾</div>
              <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>Coming soon</div>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Invoice and payment history will appear here once connected.</div>
            </div>
          </div>
        )}

      </div>

      {/* PROJECT DETAIL MODAL */}
      {selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setSelectedProject(null); setChangeRequest(''); setChangeRequestSent(false) } }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', position: 'sticky', top: 0, background: '#1A1F28', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selectedProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selectedProject.stage}</div>
              </div>
              <button onClick={() => { setSelectedProject(null); setChangeRequest(''); setChangeRequestSent(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              {/* PROGRESS */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>Progress</span>
                  <span style={{ fontSize: 12, color: '#C8C2BB' }}>{selectedProject.progress || 0}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(200,194,187,0.07)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: (selectedProject.progress || 0) + '%', background: selectedProject.progress === 100 ? 'rgba(100,200,130,0.7)' : '#C8C2BB', opacity: 0.6, borderRadius: 3 }} />
                </div>
              </div>

              {/* DETAILS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { label: 'Shoot date', value: selectedProject.shoot_date ? new Date(selectedProject.shoot_date + 'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : '—' },
                  { label: 'Delivery date', value: selectedProject.delivery_due ? new Date(selectedProject.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'}) : '—' },
                  { label: 'Location', value: selectedProject.address || '—' },
                  { label: 'Category', value: selectedProject.category || '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 5 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#C8C2BB' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* DELIVERABLES */}
              {(selectedProject.deliverables || selectedProject.shoot_package) && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Packages & deliverables</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProject.shoot_package && (
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Package</div>
                        <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.shoot_package}</div>
                      </div>
                    )}
                    {selectedProject.deliverables_type && (
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Deliverables</div>
                        <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.deliverables_type}</div>
                      </div>
                    )}
                    {selectedProject.addons && (
                      <div>
                        <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Add-ons</div>
                        <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.addons}</div>
                      </div>
                    )}
                    {selectedProject.total && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(100,200,130,0.05)', borderRadius: 4, border: '0.5px solid rgba(100,200,130,0.15)' }}>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(100,200,130,0.9)' }}>{selectedProject.total}</span>
                      </div>
                    )}
                    {selectedProject.deliverables && selectedProject.deliverables.split('\n').filter(Boolean).map((d: string, i: number) => {
                      const value = d.replace(/^(PACKAGE|DELIVERABLES|ADD-ONS): /, '')
                      const label = d.startsWith('PACKAGE: ') ? 'Package' : d.startsWith('DELIVERABLES: ') ? 'Deliverables' : d.startsWith('ADD-ONS: ') ? 'Add-ons' : null
                      return label ? (
                        <div key={i}>
                          <div style={{ fontSize: 9, color: 'rgba(200,194,187,0.3)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                          <div style={{ fontSize: 12, color: '#C8C2BB', padding: '7px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{value}</div>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              {/* DRIVE LINK */}
              {selectedProject.drive_url && (
                <div style={{ marginBottom: 20 }}>
                  <a href={selectedProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(100,200,130,0.06)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, textDecoration: 'none' }}>
                    <span style={{ fontSize: 20 }}>📁</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(100,200,130,0.9)' }}>View project files</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Opens Google Drive folder</div>
                    </div>
                  </a>
                </div>
              )}

              {/* CHANGE REQUEST */}
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 20 }}>
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 6 }}>Cancel booking</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 12 }}>Need to cancel? Send us a request and our team will be in touch.</div>
                {cancellationSent ? (
                  <div style={{ padding: '12px 16px', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 6, fontSize: 12, color: 'rgba(210,175,80,0.9)' }}>Cancellation request received — awaiting confirmation from our team</div>
                ) : (
                  <button onClick={() => setShowCancelModal(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.7)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Request cancellation</button>
                )}
              </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 6 }}>Request a change</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 12 }}>Let us know if you'd like to change any dates, packages or deliverables.</div>
                {changeRequestSent ? (
                  <div style={{ padding: '14px 16px', background: 'rgba(100,200,130,0.08)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, fontSize: 12, color: 'rgba(100,200,130,0.9)', textAlign: 'center' }}>✓ Request sent — we'll be in touch shortly</div>
                ) : (
                  <div>
                    <textarea value={changeRequest} onChange={e => setChangeRequest(e.target.value)} placeholder="e.g. Can we move the shoot date to 15th August? Or add a twilight shoot..." style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.65, resize: 'vertical' as const, minHeight: 80 }} />
                    <button onClick={async () => {
                      if (!changeRequest.trim()) return
                      await supabase.from('change_requests').insert([{
                        project_id: selectedProject.id || null,
                        client_email: user?.email,
                        client_name: clientProfile?.name || user?.email,
                        message: changeRequest,
                        status: 'pending',
                        project_title: selectedProject.title || '',
                      }])
                      setChangeRequestSent(true)
                      setChangeRequest('')
                    }} disabled={!changeRequest.trim()} style={{ marginTop: 10, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: changeRequest.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: changeRequest.trim() ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: changeRequest.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Send request</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION POPUP */}
      {showNotifications && notifications.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 12, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>You have updates</div>
              <button onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('user_email', user?.email); setNotifications([]); setShowNotifications(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {notifications.map((n: any, i: number) => (
                <div key={n.id} style={{ padding: '18px 24px', borderBottom: i < notifications.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: n.type === 'booking_confirmed' ? 'rgba(100,200,130,0.15)' : 'rgba(210,175,80,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {n.type === 'booking_confirmed' ? '✓' : '📅'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: n.type === 'booking_confirmed' ? 'rgba(100,200,130,0.9)' : 'rgba(210,175,80,0.9)', marginBottom: 5 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7 }}>{n.message}</div>
                    <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'})}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('user_email', user?.email); setNotifications([]); setShowNotifications(false) }} style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 28px', borderRadius: 4, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL REASON MODAL */}
      {showCancelModal && selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 440, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Reason for cancellation</div>
              <button onClick={() => setShowCancelModal(false)} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 16 }}>Please let us know why you need to cancel so we can assist you better.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {['Weather conditions', 'Property sold or taken off market', 'Date no longer works', 'Other'].map((reason) => (
                  <div key={reason} onClick={() => setCancelReason(reason)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 6, border: `0.5px solid ${cancelReason === reason ? 'rgba(200,194,187,0.3)' : 'rgba(200,194,187,0.09)'}`, background: cancelReason === reason ? 'rgba(200,194,187,0.06)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${cancelReason === reason ? '#C8C2BB' : 'rgba(200,194,187,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {cancelReason === reason && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8C2BB' }} />}
                    </div>
                    <span style={{ fontSize: 13, color: cancelReason === reason ? '#C8C2BB' : 'rgba(200,194,187,0.5)' }}>{reason}</span>
                  </div>
                ))}
              </div>
              {cancelReason === 'Other' && (
                <textarea value={cancelOther} onChange={e => setCancelOther(e.target.value)} placeholder="Please describe your reason..." style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.65, resize: 'vertical' as const, minHeight: 80, marginBottom: 16 }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                <button onClick={() => setShowCancelModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={async () => {
                  if (!cancelReason) return
                  const message = 'CANCELLATION REQUEST\nReason: ' + cancelReason + (cancelReason === 'Other' && cancelOther ? '\nDetails: ' + cancelOther : '')
                  await supabase.from('change_requests').insert([{
                    project_id: selectedProject.id || null,
                    client_email: user?.email,
                    client_name: clientProfile?.name || user?.email,
                    message,
                    status: 'pending',
                    project_title: selectedProject.title || '',
                    type: 'cancellation',
                  }])
                  setShowCancelModal(false)
                  setCancellationSent(true)
                  setCancelReason('')
                  setCancelOther('')
                }} disabled={!cancelReason || (cancelReason === 'Other' && !cancelOther.trim())} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: cancelReason && (cancelReason !== 'Other' || cancelOther.trim()) ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: cancelReason && (cancelReason !== 'Other' || cancelOther.trim()) ? '#111' : 'rgba(200,194,187,0.3)', border: 'none', cursor: cancelReason ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Send cancellation request</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
