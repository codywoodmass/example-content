'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import { supabase, ensureClientProfile } from '@/lib/supabase'
import { formatTime12, localDateKey, addBusinessDays } from '@/lib/time'
import { stageLabel } from '@/lib/stages'
import { useRouter } from 'next/navigation'

const VIDEO_FORMATS = ['1920×1080', '1080×1080', '9×16 Vertical', '4×5', '4K 3840×2160']
const PHOTO_FORMATS = ['High-res JPEG', 'RAW Files', 'Web-res JPEG']
type BriefDeliverable = { id: string; name: string; quantity: number; duration: string; formats: string[]; notes: string }

// Shared line-icon set — plain stroke-based SVGs instead of emoji throughout
// the client portal (nav, empty states, status markers). Kept deliberately
// simple/minimal (single stroke weight, no fills bar the play triangle) to
// match the rest of the portal's restrained visual language.
type IconProps = { size?: number; color?: string; style?: React.CSSProperties }
const ICON_BASE = { fill: 'none' as const, stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function IconDashboard({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.3" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.3" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.3" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.3" />
    </svg>
  )
}
function IconCalendar({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  )
}
function IconClapper({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <path d="M3 9l1.6-3.6a1 1 0 0 1 1.3-.5L9 6M9.5 9l1.1-3.8a1 1 0 0 1 1.2-.7l3.3.9M16 9l1-3.3a1 1 0 0 1 1.3-.6l1.6.7a1 1 0 0 1 .6 1.3L19.5 9" />
      <rect x="3" y="9" width="18" height="11.5" rx="1.5" />
    </svg>
  )
}
function IconFolder({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <path d="M3 7.2A2 2 0 0 1 5 5.2h3.6l1.8 2H19a2 2 0 0 1 2 2v7.6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.2z" />
    </svg>
  )
}
function IconDocument({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <path d="M7 3h6.5L19 8.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M13.5 3v5.5H19" />
      <line x1="8.3" y1="13" x2="15.5" y2="13" />
      <line x1="8.3" y1="16.5" x2="15.5" y2="16.5" />
    </svg>
  )
}
function IconReceipt({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21V3z" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="9" y1="12" x2="15" y2="12" />
    </svg>
  )
}
function IconSignOut({ size = 16, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <path d="M9 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2H9" />
      <polyline points="15.5 16.5 20.5 12 15.5 7.5" />
      <line x1="20.5" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function IconPaperclip({ size = 14, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <path d="M20.5 12.6l-8.5 8.5a4.3 4.3 0 1 1-6-6l8.1-8.1a2.8 2.8 0 1 1 4 4l-7.3 7.3a1.2 1.2 0 0 1-1.7-1.7l6.5-6.5" />
    </svg>
  )
}
function IconClock({ size = 16, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7.5 12 12 15.5 14" />
    </svg>
  )
}
function IconPlay({ size = 14, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }}>
      <polygon points="6 4 20 12 6 20" fill="currentColor" />
    </svg>
  )
}

function DriveThumb({ project, onClick }: { project: any; onClick: () => void }) {
  const [firstFile, setFirstFile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!project.drive_url) { setLoading(false); return }
    const isMedia = (f: any) => f.mimeType?.includes('video') || f.mimeType?.includes('image')
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(async data => {
        const files = data.files || []
        const media = files.find(isMedia)
        if (media) { setFirstFile(media); setLoading(false); return }
        const folder = files.find((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
        if (folder) {
          const res2 = await fetch(`/api/drive?folderId=${folder.id}`)
          const data2 = await res2.json()
          setFirstFile((data2.files || []).find(isMedia) || null)
        } else {
          setFirstFile(null)
        }
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
              <div style={{ position:'absolute', width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(200,194,187,0.4)' }}><IconPlay size={14} style={{ marginLeft:2, color:'#C8C2BB' }} /></div>
            </div>
          ) : (
            <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt={project.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
          )
        ) : (
          <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
            <IconFolder size={26} style={{ color: 'rgba(200,194,187,0.25)' }} />
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

function DeliveryThumbBanner({ project }: { project: any }) {
  const [firstFile, setFirstFile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!project?.drive_url) { setLoading(false); return }
    const isMedia = (f: any) => f.mimeType?.includes('video') || f.mimeType?.includes('image')
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(async data => {
        const files = data.files || []
        const media = files.find(isMedia)
        if (media) { setFirstFile(media); setLoading(false); return }
        const folder = files.find((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
        if (folder) {
          const res2 = await fetch(`/api/drive?folderId=${folder.id}`)
          const data2 = await res2.json()
          setFirstFile((data2.files || []).find(isMedia) || null)
        } else {
          setFirstFile(null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [project?.drive_url])

  const isVideo = (mime: string) => mime?.includes('video')

  return (
    <div style={{ width: '100%', height: 170, background: 'linear-gradient(135deg, #1A1F28 0%, #14181F 100%)', position: 'relative', overflow: 'hidden' }}>
      {!loading && firstFile && (
        isVideo(firstFile.mimeType) ? (
          <img src={`/api/drive?thumb=${firstFile.id}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        ) : (
          <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,16,20,0) 0%, rgba(14,16,20,0.9) 100%)' }} />
      <div style={{ position: 'absolute', top: 18, left: 18, width: 44, height: 44, borderRadius: '50%', background: 'rgba(100,200,130,0.15)', border: '1.5px solid rgba(100,200,130,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(100,200,130,0.25)' }}>
        <span style={{ fontSize: 20, color: 'rgba(100,200,130,0.95)' }}>✓</span>
      </div>
    </div>
  )
}

function ProjectThumbSquare({ project }: { project: any }) {
  const [firstFile, setFirstFile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!project.drive_url) { setLoading(false); return }
    const isMedia = (f: any) => f.mimeType?.includes('video') || f.mimeType?.includes('image')
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(async data => {
        const files = data.files || []
        const media = files.find(isMedia)
        if (media) { setFirstFile(media); setLoading(false); return }
        const folder = files.find((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
        if (folder) {
          const res2 = await fetch(`/api/drive?folderId=${folder.id}`)
          const data2 = await res2.json()
          setFirstFile((data2.files || []).find(isMedia) || null)
        } else {
          setFirstFile(null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [project.drive_url])

  const isVideo = (mime: string) => mime?.includes('video')

  return (
    <div style={{ width: 56, height: 56, borderRadius: 8, background: '#0E1014', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
      {!loading && firstFile ? (
        isVideo(firstFile.mimeType) ? (
          <>
            <img src={`/api/drive?thumb=${firstFile.id}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconPlay size={9} style={{ marginLeft: 1, color: '#C8C2BB' }} /></div>
          </>
        ) : (
          <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )
      ) : (
        <IconFolder size={20} style={{ color: 'rgba(200,194,187,0.5)' }} />
      )}
    </div>
  )
}

function DriveFolder({ project, clientEmail, clientName }: { project: any; clientEmail?: string; clientName?: string }) {
  const [files, setFiles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [previewFile, setPreviewFile] = React.useState<any>(null)
  const [stack, setStack] = React.useState<{ id: string; name: string }[]>([])
  const [selectedFileIds, setSelectedFileIds] = React.useState<Set<string>>(new Set())
  const [feedbackList, setFeedbackList] = React.useState<any[]>([])
  const [feedbackTimestamp, setFeedbackTimestamp] = React.useState('')
  const [feedbackMessage, setFeedbackMessage] = React.useState('')
  const [submittingFeedback, setSubmittingFeedback] = React.useState(false)
  const [generalFeedbackMessage, setGeneralFeedbackMessage] = React.useState('')
  const [submittingGeneralFeedback, setSubmittingGeneralFeedback] = React.useState(false)
  const [generalFeedbackSent, setGeneralFeedbackSent] = React.useState(false)
  const [feedbackSent, setFeedbackSent] = React.useState(false)

  React.useEffect(() => {
    if (!previewFile) { setFeedbackList([]); return }
    supabase.from('video_feedback').select('*').eq('file_id', previewFile.id).order('timestamp_seconds', { ascending: true })
      .then(({ data }) => setFeedbackList(data || []))
  }, [previewFile])

  function parseTimestamp(input: string): number {
    const parts = input.trim().split(':').map(Number)
    if (parts.some(isNaN)) return 0
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 1) return parts[0]
    return 0
  }

  function formatSeconds(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function submitFeedback() {
    if (!feedbackMessage.trim() || !clientEmail || !previewFile) return
    setSubmittingFeedback(true)
    const timestamp_seconds = parseTimestamp(feedbackTimestamp)
    const { data, error } = await supabase.from('video_feedback').insert([{
      project_id: project.id,
      file_id: previewFile.id,
      file_name: previewFile.name,
      client_email: clientEmail,
      client_name: clientName || clientEmail,
      timestamp_seconds,
      message: feedbackMessage.trim(),
    }]).select().single()
    if (!error && data) {
      setFeedbackList(p => [...p, data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
      try {
        await fetch('/api/video-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            projectTitle: project.title,
            fileName: previewFile.name,
            clientName: clientName || clientEmail,
            clientEmail,
            timestampSeconds: timestamp_seconds,
            message: feedbackMessage.trim(),
          }),
        })
      } catch (e) { console.error('Feedback notify error:', e) }
      setFeedbackTimestamp('')
      setFeedbackMessage('')
      setFeedbackSent(true)
      setTimeout(() => setFeedbackSent(false), 2500)
    }
    setSubmittingFeedback(false)
  }

  // Feedback on the project as a whole, not tied to any one clip — same table
  // as per-video feedback (file_id null marks it as general), so it shows up
  // in the studio's existing revision-request pipeline without new plumbing.
  async function submitGeneralFeedback() {
    if (!generalFeedbackMessage.trim() || !clientEmail) return
    setSubmittingGeneralFeedback(true)
    const { data, error } = await supabase.from('video_feedback').insert([{
      project_id: project.id,
      file_id: null,
      file_name: null,
      client_email: clientEmail,
      client_name: clientName || clientEmail,
      timestamp_seconds: null,
      message: generalFeedbackMessage.trim(),
    }]).select().single()
    if (!error && data) {
      try {
        await fetch('/api/video-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.id,
            projectTitle: project.title,
            fileName: null,
            clientName: clientName || clientEmail,
            clientEmail,
            timestampSeconds: null,
            message: generalFeedbackMessage.trim(),
          }),
        })
      } catch (e) { console.error('Feedback notify error:', e) }
      setGeneralFeedbackMessage('')
      setGeneralFeedbackSent(true)
      setTimeout(() => setGeneralFeedbackSent(false), 2500)
    }
    setSubmittingGeneralFeedback(false)
  }

  function loadRoot() {
    if (!project.drive_url) return
    setLoading(true)
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack([]); setSelectedFileIds(new Set()); setLoading(false) })
      .catch(() => setLoading(false))
  }

  React.useEffect(() => { loadRoot() }, [project.drive_url])

  function openFolder(folder: any) {
    setLoading(true)
    fetch(`/api/drive?folderId=${folder.id}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack(p => [...p, { id: folder.id, name: folder.name }]); setSelectedFileIds(new Set()); setLoading(false) })
      .catch(() => setLoading(false))
  }

  function goToCrumb(index: number) {
    if (index < 0) { loadRoot(); return }
    const target = stack[index]
    setLoading(true)
    fetch(`/api/drive?folderId=${target.id}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack(stack.slice(0, index + 1)); setSelectedFileIds(new Set()); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const isVideo = (mime: string) => mime?.includes('video')
  const isImage = (mime: string) => mime?.includes('image')
  const isFolder = (mime: string) => mime === 'application/vnd.google-apps.folder'

  function toggleFileSelected(id: string) {
    setSelectedFileIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function downloadFile(file: any) {
    const a = document.createElement('a')
    a.href = `/api/drive/download?id=${file.id}&name=${encodeURIComponent(file.name)}`
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function downloadSelected() {
    const toDownload = files.filter(f => selectedFileIds.has(f.id))
    toDownload.forEach((f, i) => setTimeout(() => downloadFile(f), i * 500))
    setSelectedFileIds(new Set())
  }

  if (loading) return <div style={{ marginBottom:32 }}><div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.28)', marginBottom:14 }}>{project.title}</div><div style={{ color:'rgba(200,194,187,0.2)', fontSize:12, padding:'20px 0' }}>Loading files...</div></div>
  if (files.length === 0 && stack.length === 0) return null

  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.28)' }}>{project.title}</div>
        <a href={project.drive_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'rgba(200,194,187,0.35)', textDecoration:'none', letterSpacing:'0.08em', textTransform:'uppercase' }}>Open in Drive →</a>
      </div>
      <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', marginBottom:8, padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
        <ProjectThumbSquare project={project} />
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:4 }}>{project.title}</div>
          <div style={{ display:'flex', gap:16 }}>
            {project.shoot_date && <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Shoot: {new Date(project.shoot_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}</div>}
            {project.address && <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{project.address.split(',')[0]}</div>}
            <div style={{ fontSize:11, color:'rgba(100,200,130,0.7)' }}>{files.length} item{files.length!==1?'s':''}</div>
          </div>
        </div>
      </div>
      <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', marginBottom:14, padding:'14px 18px' }}>
        <div style={{ fontSize:11, fontWeight:500, color:'#C8C2BB', marginBottom:8 }}>Have feedback on this project overall?</div>
        <div style={{ display:'flex', gap:8 }}>
          <textarea value={generalFeedbackMessage} onChange={e => setGeneralFeedbackMessage(e.target.value)} placeholder="e.g. Can we get a warmer grade across the whole set, and swap the intro clip?" rows={2} style={{ flex:1, background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.12)', borderRadius:4, padding:'8px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical' as const }} />
          <button onClick={submitGeneralFeedback} disabled={submittingGeneralFeedback || !generalFeedbackMessage.trim()} style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 14px', borderRadius:3, background: generalFeedbackSent ? 'rgba(100,200,130,0.15)' : '#C8C2BB', color: generalFeedbackSent ? 'rgba(100,200,130,0.9)' : '#111', border: generalFeedbackSent ? '0.5px solid rgba(100,200,130,0.3)' : 'none', cursor: submittingGeneralFeedback || !generalFeedbackMessage.trim() ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit', flexShrink:0, opacity: !generalFeedbackMessage.trim() && !submittingGeneralFeedback ? 0.5 : 1 }}>
            {submittingGeneralFeedback ? 'Sending...' : generalFeedbackSent ? '✓ Sent' : 'Send'}
          </button>
        </div>
      </div>
      {stack.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap' as const, alignItems:'center', gap:4, marginBottom:14, fontSize:11 }}>
          <span onClick={() => goToCrumb(-1)} style={{ cursor:'pointer', color: 'rgba(200,194,187,0.4)', textDecoration:'underline', display:'inline-flex', alignItems:'center', gap:5 }}><IconFolder size={12} /> {project.title}</span>
          {stack.map((s, i) => (
            <span key={s.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ color:'rgba(200,194,187,0.25)' }}>/</span>
              <span onClick={() => goToCrumb(i)} style={{ cursor: i < stack.length - 1 ? 'pointer' : 'default', color: i < stack.length - 1 ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: i < stack.length - 1 ? 'underline' : 'none' }}>{s.name}</span>
            </span>
          ))}
        </div>
      )}
      {files.some(f => !isFolder(f.mimeType)) && (
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10, marginBottom:12, minHeight:28 }}>
          {selectedFileIds.size > 0 && (
            <>
              <span style={{ fontSize:11, color:'rgba(200,194,187,0.5)' }}>{selectedFileIds.size} selected</span>
              <button onClick={() => setSelectedFileIds(new Set())} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 12px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.12)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
              <button onClick={downloadSelected} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, background:'#C8C2BB', color:'#111', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>Download selected ({selectedFileIds.size})</button>
            </>
          )}
        </div>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', gap:14 }}>
        {files.map((file: any) => (
          <div key={file.id} style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', cursor:'pointer', width: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? 'calc(33% - 10px)' : 'calc(50% - 7px)' }} onClick={() => { if (isFolder(file.mimeType)) openFolder(file); else setPreviewFile(file) }}>
            <div style={{ aspectRatio: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? '9/16' : '16/9', background:'#0E1014', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFolder(file.mimeType) ? (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><IconFolder size={32} style={{ color:'rgba(200,194,187,0.5)' }} /></div>
              ) : isVideo(file.mimeType) ? (
                <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#0a0c10', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <img src={`/api/drive?thumb=${file.id}`} alt={file.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.75 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
                  <div style={{ position:'relative', width:40, height:40, borderRadius:'50%', background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(200,194,187,0.4)' }}><IconPlay size={15} style={{ marginLeft:2, color:'#C8C2BB' }} /></div>
                </div>
              ) : isImage(file.mimeType) ? (
                <img src={`https://lh3.googleusercontent.com/d/${file.id}`} alt={file.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { const t=e.target as HTMLImageElement; t.src=`https://drive.google.com/thumbnail?id=${file.id}&sz=w800`; t.onerror=()=>{t.style.display='none'} }} />
              ) : (
                <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><IconDocument size={28} style={{ color:'rgba(200,194,187,0.5)' }} /></div>
              )}
              {!isFolder(file.mimeType) && <span style={{ position:'absolute', top:8, left:8, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', background:'rgba(0,0,0,0.6)', color:'#C8C2BB', padding:'3px 8px', borderRadius:2 }}>{isVideo(file.mimeType) ? 'Video' : isImage(file.mimeType) ? 'Photo' : 'File'}</span>}
              {file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) && <span style={{ position:'absolute', top:8, right:8, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', background:'rgba(0,0,0,0.6)', color:'rgba(200,194,187,0.7)', padding:'3px 8px', borderRadius:2 }}>Vertical</span>}
              {!isFolder(file.mimeType) && (
                <div onClick={e => { e.stopPropagation(); toggleFileSelected(file.id) }} style={{ position:'absolute', bottom:8, right:8, width:20, height:20, borderRadius:4, border: selectedFileIds.has(file.id) ? 'none' : '1.5px solid rgba(255,255,255,0.55)', background: selectedFileIds.has(file.id) ? '#C8C2BB' : 'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:2 }}>
                  {selectedFileIds.has(file.id) && <span style={{ fontSize:12, color:'#111', fontWeight:700, lineHeight:1 }}>✓</span>}
                </div>
              )}
            </div>
            <div style={{ padding:'10px 14px 6px' }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#C8C2BB', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</div>
              {file.size && <div style={{ fontSize:10, color:'rgba(200,194,187,0.35)' }}>{(parseInt(file.size)/1024/1024).toFixed(1)} MB</div>}
            </div>
            {isFolder(file.mimeType) ? (
              <div style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)', padding:'6px 14px 12px' }}>Open folder →</div>
            ) : (
              <div style={{ display:'flex', gap:6, padding:'6px 14px 12px' }}>
                <button onClick={e => { e.stopPropagation(); setPreviewFile(file) }} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'5px 10px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.09)', color:'rgba(200,194,187,0.4)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Preview</button>
                <a href={`/api/drive/download?id=${file.id}&name=${encodeURIComponent(file.name)}`} download={file.name} onClick={e => e.stopPropagation()} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'5px 10px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.09)', color:'rgba(200,194,187,0.4)', background:'transparent', cursor:'pointer', fontFamily:'inherit', textDecoration:'none' }}>Download</a>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* PREVIEW MODAL — scrolls vertically; feedback sits below the video */}
      {previewFile && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300, overflowY:'auto' }} onClick={() => setPreviewFile(null)}>
          <div style={{ position:'fixed', top:20, right:20, display:'flex', gap:12, alignItems:'center', zIndex:10 }} onClick={e => e.stopPropagation()}>
            <a href={`/api/drive/download?id=${previewFile.id}&name=${encodeURIComponent(previewFile.name)}`} download={previewFile.name} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, background:'#C8C2BB', color:'#111', textDecoration:'none', fontFamily:'inherit', fontWeight:500 }}>Download</a>
            <button onClick={() => setPreviewFile(null)} style={{ fontSize:24, color:'rgba(200,194,187,0.5)', background:'transparent', border:'none', cursor:'pointer' }}>×</button>
          </div>
          <div style={{ maxWidth: 920, margin:'0 auto', padding:'70px 20px 60px', display:'flex', flexDirection:'column', alignItems:'center' }} onClick={e => e.stopPropagation()}>
            {isVideo(previewFile.mimeType) ? (
              <>
                <div style={{ width:'100%', maxWidth: previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width) ? 420 : 880, aspectRatio: previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width) ? '9/16' : '16/9', borderRadius:10, overflow:'hidden', background:'#000', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
                  <iframe src={`https://drive.google.com/file/d/${previewFile.id}/preview`} style={{ width:'100%', height:'100%', border:'none' }} allow="autoplay" allowFullScreen />
                </div>
                <div style={{ fontSize:13, color:'rgba(200,194,187,0.6)', margin:'14px 0 28px' }}>{previewFile.name}</div>
                {/* FEEDBACK — below the player */}
                <div style={{ width:'100%', maxWidth:620, background:'#14181F', border:'0.5px solid rgba(200,194,187,0.12)', borderRadius:12, overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.3)' }}>
                  <div style={{ padding:'18px 22px', borderBottom:'0.5px solid rgba(200,194,187,0.1)', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(200,194,187,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconDocument size={14} style={{ color:'rgba(200,194,187,0.6)' }} /></div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Feedback on this clip</div>
                      <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Note the time you see on the player, then describe the change</div>
                    </div>
                  </div>
                  {feedbackList.length > 0 && (
                    <div style={{ maxHeight:220, overflowY:'auto', padding:'14px 22px 0', display:'flex', flexDirection:'column', gap:8 }}>
                      {feedbackList.map(fb => (
                        <div key={fb.id} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.08)', borderRadius:8, padding:'10px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#C8C2BB', background:'rgba(200,194,187,0.08)', borderRadius:4, padding:'3px 8px', flexShrink:0 }}>{formatSeconds(fb.timestamp_seconds)}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, color:'rgba(200,194,187,0.75)', lineHeight:1.5 }}>{fb.message}</div>
                            {fb.status === 'resolved' && <span style={{ fontSize:9, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(100,200,130,0.8)' }}>✓ Resolved</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ padding:'18px 22px', display:'flex', gap:10, alignItems:'flex-start' }}>
                    <input value={feedbackTimestamp} onChange={e => setFeedbackTimestamp(e.target.value)} placeholder="1:23" style={{ width:64, flexShrink:0, background:'rgba(200,194,187,0.06)', border:'0.5px solid rgba(200,194,187,0.15)', borderRadius:6, padding:'10px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', textAlign:'center' }} />
                    <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="What would you like changed?" rows={1} style={{ flex:1, background:'rgba(200,194,187,0.06)', border:'0.5px solid rgba(200,194,187,0.15)', borderRadius:6, padding:'10px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical' as const, minHeight:40 }} />
                    <button onClick={submitFeedback} disabled={submittingFeedback || !feedbackMessage.trim()} style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'11px 16px', borderRadius:6, background: feedbackSent ? 'rgba(100,200,130,0.15)' : '#C8C2BB', color: feedbackSent ? 'rgba(100,200,130,0.9)' : '#111', border: feedbackSent ? '0.5px solid rgba(100,200,130,0.3)' : 'none', cursor: submittingFeedback || !feedbackMessage.trim() ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit', flexShrink:0, opacity: !feedbackMessage.trim() && !submittingFeedback ? 0.5 : 1 }}>
                      {submittingFeedback ? 'Sending...' : feedbackSent ? '✓ Sent' : 'Send'}
                    </button>
                  </div>
                </div>
              </>
            ) : isImage(previewFile.mimeType) ? (
              <>
                <img src={`https://drive.google.com/uc?id=${previewFile.id}`} alt={previewFile.name} style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain', borderRadius:10, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} />
                <div style={{ fontSize:13, color:'rgba(200,194,187,0.6)', marginTop:14 }}>{previewFile.name}</div>
              </>
            ) : (
              <>
                <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color:'#C8C2BB', fontSize:14 }}>Open file in Google Drive</a>
                <div style={{ fontSize:13, color:'rgba(200,194,187,0.6)', marginTop:14 }}>{previewFile.name}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AttachmentUploader({ attachments, uploading, onUpload, onRemove }: { attachments: { name: string; url: string; size: number }[]; uploading: boolean; onUpload: (files: FileList) => void; onRemove: (url: string) => void }) {
  return (
    <div>
      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', display: 'block', marginBottom: 6 }}>Attachments <span style={{ textTransform: 'none', letterSpacing: 0, color: 'rgba(200,194,187,0.28)' }}>— vendor templates, existing photos or videos of the property</span></label>
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {attachments.map(a => (
            <div key={a.url} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '8px 12px' }}>
              <IconPaperclip size={13} style={{ color: 'rgba(200,194,187,0.4)', flexShrink: 0 }} />
              <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: 12, color: '#C8C2BB', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</a>
              <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', flexShrink: 0 }}>{a.size > 1024 * 1024 ? (a.size / (1024 * 1024)).toFixed(1) + ' MB' : Math.round(a.size / 1024) + ' KB'}</span>
              <button onClick={() => onRemove(a.url)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: uploading ? 'rgba(200,194,187,0.25)' : 'rgba(200,194,187,0.5)', cursor: uploading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
        {uploading ? 'Uploading...' : '+ Add files'}
        <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" disabled={uploading} onChange={e => { if (e.target.files && e.target.files.length > 0) onUpload(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
      </label>
    </div>
  )
}

export default function ClientPortal() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null)
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
  const [clientPhone, setClientPhone] = useState("")
  // Pre-fill email from logged in user
  useEffect(() => { if (user?.email && !clientEmail2) setClientEmail2(user.email) }, [user])
  const [draftDue, setDraftDue] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [propertyLiveDate, setPropertyLiveDate] = useState("")
  const [suggestedStoryline, setSuggestedStoryline] = useState("")
  const [shotList, setShotList] = useState("• \n• \n• \n• \n• ")
  const [twilightDate, setTwilightDate] = useState("")
  const [twilightTime, setTwilightTime] = useState("")
  const [deliveryDue, setDeliveryDue] = useState("")
  const [bookingAttachments, setBookingAttachments] = useState<{ name: string; url: string; size: number }[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  // Commercial & Events — request-a-quote brief fields
  const [projectType, setProjectType] = useState('')
  const [projectTitle, setProjectTitle] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [talentDetails, setTalentDetails] = useState('')
  const [briefDeliverables, setBriefDeliverables] = useState<BriefDeliverable[]>([
    { id: '1', name: '', quantity: 1, duration: '', formats: [], notes: '' },
  ])
  const [dateFlexible, setDateFlexible] = useState(false)
  const [shootDuration, setShootDuration] = useState('')
  const [referenceLinks, setReferenceLinks] = useState('')
  const [budgetRange, setBudgetRange] = useState('')

  const [tcAccepted, setTcAccepted] = useState(false)
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [clientBookings, setClientBookings] = useState<any[]>([])
  const [clientBriefs, setClientBriefs] = useState<any[]>([])
  const [clientInvoices, setClientInvoices] = useState<any[]>([])
  // Unlike clientProjects (active only — markSent archives every project on an
  // invoice), this includes archived ones too, so invoice line items and
  // lifetime stats don't go blank the moment an invoice is actually sent.
  const [allClientProjects, setAllClientProjects] = useState<any[]>([])
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null)
  const [previousShootsPage, setPreviousShootsPage] = useState(1)
  const [selectedBrief, setSelectedBrief] = useState<any>(null)
  const [libraryProject, setLibraryProject] = useState<any>(null)
  const [briefFeedback, setBriefFeedback] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [clientProfile, setClientProfile] = useState<any>(null)
  // Pre-fill the booking form's contact details from the account's profile so
  // they don't have to retype them on every booking — still freely editable
  // per booking, and only fills in while the field is still empty.
  useEffect(() => { if (clientProfile?.name && !clientContactName) setClientContactName(clientProfile.name) }, [clientProfile])
  useEffect(() => { if (clientProfile?.phone && !clientPhone) setClientPhone(clientProfile.phone) }, [clientProfile])
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [deliveryPopup, setDeliveryPopup] = useState<{ notif: any; project: any } | null>(null)
  const [respondingBookingId, setRespondingBookingId] = useState<string | null>(null)
  const [altTimeBookingId, setAltTimeBookingId] = useState<string | null>(null)
  const [altTimeMessage, setAltTimeMessage] = useState('')
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
      // Load client profile (create one if this is a first login with no profile yet)
      await ensureClientProfile(session.user)
      const { data: profile } = await supabase.from('clients1').select('*').eq('email', email).single()
      if (profile) setClientProfile(profile)
      // Load projects linked to this client
      const { data: projects } = await supabase.from('projects1').select('*').eq('email', email).eq('archived', false).order('created_at', { ascending: false })
      if (projects) setClientProjects(projects)
      // Also load every project regardless of archived state — invoice line
      // items and lifetime stats need projects that markSent already archived.
      const { data: allProjects } = await supabase.from('projects1').select('*').ilike('email', email || '').order('created_at', { ascending: false })
      if (allProjects) setAllClientProjects(allProjects)
      // Load bookings linked to this client
      const { data: bookings } = await supabase.from('bookings1').select('*').eq('client_email', email).order('created_at', { ascending: false })
      if (bookings) setClientBookings(bookings)
      const { data: briefs } = await supabase.from('briefs').select('*').eq('client_email', email).order('created_at', { ascending: false })
      if (briefs) setClientBriefs(briefs)
      const { data: invoices } = await supabase.from('invoices1').select('*').ilike('client_email', email || '').neq('status', 'draft').order('created_at', { ascending: false })
      if (invoices) setClientInvoices(invoices)
      const { data: notifs } = await supabase.from('notifications').select('*').eq('user_email', email).eq('read', false).order('created_at', { ascending: false })
      if (notifs) {
        // Content-delivered gets its own celebratory popup with a thumbnail
        // and a direct "view now" action, rather than sitting as a plain
        // line in the generic notifications list.
        const delivery = notifs.find(n => n.type === 'content_delivered')
        const rest = notifs.filter(n => n.id !== delivery?.id)
        setNotifications(rest)
        if (delivery) setDeliveryPopup({ notif: delivery, project: (projects || []).find((p: any) => p.id === delivery.project_id) || null })
        else if (rest.length > 0) setShowNotifications(true)
      }
    })

    // Background token refresh can silently fail if the tab sits idle for a
    // while (browsers throttle timers in hidden tabs) — the old token then
    // stays cached and every request quietly fails with no error shown. Revalidate
    // whenever the tab regains focus/visibility so a dead session bounces to login
    // instead of leaving the page looking broken/empty.
    async function revalidateSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) router.push('/login')
    }
    function onVisible() { if (document.visibilityState === 'visible') revalidateSession() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', revalidateSession)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', revalidateSession)
      authListener.subscription.unsubscribe()
    }
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Client accepts the studio's proposed date/time — a plain DB write, since
  // only the studio's own browser session holds the Google cookies needed to
  // actually create the project + calendar event (that happens once the
  // studio sees this booking under "Ready to create project").
  async function confirmProposedTime(booking: any) {
    setRespondingBookingId(booking.id)
    try {
      const res = await fetch('/api/confirm-booking-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { console.error('Confirm time error:', data.error); return }
      setClientBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'confirmed', project_id: data.project?.id } : b))
    } catch (e) {
      console.error('Confirm time error:', e)
    } finally {
      setRespondingBookingId(null)
    }
  }

  async function submitAltTimeRequest(booking: any) {
    setRespondingBookingId(booking.id)
    try {
      const { error } = await supabase.from('bookings1').update({
        status: 'alt_requested',
        client_response_message: altTimeMessage || null,
      }).eq('id', booking.id)
      if (error) { console.error('Request another time error:', error); return }
      setClientBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'alt_requested', client_response_message: altTimeMessage || null } : b))
      try {
        await fetch('/api/notify-alt-time-requested', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: booking.client_name,
            clientEmail: booking.client_email,
            title: booking.address || booking.shoot_package || '',
            proposedDate: booking.proposed_date,
            proposedStartTime: booking.proposed_start_time,
            message: altTimeMessage || null,
          }),
        })
      } catch (e) { console.error('Notify-alt-time-requested error:', e) }
      setAltTimeBookingId(null)
      setAltTimeMessage('')
    } finally {
      setRespondingBookingId(null)
    }
  }

  async function uploadBookingAttachments(files: FileList) {
    setUploadingAttachment(true)
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const path = `${Date.now()}-${safeName}`
        const { error } = await supabase.storage.from('booking-attachments').upload(path, file)
        if (error) { console.error('Attachment upload error:', error); continue }
        const { data: { publicUrl } } = supabase.storage.from('booking-attachments').getPublicUrl(path)
        setBookingAttachments(prev => [...prev, { name: file.name, url: publicUrl, size: file.size }])
      }
    } finally {
      setUploadingAttachment(false)
    }
  }

  function removeBookingAttachment(url: string) {
    setBookingAttachments(prev => prev.filter(a => a.url !== url))
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
      name: 'Content Campaign Package', price: 890,
      tag: 'Campaign package',
      description: "Give us direction or just let us do the work creating ads for your property. Campaigns comprise of momentum and this load of content does exactly that.",
      includes: ['20-30 Second Ad', '8-10 Slide Standard Carousel', '5-8 Second Ad'],
      allIncluded: true,
      deliverables: [
        { name: 'Ad (20-30s)', price: 0, includes: ['1x social-optimised video', 'Vertical & landscape formats', 'Google Drive delivery'] },
        { name: 'Carousel (8-10 slides)', price: 0, includes: ['1x branded property carousel', 'Google Drive delivery'] },
        { name: 'Ad (5-8s)', price: 0, includes: ['1x short-form video ad', 'Vertical & landscape formats', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'The Walkthrough Package', price: 890,
      tag: 'Our base package',
      description: '60–90s cinematic property tour with a handful of agent lifestyle shots to bring the listing to life.',
      includes: ['60–90s property tour', 'Agent lifestyle shots'],
      deliverables: [
        { name: 'Walkthrough Film (60–90s)', price: 0, includes: ['1x walkthrough film', 'Google Drive delivery'] },
        { name: '2x Showcase Reels (20s)', price: 0, includes: ['2x 20s showcase reels', 'Vertical & landscape', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Lifestyle and Living Package', price: 1280,
      tag: 'The lifestyle showcase',
      description: 'Everything in The Walkthrough Package, plus a full hour of lifestyle filming with talent to elevate the property narrative.',
      includes: ['60–90s property tour', '1hr lifestyle shoot with talent', 'Agent lifestyle shots', 'Vertical formatting'],
      deliverables: [
        { name: 'Showcase Film (60–90s)', price: 0, includes: ['1x cinematic film', 'Vertical & landscape formats', 'Google Drive delivery'] },
        { name: '3x Reels + Carousel', price: 0, includes: ['3x social reels', '1x carousel', 'Vertical & landscape formats', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Media Release Package', price: 2480,
      tag: 'Full production',
      description: 'For the most upmarket and desirable homes. Everything you could need to drill home the perfect marketing campaign, showcased only in the best light.',
      includes: ['Morning, afternoon & twilight shoot', 'Lifestyle shoot + talking to camera', '90 Second Market Leading Property Showcase', '20-30 Second Ad', 'Creative Carousel', '5-8 Second Ad'],
      deliverables: [
        { name: 'Full Media Release Package', price: 0, includes: ['1x Market-leading property showcase (90s)', '1x Ad (20-30s)', '1x Creative carousel', '1x Ad (5-8s)', 'Google Drive delivery'] },
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
    { name: 'Additional 20s Reel', price: 250, desc: 'An edited reel consisting of footage from the shoot (20s)' },
    { name: 'Additional 40s Reel', price: 400, desc: 'An edited reel consisting of footage from the shoot (40s)' },
    { name: 'Carousel', price: 100, desc: 'Visually engaging property showcase carousel' },
    { name: 'Open Home Story', price: 80, desc: 'Short-form story content for open home promotion' },
    { name: 'Twilight Shoot', price: 350, desc: 'Golden hour & dusk exterior shoot' },
    { name: 'Travel Flat Rate — Raglan', price: 150, desc: 'Flat travel rate for shoots in Raglan' },
    { name: 'Travel Flat Rate — Morrinsville, Whatawhata', price: 60, desc: 'Flat travel rate for shoots in Morrinsville or Whatawhata' },
    { name: 'Property Content Creative Planning', price: 80, desc: 'Dedicated creative planning session for your property content' },
    { name: 'Pre Shoot Property Site Visit', price: 80, desc: 'In-person site visit ahead of the shoot (within Hamilton/Auckland)' },
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
  const cInp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const cLbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }
  function addBriefDel() { setBriefDeliverables(p => [...p, { id: Date.now().toString(), name: '', quantity: 1, duration: '', formats: [], notes: '' }]) }
  function updateBriefDel(id: string, field: keyof BriefDeliverable, value: any) { setBriefDeliverables(p => p.map(d => d.id === id ? { ...d, [field]: value } : d)) }
  function removeBriefDel(id: string) { setBriefDeliverables(p => p.filter(d => d.id !== id)) }
  function toggleBriefFmt(id: string, fmt: string) { setBriefDeliverables(p => p.map(d => d.id === id ? { ...d, formats: d.formats.includes(fmt) ? d.formats.filter(f => f !== fmt) : [...d.formats, fmt] } : d)) }

  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', display: 'flex' }}>
      <style>{`
        .ec-client-topbar { display: none; }
        .ec-client-backdrop { display: none; }
        @media (max-width: 860px) {
          .ec-client-sidebar { position: fixed !important; top: 0; left: 0; z-index: 200; transform: translateX(-100%); transition: transform 0.2s ease; }
          .ec-client-sidebar.open { transform: translateX(0); }
          .ec-client-topbar { display: flex !important; }
          .ec-client-backdrop.open { display: block !important; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 199; }
          .ec-client-main { padding-top: 56px; }
        }
        .ec-grid-4-resp { display: grid; grid-template-columns: repeat(4,1fr); }
        .ec-grid-sidebar-resp { display: grid; grid-template-columns: 1fr 300px; }
        @media (max-width: 900px) {
          .ec-grid-4-resp { grid-template-columns: repeat(2,1fr) !important; }
          .ec-grid-sidebar-resp { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .ec-grid-resp { grid-template-columns: 1fr !important; }
          .ec-grid-4-resp { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 760px) {
          .ec-category-split { flex-direction: column !important; }
          .ec-category-card { border-right: none !important; border-bottom: 0.5px solid rgba(200,194,187,0.12); }
          .ec-category-card .ec-category-content { padding: 24px !important; }
        }
      `}</style>

      {/* MOBILE TOP BAR */}
      <div className="ec-client-topbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 150, background: '#14181F', borderBottom: '0.5px solid rgba(200,194,187,0.09)', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 28, objectFit: 'contain', display: 'block' }} />
        <button onClick={() => setMobileMenuOpen(true)} aria-label="Menu" style={{ background: 'transparent', border: 'none', width: 28, height: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', padding: 0 }}>
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%' }} />
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%' }} />
          <span style={{ height: 1.5, background: '#C8C2BB', width: '100%' }} />
        </button>
      </div>
      <div className={`ec-client-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)} />

      {/* SIDEBAR */}
      <aside className={`ec-client-sidebar ${mobileMenuOpen ? 'open' : ''}`} style={{ width: 220, flexShrink: 0, background: '#14181F', borderRight: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 40, objectFit: 'contain', maxWidth: 184 }} />
          <button onClick={() => setMobileMenuOpen(false)} className="ec-client-topbar" style={{ display: 'none', background: 'transparent', border: 'none', color: 'rgba(200,194,187,0.5)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ margin: '14px 14px 8px', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3D4756', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#C8C2BB', flexShrink: 0 }}>{clientProfile?.name ? clientProfile.name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>{clientProfile?.name || user?.email?.split('@')[0] || 'Client'}</div>
            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{clientProfile?.company || user?.email || ''}</div>
          </div>
        </div>

        <nav style={{ padding: '18px 12px', flex: 1 }}>
          {[
            { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
            { id: 'book', label: 'Book a Shoot', Icon: IconCalendar },
            { id: 'upcoming', label: 'Our Shoots', Icon: IconClapper },
            { id: 'library', label: 'My Library', Icon: IconFolder },
            { id: 'pitches', label: 'Our Briefs', Icon: IconDocument },
            { id: 'invoices', label: 'Invoices', Icon: IconReceipt },
          ].map(item => {
            const active = activeView === item.id
            return (
              <button key={item.id} onClick={() => { setMobileMenuOpen(false); setActiveView(item.id); setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress(''); setProjectType(''); setProjectTitle(''); setProjectDescription(''); setTargetAudience(''); setKeyMessage(''); setTalentDetails(''); setBriefDeliverables([{ id: '1', name: '', quantity: 1, duration: '', formats: [], notes: '' }]); setDateFlexible(false); setShootDuration(''); setReferenceLinks(''); setBudgetRange(''); setBookingAttachments([]); setTwilightDate(''); setTwilightTime('') }} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 14px 11px 17px', borderRadius: 6, fontSize: 13, letterSpacing: '0.01em', fontWeight: active ? 600 : 500, color: active ? '#fff' : 'rgba(200,194,187,0.5)', background: active ? 'rgba(61,71,86,0.4)' : 'transparent', border: active ? '0.5px solid rgba(200,194,187,0.15)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 4, textAlign: 'left', fontFamily: 'inherit' }}>
                {active && <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 2.5, height: 15, borderRadius: 2, background: '#C8C2BB' }} />}
                <item.Icon size={17} style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: 14, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 5, fontSize: 12, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}><IconSignOut size={15} style={{ flexShrink: 0 }} />Sign out</button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="ec-client-main" style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

        {/* ===== DASHBOARD ===== */}
        {activeView === 'dashboard' && (() => {
          const now = new Date()
          const hour = now.getHours()
          const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
          const clientName = clientProfile?.name || user?.email?.split('@')[0] || 'there'
          const confirmedShoots = clientProjects.filter((p: any) => p.shoot_date && new Date(p.shoot_date) >= now)
          const confirmedShootDates = new Set(clientProjects.map((p: any) => p.shoot_date).filter(Boolean))
          // A booking is still "in flight" (not yet a project) across three statuses:
          // pending (no studio response yet), date_proposed (waiting on us to answer),
          // alt_requested (we asked for another time, waiting on the studio).
          const isUnresolved = (s: string) => s === 'pending' || s === 'date_proposed' || s === 'alt_requested'
          // A confirmed booking with no project yet is also still "in flight" — the
          // studio hasn't finalized it into a project/calendar event — so it shouldn't
          // vanish from these lists in the gap between the client confirming and that.
          const isAwaitingProject = (b: any) => isUnresolved(b.status) || (b.status === 'confirmed' && !b.project_id)
          const pendingShootBookings = clientBookings.filter((b: any) => (b.proposed_date || b.preferred_date) && new Date(b.proposed_date || b.preferred_date) >= now && isAwaitingProject(b) && !confirmedShootDates.has(b.proposed_date || b.preferred_date)).map((b: any) => ({ id: b.id, title: b.address || b.shoot_package || 'Pending booking', shoot_date: b.proposed_date || b.preferred_date, stage: b.status === 'date_proposed' ? 'Time proposed' : b.status === 'alt_requested' ? 'Awaiting new time' : b.status === 'confirmed' ? 'Confirmed' : 'Pending', client: b.client_name, address: b.address, progress: 0, isPending: true, shoot_package: b.shoot_package, deliverables_type: b.deliverables, addons: b.addons, total: b.total }))
          const upcomingShoots = [...confirmedShoots, ...pendingShootBookings].sort((a: any, b: any) => new Date(a.shoot_date).getTime() - new Date(b.shoot_date).getTime())
          const activeProjects = clientProjects.filter((p: any) => p.stage !== 'Awaiting Confirmation' && p.stage !== 'Completed')
          const awaitingSchedule = clientBookings.filter((b: any) => !b.preferred_date && !b.proposed_date && isUnresolved(b.status))
          // Archiving is an internal studio/invoicing bookkeeping step — it must
          // never make a client's own delivered content disappear on them, so
          // these use allClientProjects (unfiltered by archived) rather than
          // clientProjects (active-only).
          const completedProjects = allClientProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' || p.stage === 'Completed' || p.drive_url)
          const pendingBookings = clientBookings.filter((b: any) => isAwaitingProject(b))
          // Same scoping as the studio dashboard's "Recent deliveries" slider.
          const recentDeliveries = allClientProjects.filter((p: any) => p.drive_url && (p.stage === 'Awaiting Confirmation' || p.stage === 'Completed')).sort((a: any, b: any) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime()).slice(0, 10)

          // Calendar
          const startOfWeek = new Date(now)
          const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
          startOfWeek.setDate(now.getDate() - dow)
          const weeks = Array.from({length: 5}, (_: any, wi: number) => Array.from({length: 7}, (_: any, di: number) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + wi * 7 + di); return d }))
          const eventsByDate: Record<string, { type: string; label: string; ref: any }[]> = {}
          const addCalEvent = (date: string | null, type: string, label: string, ref: any) => {
            if (!date) return
            if (!eventsByDate[date]) eventsByDate[date] = []
            eventsByDate[date].push({ type, label, ref })
          }
          // Property shoots get an estimated delivery date — 3 business days after
          // the shoot — shown on the calendar until the studio sets a real delivery_due.
          clientProjects.forEach((p: any) => {
            if (p.shoot_date) addCalEvent(p.shoot_date, 'shoot', 'Shoot', p)
            if (p.delivery_due) addCalEvent(p.delivery_due, 'delivery', 'Delivery due', p)
            else if (p.category === 'Property' && p.shoot_date) addCalEvent(addBusinessDays(p.shoot_date, 3), 'delivery-estimate', 'Estimated delivery', p)
          })
          clientBookings.filter((b: any) => isAwaitingProject(b)).forEach((b: any) => {
            const bDate = b.proposed_date || b.preferred_date
            if (!bDate) return
            addCalEvent(bDate, b.status === 'confirmed' ? 'shoot' : 'pending', b.status === 'confirmed' ? 'Shoot (confirmed)' : 'Shoot (pending confirmation)', b)
            if (b.category === 'property') addCalEvent(addBusinessDays(bDate, 3), 'delivery-estimate', 'Estimated delivery', b)
          })
          const calTypeColors: Record<string,string> = { shoot: 'rgba(210,175,80,0.9)', pending: 'rgba(160,100,220,0.9)', delivery: 'rgba(100,200,130,0.9)', 'delivery-estimate': 'rgba(100,200,130,0.5)' }

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
                <div className="ec-grid-4-resp" style={{ gap: 10, marginBottom: 24 }}>
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

                <div className="ec-grid-sidebar-resp" style={{ gap: 20 }}>
                  {/* LEFT: UPCOMING SHOOTS + ACTIVE PROJECTS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* UPCOMING SHOOTS */}
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Upcoming shoots</span>
                        <button onClick={() => setActiveView('book')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Book new</button>
                      </div>
                      {awaitingSchedule.length > 0 && awaitingSchedule.map((b: any) => (
                        <div key={b.id} onClick={() => setActiveView('upcoming')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.06)', cursor: 'pointer' }}>
                          <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.2)', borderRadius: 5, padding: '10px 3px' }}>
                            <IconClock size={16} style={{ color: 'rgba(210,175,80,0.8)' }} />
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
                        const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'}, 'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}, 'Completed': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.6)'}, 'Pending': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Time proposed': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Awaiting new time': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Confirmed': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'} }
                        const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                        return (
                          <div key={p.id} onClick={() => p.isPending ? setActiveView('upcoming') : setSelectedProject(p)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: i < upcomingShoots.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                            <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5, padding: '5px 3px' }}>
                              <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                              <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                              <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.address ? p.address.split(',')[0] : p.client}</div>
                            </div>
                            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{stageLabel(p.stage)}</span>
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
                          const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'}, 'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}, 'Completed': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.6)'} }
                          const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                          return (
                            <div key={p.id} onClick={() => setSelectedProject(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < activeProjects.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.delivery_due ? 'Due: ' + new Date(p.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : p.stage}</div>
                              </div>
                              <div style={{ width: 80, height: 3, background: 'rgba(200,194,187,0.07)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: p.progress + '%', background: '#C8C2BB', opacity: 0.5, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{stageLabel(p.stage)}</span>
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
                        {(() => {
                          return weeks.map((week: any, wi: number) => (
                          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 2 }}>
                            {week.map((day: any, di: number) => {
                              const key = localDateKey(day)
                              const events = eventsByDate[key] || []
                              const hasEvents = events.length > 0
                              const isToday = day.toDateString() === now.toDateString()
                              const isCurrentMonth = day.getMonth() === now.getMonth()
                              return (
                                <div key={di} onClick={() => hasEvents && setSelectedCalDay(key)} style={{ height: 36, borderRadius: 3, background: hasEvents ? 'rgba(200,194,187,0.04)' : 'transparent', border: '0.5px solid ' + (isToday ? 'rgba(200,194,187,0.5)' : hasEvents ? 'rgba(200,194,187,0.12)' : 'rgba(200,194,187,0.05)'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px 0', cursor: hasEvents ? 'pointer' : 'default' }}>
                                  <div style={{ fontSize: 10, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : isCurrentMonth ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.2)' }}>{day.getDate()}</div>
                                  {hasEvents && (
                                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                                      {events.slice(0,3).map((ev: any, ei: number) => (
                                        <div key={ei} style={{ width: 4, height: 4, borderRadius: '50%', background: calTypeColors[ev.type] || '#C8C2BB' }} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          ))
                        })()}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginTop: 10, paddingTop: 10, borderTop: '0.5px solid rgba(200,194,187,0.07)' }}>
                          {[['rgba(210,175,80,0.9)', 'Shoot'], ['rgba(100,200,130,0.9)', 'Delivery'], ['rgba(100,200,130,0.5)', 'Est. delivery']].map(([color, label]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                              <span style={{ fontSize: 9, color: 'rgba(200,194,187,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                            </div>
                          ))}
                        </div>
                        {selectedCalDay && (() => {
                          const dayEvents = eventsByDate[selectedCalDay] || []
                          const dayLabel = new Date(selectedCalDay + 'T12:00:00').toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })
                          return (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setSelectedCalDay(null)}>
                              <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '0.5px solid rgba(200,194,187,0.09)' }}>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{dayLabel}</div>
                                  <button onClick={() => setSelectedCalDay(null)} style={{ fontSize: 18, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                                </div>
                                <div style={{ padding: '10px 14px' }}>
                                  {dayEvents.map((ev: any, i: number) => (
                                    <div key={i} onClick={() => { setSelectedCalDay(null); if (ev.ref.stage) { setSelectedProject(ev.ref) } else { setActiveView('upcoming') } }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 5, cursor: 'pointer', borderBottom: i < dayEvents.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: calTypeColors[ev.type] || '#C8C2BB', flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.ref.title || ev.ref.address || ev.ref.shoot_package || 'Booking'}</div>
                                        <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.4)' }}>{ev.label}{(() => { const st = ev.ref.shoot_window_start || ev.ref.proposed_start_time; const et = ev.ref.shoot_window_end || ev.ref.proposed_end_time; return st ? ' · ' + formatTime12(st) + (et ? '–' + formatTime12(et) : '') : '' })()}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* PENDING BOOKINGS */}
                    {pendingBookings.length > 0 && (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Pending bookings</div>
                        <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                          {pendingBookings.map((b: any, i: number) => {
                            const isLast = i === pendingBookings.length - 1
                            if (b.status === 'date_proposed') {
                              return (
                                <div key={b.id} style={{ padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
                                    <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(100,150,220,0.08)', border:'0.5px solid rgba(100,150,220,0.2)', borderRadius:5, padding:'10px 4px' }}>
                                      <IconCalendar size={16} style={{ color: 'rgba(100,150,220,0.85)' }} />
                                    </div>
                                    <div style={{ flex:1 }}>
                                      <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                      <div style={{ fontSize:11, color:'rgba(100,150,220,0.9)' }}>Proposed: {new Date(b.proposed_date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'})} · {formatTime12(b.proposed_start_time)}{b.proposed_end_time ? ' – ' + formatTime12(b.proposed_end_time) : ''}</div>
                                    </div>
                                    <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,150,220,0.12)', color:'rgba(100,150,220,0.9)', border:'0.5px solid rgba(100,150,220,0.25)' }}>Time proposed</span>
                                  </div>
                                  {altTimeBookingId === b.id ? (
                                    <div style={{ paddingLeft:56 }}>
                                      <textarea value={altTimeMessage} onChange={e => setAltTimeMessage(e.target.value)} placeholder="Optional — let us know what times work better" rows={2} style={{ width:'100%', background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'8px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', marginBottom:8 }} />
                                      <div style={{ display:'flex', gap:8 }}>
                                        <button onClick={() => { setAltTimeBookingId(null); setAltTimeMessage('') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                                        <button disabled={respondingBookingId === b.id} onClick={() => submitAltTimeRequest(b)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background: respondingBookingId === b.id ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: respondingBookingId === b.id ? 'rgba(200,194,187,0.3)' : '#111', border:'none', cursor: respondingBookingId === b.id ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit' }}>{respondingBookingId === b.id ? 'Sending...' : 'Send request'}</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display:'flex', gap:8, paddingLeft:56 }}>
                                      <button disabled={respondingBookingId === b.id} onClick={() => confirmProposedTime(b)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background: respondingBookingId === b.id ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: respondingBookingId === b.id ? 'rgba(200,194,187,0.3)' : '#111', border:'none', cursor: respondingBookingId === b.id ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit' }}>{respondingBookingId === b.id ? 'Saving...' : 'Confirm this time'}</button>
                                      <button disabled={respondingBookingId === b.id} onClick={() => { setAltTimeBookingId(b.id); setAltTimeMessage('') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Request another time</button>
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            if (b.status === 'alt_requested') {
                              return (
                                <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                                  <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(160,100,220,0.08)', border:'0.5px solid rgba(160,100,220,0.2)', borderRadius:5, padding:'10px 4px' }}>
                                    <IconClock size={16} style={{ color: 'rgba(160,100,220,0.85)' }} />
                                  </div>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                    <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Waiting on Example Content for a new time{b.client_response_message ? ' · "' + b.client_response_message + '"' : ''}</div>
                                  </div>
                                  <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(160,100,220,0.12)', color:'rgba(160,100,220,0.9)', border:'0.5px solid rgba(160,100,220,0.25)' }}>Awaiting new time</span>
                                </div>
                              )
                            }
                            if (b.status === 'confirmed') {
                              return (
                                <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                                  <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(100,200,130,0.08)', border:'0.5px solid rgba(100,200,130,0.2)', borderRadius:5, padding:'6px 4px' }}>
                                    <div style={{ fontSize:16, opacity:0.6 }}>✓</div>
                                  </div>
                                  <div style={{ flex:1 }}>
                                    <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                    <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{b.proposed_date ? new Date(b.proposed_date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'}) + (b.proposed_start_time ? ' · ' + formatTime12(b.proposed_start_time) : '') + ' — ' : ''}We're setting up your project</div>
                                  </div>
                                  <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,200,130,0.12)', color:'rgba(100,200,130,0.9)', border:'0.5px solid rgba(100,200,130,0.25)' }}>Confirmed</span>
                                </div>
                              )
                            }
                            return (
                              <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                                <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(210,175,80,0.08)', border:'0.5px solid rgba(210,175,80,0.2)', borderRadius:5, padding:'10px 4px' }}>
                                  <IconClock size={16} style={{ color: 'rgba(210,175,80,0.8)' }} />
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                  <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{b.shoot_package} {b.preferred_date ? '· ' + new Date(b.preferred_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                                </div>
                                <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(210,175,80,0.12)', color:'rgba(210,175,80,0.9)', border:'0.5px solid rgba(210,175,80,0.25)' }}>Pending</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RECENT DELIVERIES */}
                {recentDeliveries.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Recent deliveries</div>
                      <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)' }}>scroll →</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
                      {recentDeliveries.map((p: any) => (
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
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{selectedCat === 'commercial' ? 'Tell us about your project and we will be in touch with a quote' : 'Select your category, packages and preferred date'}</div>
              </div>
              <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
            </div>
            <div style={{ padding: bookingStep === 1 ? 0 : 28 }}>

              {/* STEP INDICATOR */}
              {bookingStep > 1 && <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, padding: '0 28px' }}>
                {(selectedCat === 'commercial'
                  ? [{ label: 'Category', value: 1 }, { label: 'Project brief', value: 2 }, { label: 'Confirm', value: 6 }]
                  : [{ label: 'Category', value: 1 }, { label: 'Packages', value: 2 }, { label: 'Add-ons', value: 4 }, { label: 'Details', value: 5 }, { label: 'Confirm', value: 6 }]
                ).map((step, i, arr) => (
                  <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${bookingStep > step.value ? 'rgba(100,200,130,0.5)' : bookingStep === step.value ? '#C8C2BB' : 'rgba(200,194,187,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: bookingStep > step.value ? 'rgba(100,200,130,0.8)' : bookingStep === step.value ? '#C8C2BB' : 'rgba(200,194,187,0.3)', background: bookingStep > step.value ? 'rgba(30,70,45,0.5)' : bookingStep === step.value ? 'rgba(200,194,187,0.08)' : 'transparent', flexShrink: 0 }}>{bookingStep > step.value ? '✓' : i + 1}</div>
                      <span style={{ fontSize: 11, color: bookingStep === step.value ? '#C8C2BB' : bookingStep > step.value ? 'rgba(100,200,130,0.7)' : 'rgba(200,194,187,0.3)', whiteSpace: 'nowrap' }}>{step.label}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ flex: 1, height: 0.5, background: 'rgba(200,194,187,0.09)', margin: '0 10px' }} />}
                  </div>
                ))}
              </div>}

              {/* STEP 1: CATEGORY */}
              {bookingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 115px)' }}>
                  {/* SPLIT PANELS */}
                  <div className="ec-category-split" style={{ display: 'flex', flex: 1, height: 'calc(100vh - 115px)' }}>
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
                        className="ec-category-card"
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
                        <div className="ec-category-content" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '48px' }}>
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
              {bookingStep === 2 && selectedCat === 'property' && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Select package</div>
                  <div className="ec-grid-resp" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14, marginBottom:22 }}>
                    {shootPackages.map((pkg: any) => (
                      <div key={pkg.name} onClick={() => {
                        setSelectedShoot(pkg)
                        setSelectedSubDel(null)
                        // The package description already lists everything included, so
                        // there's no separate "choose your deliverable" step any more —
                        // bundle all of the package's deliverables together automatically.
                        const bundled = { name: pkg.deliverables.map((d: any) => d.name).join(' + '), price: 0, includes: pkg.deliverables.flatMap((d: any) => d.includes) }
                        setSelectedDel(bundled)
                      }} style={{ border:`0.5px solid ${selectedShoot?.name === pkg.name ? 'rgba(200,194,187,0.35)' : 'rgba(200,194,187,0.08)'}`, borderRadius:12, padding:'22px 24px', cursor:'pointer', background: selectedShoot?.name === pkg.name ? 'linear-gradient(135deg, rgba(35,42,56,0.95) 0%, rgba(22,27,38,0.98) 100%)' : 'linear-gradient(135deg, rgba(26,31,40,0.9) 0%, rgba(18,22,30,0.95) 100%)', position:'relative', transition:'all 0.2s', boxShadow: selectedShoot?.name === pkg.name ? '0 0 30px rgba(200,194,187,0.04) inset' : 'none', overflow:'hidden' }}>
                        <div style={{ position:'absolute', top:0, left:0, right:0, height:'1px', background: selectedShoot?.name === pkg.name ? 'linear-gradient(90deg, transparent, rgba(200,194,187,0.25), transparent)' : 'linear-gradient(90deg, transparent, rgba(200,194,187,0.06), transparent)' }} />
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                          <div>
                            {pkg.tag && <div style={{ fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(100,200,130,0.6)', marginBottom:6, display:'flex', alignItems:'center', gap:5 }}><span style={{ width:4, height:4, borderRadius:'50%', background:'rgba(100,200,130,0.6)', display:'inline-block' }} />{pkg.tag}</div>}
                            <div style={{ fontSize:16, fontWeight:600, color:'#fff', letterSpacing:'-0.01em' }}>{pkg.name}</div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft:16 }}>
                            {selectedShoot?.name === pkg.name && <div style={{ width:20, height:20, borderRadius:'50%', background:'#C8C2BB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 12px rgba(200,194,187,0.3)' }}><span style={{ fontSize:10, color:'#111', fontWeight:700 }}>✓</span></div>}
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:24, fontWeight:700, color:'#fff', letterSpacing:'-0.03em', lineHeight:1 }}>${pkg.price.toLocaleString()}</div>
                              <div style={{ fontSize:9, color:'rgba(200,194,187,0.3)', letterSpacing:'0.08em', marginTop:2 }}>+ GST</div>
                            </div>
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
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(1)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => selectedShoot && setBookingStep(4)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: selectedShoot ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedShoot ? '#111' : 'rgba(200,194,187,0.2)', border:'none', cursor: selectedShoot ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Continue →</button>
                  </div>
                </div>
              )}

              {/* STEP 2 (COMMERCIAL & EVENTS): PROJECT BRIEF — a custom-scope request, not a package pick */}
              {bookingStep === 2 && selectedCat === 'commercial' && (() => {
                const commercialRequestValid = clientContactName && clientEmail2 && projectType && projectDescription
                return (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 4 }}>Tell us about your project</div>
                  <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.35)', marginBottom: 22, lineHeight: 1.6 }}>Commercial and event work is quoted per project rather than off a fixed package — the more detail you give us here, the faster and more accurate your quote will be.</div>

                  {/* About you */}
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 10, marginTop: 4 }}>About you</div>
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Business / brand name</label>
                      <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Black Barn Retreats" style={cInp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Your email</label>
                      <input type="email" value={clientEmail2} onChange={e => setClientEmail2(e.target.value)} placeholder="your@email.com" style={cInp} />
                    </div>
                  </div>

                  {/* The project */}
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 10 }}>The project</div>
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Project title</label>
                      <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="e.g. 2026 Brand Campaign" style={cInp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Type of project</label>
                      <select value={projectType} onChange={e => setProjectType(e.target.value)} style={cInp}>
                        <option value=''>Select type...</option>
                        <option>Brand / commercial video</option><option>Event coverage</option><option>Product video</option><option>Corporate / testimonial</option><option>Social content</option><option>Photography only</option><option>Other</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                      <label style={cLbl}>Target audience</label>
                      <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. First-home buyers aged 25–40" style={cInp} />
                    </div>
                  </div>

                  {/* The brief */}
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 10 }}>The brief</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Describe the project & scope of work</label>
                      <textarea rows={4} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} placeholder="What's the project, what story are we telling, and what does success look like?" style={{ ...cInp, resize: 'vertical', lineHeight: 1.65 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Key message / takeaway</label>
                      <input value={keyMessage} onChange={e => setKeyMessage(e.target.value)} placeholder="What should viewers think, feel, or do after watching?" style={cInp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Interviews, presenters, or talent on camera?</label>
                      <input value={talentDetails} onChange={e => setTalentDetails(e.target.value)} placeholder="e.g. 2 staff interviews, no professional talent needed" style={cInp} />
                    </div>
                  </div>

                  {/* Deliverables */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)' }}>Deliverables needed</div>
                    <button onClick={addBriefDel} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {briefDeliverables.map(d => (
                      <div key={d.id} style={{ background: 'rgba(0,0,0,0.2)', border: '0.5px solid rgba(200,194,187,0.07)', borderRadius: 6, padding: 14 }}>
                        <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 60px 110px', gap: 10, marginBottom: 10 }}>
                          <input style={cInp} value={d.name} onChange={e => updateBriefDel(d.id, 'name', e.target.value)} placeholder="e.g. Hero brand film..." />
                          <div><label style={{ ...cLbl, marginBottom: 4, display: 'block' }}>Qty</label><input style={{ ...cInp, textAlign: 'center' as const }} type="number" min="1" value={d.quantity} onChange={e => updateBriefDel(d.id, 'quantity', parseInt(e.target.value) || 1)} /></div>
                          <div><label style={{ ...cLbl, marginBottom: 4, display: 'block' }}>Length</label><input style={cInp} value={d.duration} onChange={e => updateBriefDel(d.id, 'duration', e.target.value)} placeholder="2-3 min" /></div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ ...cLbl, marginBottom: 6, display: 'block' }}>Formats</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {[...VIDEO_FORMATS, ...PHOTO_FORMATS].map(fmt => (
                              <button key={fmt} onClick={() => toggleBriefFmt(d.id, fmt)} style={{ fontSize: 10, padding: '4px 9px', borderRadius: 3, border: `0.5px solid ${d.formats.includes(fmt) ? '#C8C2BB' : 'rgba(200,194,187,0.12)'}`, background: d.formats.includes(fmt) ? 'rgba(200,194,187,0.1)' : 'transparent', color: d.formats.includes(fmt) ? '#C8C2BB' : 'rgba(200,194,187,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}>{fmt}</button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input style={{ ...cInp, fontSize: 11 }} value={d.notes} onChange={e => updateBriefDel(d.id, 'notes', e.target.value)} placeholder="Notes..." />
                          {briefDeliverables.length > 1 && <button onClick={() => removeBriefDel(d.id)} style={{ fontSize: 13, color: 'rgba(210,90,90,0.6)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}>✕</button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Logistics */}
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 10 }}>Logistics</div>
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                      <label style={cLbl}>Shoot location(s)</label>
                      <div style={{ position: 'relative' }}>
                        <input value={propertyAddress} onChange={e => handleAddressChange(e.target.value)} onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)} placeholder="Start typing an address..." style={cInp} />
                        {showAddressSuggestions && addressSuggestions.length > 0 && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                            {addressSuggestions.map((sug: any, i: number) => (
                              <div key={i} onClick={() => selectAddress(sug)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: i < addressSuggestions.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', fontSize: 12, color: '#C8C2BB' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,194,187,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                {sug.place_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Preferred / target date</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} style={{ ...cInp, flex: 1 }} />
                        <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} style={cInp}>
                          <option value=''>Time</option>
                          {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','16:00','17:00','17:30','18:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 4 }} onClick={() => setDateFlexible(f => !f)}>
                        <div style={{ width: 15, height: 15, borderRadius: 3, border: `1px solid ${dateFlexible ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, background: dateFlexible ? 'rgba(200,194,187,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{dateFlexible && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                        <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)' }}>Date is flexible</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Estimated shoot duration</label>
                      <select value={shootDuration} onChange={e => setShootDuration(e.target.value)} style={cInp}>
                        <option value=''>Select duration...</option>
                        <option>1–2 hours</option><option>Half day</option><option>Full day</option><option>Multi-day</option><option>Not sure yet</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Final delivery needed by</label>
                      <input type="date" value={deliveryDue} onChange={e => setDeliveryDue(e.target.value)} style={cInp} />
                    </div>
                  </div>

                  {/* Extras */}
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 10 }}>Extras</div>
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Reference links / mood board / brand guidelines</label>
                      <input value={referenceLinks} onChange={e => setReferenceLinks(e.target.value)} placeholder="Paste any links here" style={cInp} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={cLbl}>Estimated budget range (optional)</label>
                      <select value={budgetRange} onChange={e => setBudgetRange(e.target.value)} style={cInp}>
                        <option value=''>Prefer not to say</option>
                        <option>Under $1,000</option><option>$1,000 – $2,000</option><option>$2,000 – $3,000</option><option>$3,000 – $6,000</option><option>$6,000 – $10,000</option><option>$10,000+</option><option>Not sure yet</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                      <label style={cLbl}>Additional notes / special requirements</label>
                      <textarea rows={3} value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Anything else we should know?" style={{ ...cInp, resize: 'vertical', lineHeight: 1.65 }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <AttachmentUploader attachments={bookingAttachments} uploading={uploadingAttachment} onUpload={uploadBookingAttachments} onRemove={removeBookingAttachment} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(1)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={() => commercialRequestValid && setBookingStep(6)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: commercialRequestValid ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: commercialRequestValid ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: commercialRequestValid ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Review & submit →</button>
                  </div>
                </div>
                )
              })()}

              {/* STEP 3: ADD-ONS */}
              {bookingStep === 4 && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 6 }}>Add-ons <span style={{ color: 'rgba(200,194,187,0.2)', fontSize: 10, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>Optional — select any that apply</span></div>
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
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

                  {/* Contact info — always shown first, pre-filled from the account where possible */}
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Listing agent name</label>
                      <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Jessica Moore" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Your email</label>
                      <input type="email" value={clientEmail2} onChange={e => setClientEmail2(e.target.value)} placeholder="your@email.com" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Phone number</label>
                      <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="021 123 4567" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Property specific */}
                  {selectedCat === 'property' && (
                    <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
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

                  {/* Dates — always shown */}
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }}>Preferred shoot date</label>
                      <div style={{ display:'flex', gap:10 }}>
                        <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', flex:1 }} />
                        <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>Preferred time</option>
                          {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','16:00','17:00','17:30','18:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
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
                      <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', display:'block', marginBottom:6 }}>Talent required</label>
                      <textarea rows={3} value={talentDetails} onChange={e => setTalentDetails(e.target.value)} placeholder="Describe the talent needed on shoot (e.g. homeowner walk-through, 2 lifestyle models), and whether you're providing/sourcing the talent yourself or need us to source it" style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.65, width:'100%' }} />
                    </div>
                    <div style={{ marginTop:16 }}>
                      <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', display:'block', marginBottom:6 }}>Talent / lifestyle suggested shot list</label>
                      <textarea rows={6} value={shotList} onChange={e => setShotList(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.75, width:'100%' }} />
                    </div>
                    <div style={{ marginTop:16 }}>
                      <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', display:'block', marginBottom:6 }}>Reference links</label>
                      <input value={referenceLinks} onChange={e => setReferenceLinks(e.target.value)} placeholder="Paste links to properties you'd like to use as a reference for style or music" style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', width:'100%' }} />
                    </div>
                    {(selectedShoot?.name === 'Media Release Package' || selectedAddons.some((a: any) => a.name === 'Twilight Shoot')) && (
                      <div style={{ marginTop:16 }}>
                        <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(200,194,187,0.4)', display:'block', marginBottom:6 }}>Twilight shoot — date & time requested</label>
                        <div style={{ display:'flex', gap:10 }}>
                          <input type="date" value={twilightDate} onChange={e => setTwilightDate(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', flex:1 }} />
                          <select value={twilightTime} onChange={e => setTwilightTime(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none' }}>
                            <option value=''>Preferred time</option>
                            {['16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop:16 }}>
                      <AttachmentUploader attachments={bookingAttachments} uploading={uploadingAttachment} onUpload={uploadBookingAttachments} onRemove={removeBookingAttachment} />
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', marginTop: 8, lineHeight: 1.5 }}>The more information provided the more we have to execute the best content possible.</div>
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
                  <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 16 }}>{selectedCat === 'commercial' ? 'Review your request' : 'Review your booking'}</div>
                  <div style={{ background: 'rgba(61,71,86,0.2)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 8, padding: '18px 22px', marginBottom: 18 }}>
                    {(selectedCat === 'commercial' ? [
                      { key: 'Category', val: 'Commercial & Events' },
                      { key: 'Business / brand', val: clientContactName || '—' },
                      { key: 'Project type', val: projectType || '—' },
                      { key: 'Location', val: propertyAddress || '—' },
                      { key: 'Preferred date', val: dateFlexible ? 'Flexible' : (preferredDate ? preferredDate + (preferredTime ? ' at ' + formatTime12(preferredTime) : '') : 'TBC') },
                      { key: 'Deliverables', val: briefDeliverables.filter(d => d.name).length ? briefDeliverables.filter(d => d.name).map(d => `${d.quantity}x ${d.name}`).join(', ') : 'To be discussed' },
                      { key: 'Budget range', val: budgetRange || 'Not specified' },
                      { key: 'Attachments', val: bookingAttachments.length ? `${bookingAttachments.length} file${bookingAttachments.length !== 1 ? 's' : ''} attached` : 'None' },
                    ] : [
                      { key: 'Category', val: 'Property & Architecture' },
                      { key: 'Shoot package', val: `${selectedShoot?.name} — $${selectedShoot?.price?.toLocaleString()} + GST` },
                      { key: 'Deliverable package', val: `${selectedDel?.name} — $${selectedDel?.price} + GST` },
                      { key: 'Add-ons', val: selectedAddons.length ? selectedAddons.map(a => `${a.name} (+$${a.price})`).join(', ') : 'None' },
                      { key: 'Preferred date', val: 'TBC — confirmed within 24 hrs' },
                      { key: 'Attachments', val: bookingAttachments.length ? `${bookingAttachments.length} file${bookingAttachments.length !== 1 ? 's' : ''} attached` : 'None' },
                    ]).map(({ key, val }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{key}</span>
                        <span style={{ fontSize: 13, color: '#C8C2BB', fontWeight: 500, textAlign: 'right', maxWidth: 360 }}>{val}</span>
                      </div>
                    ))}
                    {selectedCat === 'commercial' ? (
                      <div style={{ paddingTop: 14, marginTop: 4, fontSize: 12, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6 }}>This is quoted per project — we'll review your brief and come back with a custom quote within 24–48 hours.</div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 14, marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB' }}>Total estimate</span>
                        <span style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>${grandTotal.toLocaleString()} + GST</span>
                      </div>
                    )}
                  </div>
                  <div style={{ border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 6, padding: '13px 16px', marginBottom: 16, maxHeight: 96, overflowY: 'auto', fontSize: 11, color: 'rgba(200,194,187,0.35)', lineHeight: 1.7, background: 'rgba(0,0,0,0.2)' }}>
                    <strong style={{ color: 'rgba(200,194,187,0.5)' }}>Terms & Conditions — Example Content Ltd</strong><br /><br />
                    <ol style={{ margin: 0, padding: '0 0 0 16px' }}>
                      <li style={{ marginBottom: 8 }}>A booking request does not constitute a confirmed engagement until Example Content Ltd has confirmed availability and acceptance in writing.</li>
                      <li style={{ marginBottom: 8 }}>Postponement of a scheduled shoot within 24 hours of the confirmed shoot date, for reasons other than adverse weather conditions, will incur a postponement fee of 25% of the total package cost.</li>
                      <li style={{ marginBottom: 8 }}>Cancellation of a confirmed booking within 24 hours of the scheduled shoot date will incur a cancellation fee of 25% of the total package cost.</li>
                      <li style={{ marginBottom: 8 }}>Example Content Ltd retains full intellectual property rights over all footage, photography, and associated media produced during the engagement, and reserves the right to use such material for portfolio, marketing, and promotional purposes without limitation.</li>
                      <li style={{ marginBottom: 8 }}>All quoted prices are exclusive of GST, which will be applied at the prevailing rate.</li>
                      <li style={{ marginBottom: 8 }}>Expected delivery time is 3 business days from the shoot date, unless otherwise stated.</li>
                      <li>Final deliverables will be stored securely in Google Drive for a period of 12 months from the date of delivery, after which all files will be permanently deleted. Clients are advised to download and retain their own copies.</li>
                    </ol></div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20, cursor: 'pointer' }} onClick={() => setTcAccepted(!tcAccepted)}>
                    <div style={{ width: 15, height: 15, borderRadius: 2, border: `1px solid ${tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, background: tcAccepted ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{tcAccepted && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
                    <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.5)', lineHeight: 1.6 }}>I have read and agree to the Terms & Conditions. {selectedCat === 'commercial' ? 'I confirm the above details and authorise Example Content Ltd to prepare a quote based on this request.' : 'I confirm the above package selection and authorise Example Content Ltd to proceed with my booking request.'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                    <button onClick={() => setBookingStep(selectedCat === 'commercial' ? 2 : 5)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                    <button onClick={async () => {
                      if (!tcAccepted) return
                      try {
                        await supabase.from('bookings1').insert([selectedCat === 'commercial' ? {
                          client_id: user?.id,
                          client_name: clientContactName || user?.email,
                          category: selectedCat,
                          shoot_package: projectType,
                          deliverables: briefDeliverables.filter(d => d.name).map(d => `${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}`).join(', '),
                          addons: '',
                          preferred_date: preferredDate || null,
                          preferred_time: preferredTime || null,
                          client_email: clientEmail2 || user?.email,
                          draft_due: null,
                          delivery_due: deliveryDue || null,
                          property_live_date: null,
                          address: propertyAddress,
                          notes: [
                            projectTitle ? 'Project title: ' + projectTitle : '',
                            projectDescription ? 'Project description: ' + projectDescription : '',
                            targetAudience ? 'Target audience: ' + targetAudience : '',
                            keyMessage ? 'Key message: ' + keyMessage : '',
                            talentDetails ? 'Talent / interviews: ' + talentDetails : '',
                            briefDeliverables.filter(d => d.name).length ? 'Deliverables:\n' + briefDeliverables.filter(d => d.name).map(d => `- ${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}${d.formats.length ? ' [' + d.formats.join(', ') + ']' : ''}${d.notes ? ' — ' + d.notes : ''}`).join('\n') : '',
                            shootDuration ? 'Estimated duration: ' + shootDuration : '',
                            dateFlexible ? 'Preferred date is flexible' : '',
                            referenceLinks ? 'References: ' + referenceLinks : '',
                            budgetRange ? 'Budget range: ' + budgetRange : '',
                            bookingNotes ? 'Additional notes: ' + bookingNotes : '',
                          ].filter(Boolean).join('\n\n'),
                          total: '',
                          total_price: null,
                          tc_accepted: true,
                          status: 'pending',
                          attachment_urls: bookingAttachments,
                        } : {
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
                            talentDetails ? 'Talent required: ' + talentDetails : '',
                            shotList.replace(/[•\s]/g, '') ? 'Talent/lifestyle shot list:\n' + shotList : '',
                            referenceLinks ? 'References: ' + referenceLinks : '',
                            (twilightDate || twilightTime) ? 'Twilight shoot requested: ' + (twilightDate ? new Date(twilightDate + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : 'date TBC') + (twilightTime ? ' at ' + formatTime12(twilightTime) : '') : '',
                            clientPhone ? 'Phone: ' + clientPhone : '',
                          ].filter(Boolean).join('\n\n'),
                          total: `$${((selectedShoot?.price || 0) + (selectedDel?.price || 0) + selectedAddons.reduce((s: number, a: any) => s + a.price, 0)).toLocaleString()} + GST`,
                          total_price: (selectedShoot?.price || 0) + (selectedDel?.price || 0) + selectedAddons.reduce((s: number, a: any) => s + a.price, 0),
                          tc_accepted: true,
                          status: 'pending',
                          attachment_urls: bookingAttachments,
                        }])
                      } catch (e) { console.error('Booking save error:', e) }
                      try {
                        await supabase.from('clients1').upsert([{
                          email: clientEmail2 || user?.email,
                          name: clientContactName || '',
                          phone: clientPhone || null,
                          category: selectedCat === 'property' ? 'Property' : 'Commercial',
                        }], { onConflict: 'email', ignoreDuplicates: false })
                      } catch (e) { console.error('Client upsert error:', e) }
                      try {
                        const details = selectedCat === 'commercial' ? [
                          { label: 'Business / brand', value: clientContactName },
                          { label: 'Project type', value: projectType },
                          { label: 'Target audience', value: targetAudience },
                          { label: 'Key message', value: keyMessage },
                          { label: 'Talent / interviews', value: talentDetails },
                          { label: 'Deliverables', value: briefDeliverables.filter(d => d.name).map(d => `${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}`).join(', ') || 'To be discussed' },
                          { label: 'Location', value: propertyAddress },
                          { label: 'Preferred date', value: dateFlexible ? 'Flexible' : (preferredDate ? preferredDate + (preferredTime ? ' at ' + formatTime12(preferredTime) : '') : 'TBC') },
                          { label: 'Estimated duration', value: shootDuration },
                          { label: 'Budget range', value: budgetRange || 'Not specified' },
                          { label: 'Reference links', value: referenceLinks },
                          { label: 'Description', value: projectDescription },
                          { label: 'Additional notes', value: bookingNotes },
                          { label: 'Attachments', value: bookingAttachments.map(a => `${a.name}: ${a.url}`).join('\n') },
                        ] : [
                          { label: 'Listing agent', value: clientContactName },
                          { label: 'Package', value: selectedShoot?.name ? `${selectedShoot.name} — $${selectedShoot.price?.toLocaleString()} + GST` : '' },
                          { label: 'Deliverables', value: selectedDel?.name },
                          { label: 'Add-ons', value: selectedAddons.length ? selectedAddons.map(a => a.name).join(', ') : 'None' },
                          { label: 'Address', value: propertyAddress },
                          { label: 'Preferred date', value: preferredDate ? preferredDate + (preferredTime ? ' at ' + formatTime12(preferredTime) : '') : 'TBC' },
                          { label: 'Notes', value: bookingNotes },
                          { label: 'Attachments', value: bookingAttachments.map(a => `${a.name}: ${a.url}`).join('\n') },
                        ]
                        await fetch('/api/notify-booking', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            category: selectedCat,
                            clientName: clientContactName || user?.email,
                            clientEmail: clientEmail2 || user?.email,
                            title: selectedCat === 'commercial' ? (projectTitle || projectType) : propertyAddress,
                            details: details.filter(d => d.value),
                          }),
                        })
                      } catch (e) { console.error('Notify-booking error:', e) }
                      setBookingStep(7)
                    }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: tcAccepted ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: tcAccepted ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: tcAccepted ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>{selectedCat === 'commercial' ? 'Submit request →' : 'Submit booking request →'}</button>
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
                    <button onClick={() => { setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress(''); setProjectType(''); setProjectTitle(''); setProjectDescription(''); setTargetAudience(''); setKeyMessage(''); setTalentDetails(''); setBriefDeliverables([{ id: '1', name: '', quantity: 1, duration: '', formats: [], notes: '' }]); setDateFlexible(false); setShootDuration(''); setReferenceLinks(''); setBudgetRange(''); setBookingAttachments([]) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Book another shoot</button>
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
          const deliveredProjects = allClientProjects.filter((p: any) => p.stage === 'Awaiting Confirmation' || p.stage === 'Completed').sort((a: any, b: any) => new Date(b.delivery_due || b.created_at).getTime() - new Date(a.delivery_due || a.created_at).getTime())
          const pendingBookings = clientBookings.filter((b: any) => b.status === 'pending' || b.status === 'date_proposed' || b.status === 'alt_requested' || (b.status === 'confirmed' && !b.project_id))
          // Full shoot history, regardless of archived/invoiced status — a client's
          // own record of past shoots should never shrink just because the studio
          // invoiced the project.
          const PREVIOUS_PAGE_SIZE = 25
          const previousProjects = allClientProjects.filter((p: any) => p.shoot_date && new Date(p.shoot_date) < now).sort((a: any, b: any) => new Date(b.shoot_date).getTime() - new Date(a.shoot_date).getTime())
          const previousTotalPages = Math.max(1, Math.ceil(previousProjects.length / PREVIOUS_PAGE_SIZE))
          const previousPageClamped = Math.min(previousShootsPage, previousTotalPages)
          const previousPageItems = previousProjects.slice((previousPageClamped - 1) * PREVIOUS_PAGE_SIZE, previousPageClamped * PREVIOUS_PAGE_SIZE)
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
                      {pendingBookings.map((b: any, i: number) => {
                        const isLast = i === pendingBookings.length - 1
                        if (b.status === 'date_proposed') {
                          return (
                            <div key={b.id} style={{ padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
                                <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(100,150,220,0.08)', border:'0.5px solid rgba(100,150,220,0.2)', borderRadius:5, padding:'10px 4px' }}>
                                  <IconCalendar size={16} style={{ color: 'rgba(100,150,220,0.85)' }} />
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                  <div style={{ fontSize:11, color:'rgba(100,150,220,0.9)' }}>Proposed: {new Date(b.proposed_date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'})} · {formatTime12(b.proposed_start_time)}{b.proposed_end_time ? ' – ' + formatTime12(b.proposed_end_time) : ''}</div>
                                </div>
                                <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,150,220,0.12)', color:'rgba(100,150,220,0.9)', border:'0.5px solid rgba(100,150,220,0.25)' }}>Time proposed</span>
                              </div>
                              {altTimeBookingId === b.id ? (
                                <div style={{ paddingLeft:56 }}>
                                  <textarea value={altTimeMessage} onChange={e => setAltTimeMessage(e.target.value)} placeholder="Optional — let us know what times work better" rows={2} style={{ width:'100%', background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'8px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', marginBottom:8 }} />
                                  <div style={{ display:'flex', gap:8 }}>
                                    <button onClick={() => { setAltTimeBookingId(null); setAltTimeMessage('') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                                    <button disabled={respondingBookingId === b.id} onClick={() => submitAltTimeRequest(b)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background: respondingBookingId === b.id ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: respondingBookingId === b.id ? 'rgba(200,194,187,0.3)' : '#111', border:'none', cursor: respondingBookingId === b.id ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit' }}>{respondingBookingId === b.id ? 'Sending...' : 'Send request'}</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display:'flex', gap:8, paddingLeft:56 }}>
                                  <button disabled={respondingBookingId === b.id} onClick={() => confirmProposedTime(b)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background: respondingBookingId === b.id ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: respondingBookingId === b.id ? 'rgba(200,194,187,0.3)' : '#111', border:'none', cursor: respondingBookingId === b.id ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit' }}>{respondingBookingId === b.id ? 'Saving...' : 'Confirm this time'}</button>
                                  <button disabled={respondingBookingId === b.id} onClick={() => { setAltTimeBookingId(b.id); setAltTimeMessage('') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Request another time</button>
                                </div>
                              )}
                            </div>
                          )
                        }
                        if (b.status === 'alt_requested') {
                          return (
                            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                              <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(160,100,220,0.08)', border:'0.5px solid rgba(160,100,220,0.2)', borderRadius:5, padding:'10px 4px' }}>
                                <IconClock size={16} style={{ color: 'rgba(160,100,220,0.85)' }} />
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Waiting on Example Content for a new time{b.client_response_message ? ' · "' + b.client_response_message + '"' : ''}</div>
                              </div>
                              <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(160,100,220,0.12)', color:'rgba(160,100,220,0.9)', border:'0.5px solid rgba(160,100,220,0.25)' }}>Awaiting new time</span>
                            </div>
                          )
                        }
                        if (b.status === 'confirmed') {
                          return (
                            <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                              <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(100,200,130,0.08)', border:'0.5px solid rgba(100,200,130,0.2)', borderRadius:5, padding:'6px 4px' }}>
                                <div style={{ fontSize:16, opacity:0.6 }}>✓</div>
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{b.proposed_date ? new Date(b.proposed_date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'}) + (b.proposed_start_time ? ' · ' + formatTime12(b.proposed_start_time) : '') + ' — ' : ''}We're setting up your project</div>
                              </div>
                              <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,200,130,0.12)', color:'rgba(100,200,130,0.9)', border:'0.5px solid rgba(100,200,130,0.25)' }}>Confirmed</span>
                            </div>
                          )
                        }
                        return (
                          <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                            <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(210,175,80,0.08)', border:'0.5px solid rgba(210,175,80,0.2)', borderRadius:5, padding:'10px 4px' }}>
                              <IconClock size={16} style={{ color: 'rgba(210,175,80,0.8)' }} />
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                              <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{b.shoot_package} {b.preferred_date ? '· ' + new Date(b.preferred_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                            </div>
                            <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(210,175,80,0.12)', color:'rgba(210,175,80,0.9)', border:'0.5px solid rgba(210,175,80,0.25)' }}>Pending</span>
                          </div>
                        )
                      })}
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
                            <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(100,150,220,0.12)', color:'rgba(100,150,220,0.9)', border:'0.5px solid rgba(100,150,220,0.2)' }}>{stageLabel(p.stage)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                {/* PREVIOUS SHOOTS */}
                {previousProjects.length > 0 && (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)' }}>Previous shoots</div>
                      <div style={{ fontSize:11, color:'rgba(200,194,187,0.3)' }}>{previousProjects.length} total</div>
                    </div>
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden' }}>
                      {previousPageItems.map((p: any, i: number) => {
                        const d = new Date(p.shoot_date+'T12:00:00')
                        return (
                          <div key={p.id} onClick={() => setSelectedProject(p)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < previousPageItems.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none', cursor:'pointer' }}>
                            <div style={{ width:42, flexShrink:0, textAlign:'center', background:'rgba(61,71,86,0.3)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:5, padding:'6px 4px' }}>
                              <div style={{ fontSize:16, fontWeight:600, color:'#fff', lineHeight:1 }}>{d.getDate()}</div>
                              <div style={{ fontSize:9, color:'rgba(200,194,187,0.4)', textTransform:'uppercase' }}>{d.toLocaleDateString('en-NZ',{month:'short',year:'numeric'})}</div>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{p.title}</div>
                              <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{p.address?.split(',')[0]}</div>
                            </div>
                            <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(200,194,187,0.08)', color:'rgba(200,194,187,0.5)', border:'0.5px solid rgba(200,194,187,0.15)' }}>{stageLabel(p.stage)}</span>
                          </div>
                        )
                      })}
                    </div>
                    {previousTotalPages > 1 && (
                      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:14, marginTop:14 }}>
                        <button disabled={previousPageClamped <= 1} onClick={() => setPreviousShootsPage(p => Math.max(1, p - 1))} style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color: previousPageClamped <= 1 ? 'rgba(200,194,187,0.15)' : 'rgba(200,194,187,0.5)', background:'transparent', cursor: previousPageClamped <= 1 ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>← Prev</button>
                        <span style={{ fontSize:11, color:'rgba(200,194,187,0.35)' }}>Page {previousPageClamped} of {previousTotalPages}</span>
                        <button disabled={previousPageClamped >= previousTotalPages} onClick={() => setPreviousShootsPage(p => Math.min(previousTotalPages, p + 1))} style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color: previousPageClamped >= previousTotalPages ? 'rgba(200,194,187,0.15)' : 'rgba(200,194,187,0.5)', background:'transparent', cursor: previousPageClamped >= previousTotalPages ? 'not-allowed' : 'pointer', fontFamily:'inherit' }}>Next →</button>
                      </div>
                    )}
                  </div>
                )}
                {/* DELIVERED */}
                {deliveredProjects.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)', marginBottom:12 }}>Delivered</div>
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden' }}>
                      {deliveredProjects.map((p: any, i: number) => (
                        <div key={p.id} onClick={() => { setLibraryProject(p); setActiveView('library') }} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < deliveredProjects.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none', cursor:'pointer' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{p.title}</div>
                            <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{p.address?.split(',')[0]}</div>
                          </div>
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
          const projectsWithDrive = allClientProjects.filter((p: any) => p.drive_url)
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
                    <div className="ec-grid-resp" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
                      {projectsWithDrive.map((p: any) => (
                        <div key={p.id} onClick={() => setLibraryProject(p)} style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, padding:'20px 22px', cursor:'pointer', display:'flex', alignItems:'center', gap:16 }} onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(200,194,187,0.2)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(200,194,187,0.09)')}>
                          <ProjectThumbSquare project={p} />
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
                  <DriveFolder project={libraryProject} clientEmail={user?.email} clientName={clientProfile?.name} />
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
                        <div style={{ width:36, height:36, borderRadius:5, background:'rgba(61,71,86,0.4)', border:'0.5px solid rgba(200,194,187,0.09)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconDocument size={17} style={{ color: 'rgba(200,194,187,0.5)' }} /></div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{brief.project_name || 'Untitled brief'}</div>
                          <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Received {new Date(brief.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'})}</div>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                          <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:sc.b, color:sc.c }}>{brief.status}</span>
                          <button onClick={() => setSelectedBrief(brief)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Open</button>
                          {brief.status === 'sent' && (
                            <button onClick={async () => {
                              await supabase.from('briefs').update({ status:'approved', approved_at: new Date().toISOString() }).eq('id', brief.id)
                              if (brief.project_id) await supabase.from('projects1').update({ client_confirmed:true, confirmed_at:new Date().toISOString(), stage:'Pre-Production', progress:10 }).eq('id', brief.project_id).eq('stage','Enquiry')
                              setClientBriefs(p => p.map(b => b.id===brief.id ? {...b, status:'approved'} : b))
                            }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background:'#C8C2BB', color:'#111', border:'none', cursor:'pointer', fontWeight:500, fontFamily:'inherit' }}>Approve</button>
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
                            {d.shootStartTime && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Time</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{formatTime12(d.shootStartTime)}{d.shootEndTime?' – '+formatTime12(d.shootEndTime):''}</div></div>}
                            {d.draftDue && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Draft Due</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.draftDue}</div></div>}
                            {d.finalsDue && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Finals Due</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.finalsDue}</div></div>}
                            {d.locations && <div><div style={{ fontSize:9, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:4 }}>Location</div><div style={{ fontSize:14, color:'#C8C2BB', fontWeight:600 }}>{d.locations.split(',')[0]}</div></div>}
                          </div>
                        </div>
                        {/* SCOPE SECTION */}
                        <div style={{ padding:'32px 40px', borderBottom:'0.5px solid rgba(200,194,187,0.09)' }}>
                          <div style={{ fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(200,194,187,0.35)', marginBottom:6 }}>The Scope</div>
                          <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:20 }}>{(d.jobType||'').toUpperCase()}</div>
                          <div className="ec-grid-resp" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32, marginBottom:24 }}>
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
                                  if (selectedBrief.project_id) await supabase.from('projects1').update({ client_confirmed:true, confirmed_at:new Date().toISOString(), stage:'Pre-Production', progress:10 }).eq('id', selectedBrief.project_id).eq('stage','Enquiry')
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
                {activeView === 'invoices' && (() => {
          const totalBooked = allClientProjects.length
          const totalSpend = allClientProjects.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
          const avgSpend = totalBooked > 0 ? totalSpend / totalBooked : 0
          return (
          <div>
            <div style={{ padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Invoices</div>
            </div>
            <div style={{ padding: 28 }}>
              {totalBooked > 0 && (
                <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Shoots booked</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#C8C2BB' }}>{totalBooked}</div>
                  </div>
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 7, padding: '16px 18px' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Total spend</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(100,200,130,0.9)' }}>${totalSpend.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 8 }}>Average per shoot</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#C8C2BB' }}>${Math.round(avgSpend).toLocaleString()}</div>
                  </div>
                </div>
              )}
              {clientInvoices.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 50 }}>
                  <IconReceipt size={36} style={{ marginBottom: 16, color: 'rgba(200,194,187,0.3)' }} />
                  <div style={{ fontSize: 14, color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>No invoices yet</div>
                  <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>Invoice and payment history will appear here once we send one.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {clientInvoices.map((invoice: any) => {
                    const sc = invoice.status === 'paid' ? { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' } : { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)' }
                    const isOpen = openInvoiceId === invoice.id
                    const lineItems = allClientProjects.filter((p: any) => p.invoice_id === invoice.id)
                    return (
                      <div key={invoice.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                        <div onClick={() => setOpenInvoiceId(isOpen ? null : invoice.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 5, background: 'rgba(61,71,86,0.4)', border: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconReceipt size={17} style={{ color: 'rgba(200,194,187,0.5)' }} /></div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>Invoice #{invoice.id.slice(0, 8).toUpperCase()}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{invoice.sent_at ? new Date(invoice.sent_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>${(invoice.total || 0).toLocaleString()}</div>
                          <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: sc.bg, color: sc.color }}>{invoice.status}</span>
                          <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.3)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
                        </div>
                        {isOpen && (
                          <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', padding: '28px 32px', background: 'linear-gradient(135deg, #14181F 0%, #0E1014 100%)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                              <div>
                                <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.5)', marginBottom: 6 }}>Example Content</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Invoice #{invoice.id.slice(0, 8).toUpperCase()}</div>
                              </div>
                              <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 11px', borderRadius: 3, background: sc.bg, color: sc.color, border: `0.5px solid ${sc.color}44` }}>{invoice.status}</span>
                            </div>
                            <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                              <div>
                                <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>Billed to</div>
                                <div style={{ fontSize: 13, color: '#C8C2BB' }}>{invoice.client_name || clientProfile?.name}</div>
                                <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{invoice.client_email}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{invoice.status === 'paid' ? 'Paid' : 'Sent'}</div>
                                <div style={{ fontSize: 13, color: '#C8C2BB' }}>{(invoice.status === 'paid' ? invoice.paid_at : invoice.sent_at) ? new Date(invoice.status === 'paid' ? invoice.paid_at : invoice.sent_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
                              </div>
                            </div>
                            {lineItems.length > 0 && (
                              <div style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0 8px', borderBottom: '0.5px solid rgba(200,194,187,0.12)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>
                                  <span>Shoot</span><span>Amount</span>
                                </div>
                                {lineItems.map((p: any) => (
                                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                                    <div>
                                      <div style={{ fontSize: 13, color: '#C8C2BB', marginBottom: 2 }}>{p.title}</div>
                                      {p.shoot_date && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)' }}>{new Date(p.shoot_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#C8C2BB' }}>${(p.amount || 0).toLocaleString()}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 'auto', width: 220 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}><span>Subtotal</span><span>${(invoice.subtotal || 0).toLocaleString()}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(200,194,187,0.5)' }}><span>GST</span><span>${(invoice.gst || 0).toLocaleString()}</span></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#fff', paddingTop: 8, borderTop: '0.5px solid rgba(200,194,187,0.15)' }}><span>Total</span><span>${(invoice.total || 0).toLocaleString()}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          )
        })()}

      </div>

      {/* PROJECT DETAIL MODAL */}
      {selectedProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setSelectedProject(null); setChangeRequest(''); setChangeRequestSent(false) } }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', position: 'sticky', top: 0, background: '#1A1F28', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{selectedProject.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{stageLabel(selectedProject.stage)}</div>
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
              <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
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

              {/* DETAILS PROVIDED */}
              {selectedProject.general_notes && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Details you provided</div>
                  <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.75)', lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: '10px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>{selectedProject.general_notes}</div>
                </div>
              )}

              {/* ATTACHMENTS */}
              {selectedProject.attachment_urls && selectedProject.attachment_urls.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Attachments</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedProject.attachment_urls.map((a: any, ai: number) => (
                      <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#C8C2BB', textDecoration: 'none', padding: '8px 12px', background: 'rgba(200,194,187,0.04)', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.08)' }}>
                        <IconPaperclip size={13} style={{ color: 'rgba(200,194,187,0.4)', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* DRIVE LINK */}
              {selectedProject.drive_url && (
                <div style={{ marginBottom: 20 }}>
                  <a href={selectedProject.drive_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'rgba(100,200,130,0.06)', border: '0.5px solid rgba(100,200,130,0.2)', borderRadius: 6, textDecoration: 'none' }}>
                    <IconFolder size={19} style={{ color: 'rgba(100,200,130,0.85)', flexShrink: 0 }} />
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

      {/* CONTENT DELIVERED POPUP — shows before the generic notifications list */}
      {deliveryPopup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(100,200,130,0.25)', borderRadius: 14, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }}>
            <DeliveryThumbBanner project={deliveryPopup.project} />
            <div style={{ padding: '22px 26px 26px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(100,200,130,0.85)', marginBottom: 6, fontWeight: 600 }}>Delivered</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Your content is ready!</div>
              <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.6)', lineHeight: 1.6, marginBottom: 22 }}>{deliveryPopup.notif.message}</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={async () => {
                  await supabase.from('notifications').update({ read: true }).eq('id', deliveryPopup.notif.id)
                  if (deliveryPopup.project) { setLibraryProject(deliveryPopup.project); setActiveView('library') }
                  setDeliveryPopup(null)
                  if (notifications.length > 0) setShowNotifications(true)
                }} style={{ flex: 1, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 16px', borderRadius: 6, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>View now →</button>
                <button onClick={async () => {
                  await supabase.from('notifications').update({ read: true }).eq('id', deliveryPopup.notif.id)
                  setDeliveryPopup(null)
                  if (notifications.length > 0) setShowNotifications(true)
                }} style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 16px', borderRadius: 6, background: 'transparent', color: 'rgba(200,194,187,0.5)', border: '0.5px solid rgba(200,194,187,0.15)', cursor: 'pointer', fontFamily: 'inherit' }}>Later</button>
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
              {notifications.map((n: any, i: number) => {
                const [tone, toneBg] = n.type === 'booking_confirmed' ? ['rgba(100,200,130,0.9)', 'rgba(100,200,130,0.15)']
                  : n.type === 'date_proposed' ? ['rgba(210,90,90,0.9)', 'rgba(210,90,90,0.15)']
                  : ['rgba(210,175,80,0.9)', 'rgba(210,175,80,0.15)']
                return (
                  <div key={n.id} style={{ padding: '18px 24px', borderBottom: i < notifications.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: toneBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {n.type === 'booking_confirmed' ? <span style={{ fontSize: 16, color: tone }}>✓</span> : <IconCalendar size={16} style={{ color: tone }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: tone, marginBottom: 5 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)', lineHeight: 1.7 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('en-NZ',{day:'numeric',month:'long',year:'numeric'})}</div>
                    </div>
                  </div>
                )
              })}
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
