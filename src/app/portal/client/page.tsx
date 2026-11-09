'use client'
import React from 'react'
import { useEffect, useState, useRef } from 'react'
import { supabase, ensureClientProfile } from '@/lib/supabase'
import { sendTeamInvite, removeTeamMember, revokeTeamInvite } from '@/lib/clientTeam'
import { resizeImageToDataUrl } from '@/lib/imageResize'
import { formatTime12, localDateKey, addBusinessDays } from '@/lib/time'
import { stageLabel } from '@/lib/stages'
import { parseLabeledNotes } from '@/lib/parseNotes'
import { buildShootIcs, downloadIcsFile } from '@/lib/ics'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/public/LoadingScreen'

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
function IconUsers({ size = 17, color, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ color, ...style }} {...ICON_BASE}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.3 20c.6-3.4 3-5.5 5.7-5.5s5.1 2.1 5.7 5.5" />
      <path d="M15.5 5.3c1.4.4 2.4 1.7 2.4 3.2 0 1.5-1 2.8-2.4 3.2" />
      <path d="M16.3 14.7c2.3.5 4 2.4 4.4 5.3" />
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

// Dashboard "Recent deliveries" card — matches the hover-preview feel of the
// portfolio site's Work page cards: a static thumbnail by default, with a
// looping autoplay video swapped in (crossfaded) only once actually hovered,
// so a whole row of these doesn't mean a row of simultaneously-loading
// players. Drive's own preview iframe is the only thing that can embed its
// video without a signed streaming URL, so autoplay here rides on whatever
// Drive's embed honours for ?autoplay=1&mute=1 — less guaranteed than the
// Vimeo version on the public site, but the static thumbnail underneath
// means a card never looks broken even if a given browser/file won't
// autoplay it.
// A lightweight click-and-drag scroller for the delivery carousel, for mice
// without horizontal scroll — trackpads and touch already scroll it natively
// via the plain overflow-x. Distinguishes a drag from a click by distance
// moved, so dragging never also fires the card's onClick.
function DragScrollRow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const dragState = React.useRef<{ down: boolean; moved: boolean; startX: number; startScroll: number }>({ down: false, moved: false, startX: 0, startScroll: 0 })

  function onMouseDown(e: React.MouseEvent) {
    if (!ref.current) return
    dragState.current = { down: true, moved: false, startX: e.pageX, startScroll: ref.current.scrollLeft }
  }
  function onMouseMove(e: React.MouseEvent) {
    const d = dragState.current
    if (!d.down || !ref.current) return
    const delta = e.pageX - d.startX
    if (Math.abs(delta) > 4) d.moved = true
    ref.current.scrollLeft = d.startScroll - delta
  }
  function endDrag() { dragState.current.down = false }
  // A drag that actually moved the row shouldn't also trigger whatever the
  // mouseup lands on (a card's onClick) — swallow just that one click.
  function onClickCapture(e: React.MouseEvent) { if (dragState.current.moved) { e.stopPropagation(); e.preventDefault() } }

  function scrollBy(amount: number) { ref.current?.scrollBy({ left: amount, behavior: 'smooth' }) }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={onClickCapture}
        className="ec-drag-scroll"
        style={{ display: 'flex', gap: 14, overflowX: 'auto', scrollSnapType: 'x proximity', cursor: dragState.current.down ? 'grabbing' : 'grab', ...style }}
      >
        {children}
      </div>
      <button onClick={() => scrollBy(-280)} aria-label="Scroll left" style={{ position: 'absolute', top: '50%', left: -14, transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>‹</button>
      <button onClick={() => scrollBy(280)} aria-label="Scroll right" style={{ position: 'absolute', top: '50%', right: -14, transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>›</button>
    </div>
  )
}

// Shown once, the first time a new account lands on the dashboard after
// signing up (see the ec_welcome_pending localStorage flag set by the
// signup page and checked in this page's session-load effect — it has to
// be checked here rather than on the signup page itself, since the normal
// case is email confirmation, meaning that first real landing happens on
// a completely separate page load days/minutes later). Confetti fires
// once on mount; the heading's second word flicks between two variants
// every ~2.5s for a bit of personality.
function WelcomeScreen({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  const [confetti, setConfetti] = React.useState<{ id: number; dx: number; dy: number; rot: number; color: string; fired: boolean }[]>([])
  const [wordIndex, setWordIndex] = React.useState(0)
  const words = ['Example Content', 'the Team']

  React.useEffect(() => {
    const colors = ['#C8C2BB', '#D2AF50', '#64C882', '#ffffff']
    const pieces = Array.from({ length: 32 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 32 + Math.random() * 0.4
      const dist = 160 + Math.random() * 200
      return { id: i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist - 60, rot: Math.random() * 540, color: colors[i % colors.length], fired: false }
    })
    setConfetti(pieces)
    const t = setTimeout(() => setConfetti(p => p.map(c => ({ ...c, fired: true }))), 30)
    const cycle = setInterval(() => setWordIndex(i => (i + 1) % words.length), 2500)
    return () => { clearTimeout(t); clearInterval(cycle) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,16,20,0.92)', backdropFilter: 'blur(3px)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {confetti.map(c => (
        <div key={c.id} style={{ position: 'absolute', top: '50%', left: '50%', width: 8, height: 14, background: c.color, opacity: c.fired ? 0 : 1, transform: c.fired ? `translate(${c.dx}px, ${c.dy + 260}px) rotate(${c.rot}deg)` : 'translate(0,0) rotate(0deg)', transition: 'transform 1.1s cubic-bezier(.17,.67,.35,1), opacity 1.1s ease' }} />
      ))}
      <div style={{ textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 14 }}>{name}</div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em', display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: '0.3em' }}>
          Welcome to <span style={{ position: 'relative', display: 'inline-block' }}>{words[wordIndex]}</span>
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(200,194,187,0.5)', margin: '0 0 28px' }}>Your account's ready — let's get your first shoot booked.</p>
        <button onClick={onDismiss} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '12px 28px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Continue to dashboard →</button>
      </div>
    </div>
  )
}

function DriveThumb({ project, onClick }: { project: any; onClick: () => void }) {
  const [firstFile, setFirstFile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [hovered, setHovered] = React.useState(false)
  const [playerReady, setPlayerReady] = React.useState(false)

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
  const hasVideo = !!firstFile && isVideo(firstFile.mimeType)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); setPlayerReady(false) }}
      onMouseLeave={() => setHovered(false)}
      style={{
        flexShrink: 0,
        scrollSnapAlign: 'start',
        width: 340,
        background: '#1A1F28',
        border: `0.5px solid ${hovered ? 'rgba(200,194,187,0.3)' : 'rgba(200,194,187,0.09)'}`,
        borderRadius: 9,
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 14px 32px rgba(0,0,0,0.45)' : '0 0 0 rgba(0,0,0,0)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div style={{ aspectRatio: '3/4', background: '#0E1014', position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(200,194,187,0.2)', fontSize: 11 }}>Loading...</div>
        ) : firstFile ? (
          hasVideo ? (
            <>
              <img src={`/api/drive?thumb=${firstFile.id}`} alt={project.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: hovered && playerReady ? 0 : 0.85, transition: 'opacity 0.35s ease 0.2s' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              {hovered && (
                // A real <video> with muted+autoPlay is reliably honoured by
                // every modern browser's autoplay policy — the Drive preview
                // iframe this replaced wasn't (it's Google's own app page, not
                // built to be embedded as a silent background loop), which is
                // why hovering used to play nothing. Streamed through our own
                // Range-aware proxy so it also starts fast instead of waiting
                // on a full download first.
                <video
                  src={`/api/drive/stream?id=${firstFile.id}`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onCanPlay={() => setPlayerReady(true)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: playerReady ? 1 : 0, transition: 'opacity 0.35s ease 0.2s' }}
                />
              )}
              <div style={{ position: 'absolute', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(200,194,187,0.4)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: hovered && playerReady ? 0 : 1, transition: 'opacity 0.2s ease' }}><IconPlay size={14} style={{ marginLeft: 2, color: '#C8C2BB' }} /></div>
            </>
          ) : (
            <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: hovered ? 'scale(1.04)' : 'scale(1)', transition: 'transform 0.4s ease' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <IconFolder size={26} style={{ color: 'rgba(200,194,187,0.25)' }} />
            <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Coming soon</span>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,16,20,0) 55%, rgba(14,16,20,0.85) 100%)', pointerEvents: 'none' }} />
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: 'rgba(100,200,130,0.15)', color: 'rgba(100,200,130,0.9)', border: '0.5px solid rgba(100,200,130,0.3)' }}>Delivered</span>
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.title}</div>
          <div style={{ fontSize: 10.5, color: 'rgba(200,194,187,0.6)' }}>{project.delivery_due ? new Date(project.delivery_due + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
        </div>
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

// A folder tile in the library grid used to just show a generic folder icon
// — gives a real preview instead, pulled from the first video frame or photo
// inside it (descending one level if the folder itself holds only another
// folder), same "find the first real media" logic as DriveThumb etc. above,
// just keyed off a folder id already in hand rather than a project's
// drive_url.
function FolderTileThumb({ folderId }: { folderId: string }) {
  const [firstFile, setFirstFile] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    const isMedia = (f: any) => f.mimeType?.includes('video') || f.mimeType?.includes('image')
    fetch(`/api/drive?folderId=${folderId}`)
      .then(r => r.json())
      .then(async data => {
        const files = data.files || []
        const media = files.find(isMedia)
        if (media) { if (!cancelled) { setFirstFile(media); setLoading(false) }; return }
        const subfolder = files.find((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
        if (subfolder) {
          const res2 = await fetch(`/api/drive?folderId=${subfolder.id}`)
          const data2 = await res2.json()
          if (!cancelled) setFirstFile((data2.files || []).find(isMedia) || null)
        } else if (!cancelled) {
          setFirstFile(null)
        }
        if (!cancelled) setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [folderId])

  const isVideo = (mime: string) => mime?.includes('video')

  if (loading) return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><IconFolder size={32} style={{ color:'rgba(200,194,187,0.3)' }} /></div>
  if (!firstFile) return <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}><IconFolder size={32} style={{ color:'rgba(200,194,187,0.5)' }} /></div>

  return isVideo(firstFile.mimeType) ? (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden', background:'#0a0c10', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <img src={`/api/drive?thumb=${firstFile.id}`} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.6 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
      <IconFolder size={26} style={{ position:'relative', color:'rgba(255,255,255,0.85)', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }} />
    </div>
  ) : (
    <div style={{ width:'100%', height:'100%', position:'relative', overflow:'hidden' }}>
      <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', opacity:0.6 }} onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
      <IconFolder size={26} style={{ position:'absolute', inset:0, margin:'auto', color:'rgba(255,255,255,0.85)', filter:'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }} />
    </div>
  )
}

function DriveFolder({ project, clientEmail, clientName }: { project: any; clientEmail?: string | null; clientName?: string }) {
  const [files, setFiles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [previewFile, setPreviewFile] = React.useState<any>(null)
  const [stack, setStack] = React.useState<{ id: string; name: string }[]>([])
  const [rootFolderId, setRootFolderId] = React.useState<string | null>(null)
  const [selectedFileIds, setSelectedFileIds] = React.useState<Set<string>>(new Set())
  const [feedbackList, setFeedbackList] = React.useState<any[]>([])
  const [feedbackTimestamp, setFeedbackTimestamp] = React.useState('')
  const [feedbackMessage, setFeedbackMessage] = React.useState('')
  // Queued-but-not-sent timestamped notes — lets a client mark up several
  // moments in the clip before sending them all together as one request,
  // rather than firing off a separate notification/email per note.
  const [draftStops, setDraftStops] = React.useState<{ timestamp: string; message: string }[]>([])
  const [submittingFeedback, setSubmittingFeedback] = React.useState(false)
  const [generalFeedbackMessage, setGeneralFeedbackMessage] = React.useState('')
  const [submittingGeneralFeedback, setSubmittingGeneralFeedback] = React.useState(false)
  const [generalFeedbackSent, setGeneralFeedbackSent] = React.useState(false)
  const [feedbackSent, setFeedbackSent] = React.useState(false)

  React.useEffect(() => {
    // Stepping to the next file with the arrow keys/buttons shouldn't carry
    // over whatever was still sitting in the previous file's compose box.
    setFeedbackTimestamp('')
    setFeedbackMessage('')
    setDraftStops([])
    if (!previewFile) { setFeedbackList([]); return }
    supabase.from('video_feedback').select('*').eq('file_id', previewFile.id).order('timestamp_seconds', { ascending: true })
      .then(({ data }) => setFeedbackList(data || []))
  }, [previewFile?.id])

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

  // Queues the current timestamp + message as another stop rather than
  // sending immediately, so a client can mark up several moments before
  // sending them as one request.
  function addDraftStop() {
    if (!feedbackMessage.trim()) return
    setDraftStops(p => [...p, { timestamp: feedbackTimestamp.trim() || '0:00', message: feedbackMessage.trim() }])
    setFeedbackTimestamp('')
    setFeedbackMessage('')
  }

  function removeDraftStop(index: number) {
    setDraftStops(p => p.filter((_, i) => i !== index))
  }

  async function submitFeedback() {
    if (!clientEmail || !previewFile) return
    // Whatever's still sitting in the inputs counts as one more stop, so
    // the common case of "just one note" doesn't need an extra click of
    // Add before Send works.
    const stops = feedbackMessage.trim()
      ? [...draftStops, { timestamp: feedbackTimestamp.trim() || '0:00', message: feedbackMessage.trim() }]
      : draftStops
    if (stops.length === 0) return
    setSubmittingFeedback(true)
    // Every row in this batch shares the exact same created_at, which is
    // how the studio side recognises them as one change request (several
    // stops sent together) instead of unrelated individual notes.
    const batchCreatedAt = new Date().toISOString()
    const rows = stops.map(s => ({
      project_id: project.id,
      file_id: previewFile.id,
      file_name: previewFile.name,
      client_email: clientEmail,
      client_name: clientName || clientEmail,
      timestamp_seconds: parseTimestamp(s.timestamp),
      message: s.message,
      created_at: batchCreatedAt,
    }))
    const { data, error } = await supabase.from('video_feedback').insert(rows).select()
    if (!error && data) {
      setFeedbackList(p => [...p, ...data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
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
            stops: stops.map(s => ({ timestampSeconds: parseTimestamp(s.timestamp), message: s.message })),
          }),
        })
      } catch (e) { console.error('Feedback notify error:', e) }
      setDraftStops([])
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
    const match = project.drive_url.match(/folders\/([a-zA-Z0-9_-]+)/) || project.drive_url.match(/id=([a-zA-Z0-9_-]+)/)
    setRootFolderId(match ? match[1] : null)
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

  // Lets the preview step through every file in the current folder — arrow
  // keys or the on-screen arrows — instead of having to close the modal and
  // click into the next file from the grid every time.
  const navigableFiles = files.filter(f => !isFolder(f.mimeType))
  function previewIndex() { return navigableFiles.findIndex(f => f.id === previewFile?.id) }
  function previewStep(delta: number) {
    const i = previewIndex()
    if (i === -1) return
    const next = navigableFiles[i + delta]
    if (next) setPreviewFile(next)
  }
  React.useEffect(() => {
    if (!previewFile) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') previewStep(1)
      else if (e.key === 'ArrowLeft') previewStep(-1)
      else if (e.key === 'Escape') setPreviewFile(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewFile, files])

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
      {files.length > 0 && (() => {
        const currentFolderId = stack.length > 0 ? stack[stack.length - 1].id : rootFolderId
        const currentFolderName = stack.length > 0 ? stack[stack.length - 1].name : project.title
        return (
          <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:10, marginBottom:12, minHeight:28, flexWrap: 'wrap' as const }}>
            {selectedFileIds.size > 0 && (
              <>
                <span style={{ fontSize:11, color:'rgba(200,194,187,0.5)' }}>{selectedFileIds.size} selected</span>
                <button onClick={() => setSelectedFileIds(new Set())} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 12px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.12)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Clear</button>
                <button onClick={downloadSelected} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, background:'#C8C2BB', color:'#111', border:'none', cursor:'pointer', fontFamily:'inherit', fontWeight:500 }}>Download selected ({selectedFileIds.size})</button>
              </>
            )}
            {currentFolderId && (
              <a
                href={`/api/drive/download-all?folderId=${currentFolderId}&name=${encodeURIComponent(currentFolderName)}`}
                style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.6)', background:'transparent', cursor:'pointer', fontFamily:'inherit', textDecoration:'none', fontWeight:500 }}
              >
                Download all (.zip)
              </a>
            )}
          </div>
        )
      })()}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:14 }}>
        {files.map((file: any) => (
          <div key={file.id} style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', cursor:'pointer' }} onClick={() => { if (isFolder(file.mimeType)) openFolder(file); else setPreviewFile(file) }}>
            {/* A uniform square thumbnail regardless of source orientation keeps
                the grid clean — vertical and horizontal media next to each
                other no longer produce mismatched tile widths/heights and the
                gaps that came with them. The "Vertical" badge below still
                tells you the actual format; the full aspect ratio is honoured
                in the preview modal when you open the file. */}
            <div style={{ aspectRatio:'1/1', background:'#0E1014', position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {isFolder(file.mimeType) ? (
                <FolderTileThumb folderId={file.id} />
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
      {/* General feedback sits below the files, not above — this is an
          occasional, optional action, not something to force in front of
          the content every time the library's opened. */}
      <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden', marginTop:24, padding:'14px 18px' }}>
        <div style={{ fontSize:11, fontWeight:500, color:'#C8C2BB', marginBottom:8 }}>Have feedback on this project overall?</div>
        <div style={{ display:'flex', gap:8 }}>
          <textarea value={generalFeedbackMessage} onChange={e => setGeneralFeedbackMessage(e.target.value)} placeholder="e.g. Can we get a warmer grade across the whole set, and swap the intro clip?" rows={2} style={{ flex:1, background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.12)', borderRadius:4, padding:'8px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical' as const }} />
          <button onClick={submitGeneralFeedback} disabled={submittingGeneralFeedback || !generalFeedbackMessage.trim()} style={{ fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'9px 14px', borderRadius:3, background: generalFeedbackSent ? 'rgba(100,200,130,0.15)' : '#C8C2BB', color: generalFeedbackSent ? 'rgba(100,200,130,0.9)' : '#111', border: generalFeedbackSent ? '0.5px solid rgba(100,200,130,0.3)' : 'none', cursor: submittingGeneralFeedback || !generalFeedbackMessage.trim() ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit', flexShrink:0, opacity: !generalFeedbackMessage.trim() && !submittingGeneralFeedback ? 0.5 : 1 }}>
            {submittingGeneralFeedback ? 'Sending...' : generalFeedbackSent ? '✓ Sent' : 'Send'}
          </button>
        </div>
      </div>
      {/* PREVIEW MODAL — feedback sits beside a vertical video (both are tall,
          so a side-by-side layout uses the space a lot better than stacking a
          wide feedback bar under a narrow 9:16 player), below a horizontal one. */}
      {previewFile && (() => {
        const isVertical = !!(previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width))
        return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.95)', zIndex:300, overflowY:'auto' }} onClick={() => setPreviewFile(null)}>
          <div style={{ position:'fixed', top:20, right:20, display:'flex', gap:12, alignItems:'center', zIndex:10 }} onClick={e => e.stopPropagation()}>
            {navigableFiles.length > 1 && <span style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>{previewIndex() + 1} / {navigableFiles.length}</span>}
            <a href={`/api/drive/download?id=${previewFile.id}&name=${encodeURIComponent(previewFile.name)}`} download={previewFile.name} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'8px 16px', borderRadius:3, background:'#C8C2BB', color:'#111', textDecoration:'none', fontFamily:'inherit', fontWeight:500 }}>Download</a>
            <button onClick={() => setPreviewFile(null)} style={{ fontSize:24, color:'rgba(200,194,187,0.5)', background:'transparent', border:'none', cursor:'pointer' }}>×</button>
          </div>
          {/* Click left/right, or use arrow keys, to step through every file in
              this folder without closing the preview each time. */}
          {previewIndex() > 0 && (
            <button onClick={e => { e.stopPropagation(); previewStep(-1) }} aria-label="Previous file" style={{ position:'fixed', left:20, top:'50%', transform:'translateY(-50%)', zIndex:10, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'0.5px solid rgba(200,194,187,0.2)', color:'#C8C2BB', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          )}
          {previewIndex() < navigableFiles.length - 1 && (
            <button onClick={e => { e.stopPropagation(); previewStep(1) }} aria-label="Next file" style={{ position:'fixed', right:20, top:'50%', transform:'translateY(-50%)', zIndex:10, width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'0.5px solid rgba(200,194,187,0.2)', color:'#C8C2BB', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
          )}
          <div style={{ maxWidth: isVertical ? 1180 : 920, margin:'0 auto', padding:'70px 20px 60px', display:'flex', flexDirection: isVertical ? 'row' : 'column', alignItems: isVertical ? 'flex-start' : 'center', justifyContent: 'center', gap: isVertical ? 28 : 0, flexWrap: 'wrap' as const }} onClick={e => e.stopPropagation()}>
            {isVideo(previewFile.mimeType) ? (
              <>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ width: isVertical ? 380 : '100%', maxWidth: isVertical ? 380 : 880, aspectRatio: isVertical ? '9/16' : '16/9', borderRadius:10, overflow:'hidden', background:'#000', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
                    <iframe src={`https://drive.google.com/file/d/${previewFile.id}/preview`} style={{ width:'100%', height:'100%', border:'none' }} allow="autoplay" allowFullScreen />
                  </div>
                  <div style={{ fontSize:13, color:'rgba(200,194,187,0.6)', margin: isVertical ? '14px 0 0' : '14px 0 28px' }}>{previewFile.name}</div>
                </div>
                {/* FEEDBACK — a tall side column next to vertical video (matching its
                    own shape instead of a wide bar awkwardly stacked under a narrow
                    player), a regular panel below horizontal video as before. */}
                <div style={{ width: isVertical ? 360 : '100%', maxWidth: isVertical ? 360 : 620, flexShrink: 0, background:'#14181F', border:'0.5px solid rgba(200,194,187,0.12)', borderRadius:12, overflow:'hidden', boxShadow:'0 10px 40px rgba(0,0,0,0.3)', display: isVertical ? 'flex' : undefined, flexDirection: isVertical ? 'column' as const : undefined, maxHeight: isVertical ? 'calc(380px * 16 / 9 + 34px)' : undefined }}>
                  <div style={{ padding:'18px 22px', borderBottom:'0.5px solid rgba(200,194,187,0.1)', display:'flex', alignItems:'center', gap:10, flexShrink: 0 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(200,194,187,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconDocument size={14} style={{ color:'rgba(200,194,187,0.6)' }} /></div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>Feedback on this clip</div>
                      <div style={{ fontSize:11, color:'rgba(200,194,187,0.4)' }}>Note the time you see on the player, then describe the change — add as many as you like and send them together</div>
                    </div>
                  </div>
                  {feedbackList.length > 0 && (
                    <div style={{ maxHeight: isVertical ? undefined : 220, flex: isVertical ? 1 : undefined, minHeight: isVertical ? 0 : undefined, overflowY:'auto', padding:'14px 22px 0', display:'flex', flexDirection:'column', gap:8 }}>
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
                  {draftStops.length > 0 && (
                    <div style={{ padding:'14px 22px 0', display:'flex', flexDirection:'column', gap:8, flexShrink: 0 }}>
                      <div style={{ fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(210,175,80,0.8)' }}>Queued — not sent yet</div>
                      {draftStops.map((s, i) => (
                        <div key={i} style={{ background:'rgba(210,175,80,0.06)', border:'0.5px solid rgba(210,175,80,0.2)', borderRadius:8, padding:'10px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#C8C2BB', background:'rgba(200,194,187,0.08)', borderRadius:4, padding:'3px 8px', flexShrink:0 }}>{s.timestamp}</span>
                          <div style={{ flex:1, fontSize:12, color:'rgba(200,194,187,0.75)', lineHeight:1.5 }}>{s.message}</div>
                          <button onClick={() => removeDraftStop(i)} aria-label="Remove queued note" style={{ background:'transparent', border:'none', color:'rgba(200,194,187,0.4)', cursor:'pointer', fontSize:16, lineHeight:1, padding:0, flexShrink:0 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ padding:'18px 22px', display:'flex', flexDirection: isVertical ? 'column' as const : 'row' as const, gap:10, alignItems: isVertical ? 'stretch' as const : 'flex-start' as const, flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input value={feedbackTimestamp} onChange={e => setFeedbackTimestamp(e.target.value)} placeholder="1:23" style={{ width:64, flexShrink:0, background:'rgba(200,194,187,0.06)', border:'0.5px solid rgba(200,194,187,0.15)', borderRadius:6, padding:'10px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', textAlign:'center' }} />
                      <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="What would you like changed?" rows={1} style={{ flex:1, background:'rgba(200,194,187,0.06)', border:'0.5px solid rgba(200,194,187,0.15)', borderRadius:6, padding:'10px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical' as const, minHeight:40 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={addDraftStop} disabled={!feedbackMessage.trim()} title="Queue another timestamped note before sending" style={{ flex: isVertical ? 1 : undefined, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'11px 14px', borderRadius:6, background:'transparent', border:'0.5px solid rgba(200,194,187,0.25)', color:'rgba(200,194,187,0.7)', cursor: !feedbackMessage.trim() ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit', flexShrink:0, opacity: !feedbackMessage.trim() ? 0.5 : 1 }}>
                        + Add
                      </button>
                      <button onClick={submitFeedback} disabled={submittingFeedback || (draftStops.length === 0 && !feedbackMessage.trim())} style={{ flex: isVertical ? 1 : undefined, fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', padding:'11px 16px', borderRadius:6, background: feedbackSent ? 'rgba(100,200,130,0.15)' : '#C8C2BB', color: feedbackSent ? 'rgba(100,200,130,0.9)' : '#111', border: feedbackSent ? '0.5px solid rgba(100,200,130,0.3)' : 'none', cursor: submittingFeedback || (draftStops.length === 0 && !feedbackMessage.trim()) ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit', flexShrink:0, opacity: draftStops.length === 0 && !feedbackMessage.trim() && !submittingFeedback ? 0.5 : 1 }}>
                        {submittingFeedback ? 'Sending...' : feedbackSent ? '✓ Sent' : draftStops.length > 0 ? `Send ${draftStops.length + (feedbackMessage.trim() ? 1 : 0)}` : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : isImage(previewFile.mimeType) ? (
              <>
                <img src={`/api/drive?thumb=${previewFile.id}&size=2000`} alt={previewFile.name} style={{ maxWidth:'100%', maxHeight:'80vh', objectFit:'contain', borderRadius:10, boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }} />
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
        )
      })()}
    </div>
  )
}

// Lets a client add as many reference URLs as they need, one at a time,
// instead of trying to cram several links into a single-line text input.
// A handful of Details-step fields are optional and most bookings don't need
// them — ticking the box is what reveals the textarea, instead of showing
// several empty optional textareas by default on every single booking.
function CheckboxReveal({ label, checked, onToggle, children }: { label: string; checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{ width: 17, height: 17, borderRadius: 3, border: `1px solid ${checked ? '#C8C2BB' : 'rgba(200,194,187,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: checked ? 'rgba(200,194,187,0.15)' : 'transparent' }}>{checked && <span style={{ fontSize: 10, color: '#C8C2BB' }}>✓</span>}</div>
        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', cursor: 'pointer' }}>{label}</label>
      </div>
      {checked && <div style={{ marginTop: 8 }}>{children}</div>}
    </div>
  )
}

function ReferenceLinksInput({ links, onAdd, onRemove, placeholder }: { links: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder: string }) {
  const [draft, setDraft] = React.useState('')
  function add() {
    if (!draft.trim()) return
    onAdd(draft.trim())
    setDraft('')
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          style={{ flex: 1, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}
        />
        <button type="button" onClick={add} disabled={!draft.trim()} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 14px', borderRadius: 4, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: draft.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: draft.trim() ? 1 : 0.5, flexShrink: 0 }}>+ Add</button>
      </div>
      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {links.map((link, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.08)', borderRadius: 4, padding: '7px 10px' }}>
              <span style={{ flex: 1, fontSize: 12, color: '#C8C2BB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
              <button type="button" onClick={() => onRemove(i)} aria-label="Remove link" style={{ background: 'transparent', border: 'none', color: 'rgba(200,194,187,0.4)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Reconstructs every field offered at booking time (Step 5 — Property or
// Commercial/Events), filled in or not, from a bookings1 row or (once
// confirmed) its projects1 row — general_notes starts as a copy of the
// booking's notes, carrying the same "Label: value" segments through.
// Shown with explicit "Not provided" rather than just omitting a field, so
// the client can see at a glance what they skipped and still add it.
function fullDetailRows(record: any, isCommercial: boolean): { label: string; value: string }[] {
  const segments = parseLabeledNotes(record.notes ?? record.general_notes ?? '')
  const find = (label: string) => segments.find(s => s.label?.toLowerCase() === label.toLowerCase())?.body || ''
  const fmtDate = (d?: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  const preferredDate = record.preferred_date ?? record.shoot_date
  const preferredTime = record.preferred_time ?? record.shoot_window_start
  const shootDateLine = preferredDate ? fmtDate(preferredDate) + (preferredTime ? ' · ' + formatTime12(preferredTime) : '') : ''

  if (isCommercial) {
    return [
      { label: 'Business / brand', value: record.client_name || record.client || '' },
      { label: 'Contact email', value: record.client_email || record.email || '' },
      { label: 'Phone', value: find('Phone') },
      { label: 'Project title', value: find('Project title') },
      { label: 'Project description', value: find('Project description') },
      { label: 'Overall goal for the project', value: find('Overall goal for the project') },
      { label: 'Key message', value: find('Key message') },
      { label: 'Talent / interviews', value: find('Talent / interviews') },
      { label: 'Deliverables', value: find('Deliverables') || record.deliverables || '' },
      { label: 'Estimated duration', value: find('Estimated duration') },
      { label: 'Preferred date', value: shootDateLine },
      { label: 'Location', value: record.address || '' },
      { label: 'References', value: find('References') },
      { label: 'Budget range', value: find('Budget range') },
      { label: 'Additional notes', value: find('Additional notes') },
      { label: 'Final delivery needed by', value: fmtDate(record.delivery_due) },
    ]
  }
  return [
    { label: 'Listing agent name', value: record.client_name || record.client || '' },
    { label: 'Contact email', value: record.client_email || record.email || '' },
    { label: 'Phone', value: find('Phone') },
    { label: 'Property address', value: record.address || '' },
    { label: 'Property type', value: find('Property type') },
    { label: 'Access / key notes', value: find('Access') },
    { label: 'Preferred shoot date', value: shootDateLine },
    { label: 'Property going live', value: fmtDate(record.property_live_date) },
    { label: 'Final delivery needed by', value: fmtDate(record.delivery_due) },
    { label: 'Brief / concept', value: find('Brief/Concept') },
    { label: 'Property features', value: find('Property features') },
    { label: 'Talent required', value: find('Talent required') },
    { label: 'Suggested shot list', value: find('Suggested shot list') },
    { label: 'Reference links', value: find('References') },
    { label: 'Twilight shoot', value: find('Twilight shoot requested') },
    { label: 'Filming orientation', value: find('Filming orientation') },
  ]
}

function FullBookingDetails({ record, isCommercial }: { record: any; isCommercial: boolean }) {
  const rows = fullDetailRows(record, isCommercial)
  const attachments: { name: string; url: string }[] = record.attachment_urls || []
  return (
    <div>
      <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
        {rows.map(r => (
          <div key={r.label}>
            <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: r.value ? '#C8C2BB' : 'rgba(200,194,187,0.22)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{r.value || 'Not provided'}</div>
          </div>
        ))}
      </div>
      {attachments.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 6 }}>Attachments</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(100,150,220,0.9)', textDecoration: 'none' }}>{a.name}</a>
            ))}
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
  // The email every project/booking/invoice/notification query below is
  // actually scoped to — the main account holder's own login email for them,
  // or the main account's email for a sub-user logged in under their own
  // separate login (resolved via client_members). Everything that reads or
  // writes client-owned data should use this, not user?.email directly, or a
  // sub-user would see/write against their own personal email instead of the
  // shared account they were invited into.
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<{ id: string; member_email: string; member_name: string; avatar_url?: string | null; role_title?: string | null; created_at?: string }[]>([])
  const [teamProfileOpen, setTeamProfileOpen] = useState<string | null>(null) // 'main', a member id, or null
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUploadError, setAvatarUploadError] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState({ name: '', company: '', phone: '', role: '' })
  const [teamInvites, setTeamInvites] = useState<{ id: string; invited_email: string; invited_name: string; created_at: string }[]>([])
  const [teamInviteName, setTeamInviteName] = useState('')
  const [teamInviteEmail, setTeamInviteEmail] = useState('')
  const [teamInviteNotice, setTeamInviteNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null)
  const [sendingTeamInvite, setSendingTeamInvite] = useState(false)
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
  // Property package step: video-only packages, or every package with
  // photography bundled in as a main deliverable instead of the old
  // separate Photo Package add-on tile.
  const [packageMode, setPackageMode] = useState<'video' | 'photo-video'>('video')
  const [selectedAddons, setSelectedAddons] = useState<any[]>([])
  const [preferredDate, setPreferredDate] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false)
  const [addressDebounce, setAddressDebounce] = useState<any>(null)
  // Captured from the picked Mapbox suggestion so the travel fee can be
  // calculated without a second geocode call in the common case — see
  // handleAddressChange's fallback geocode for when the client types an
  // address without ever clicking a suggestion.
  const [propertyCoords, setPropertyCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [travelFee, setTravelFee] = useState(0)
  const [calculatingTravelFee, setCalculatingTravelFee] = useState(false)
  const [bookingNotes, setBookingNotes] = useState("")
  const [accessNotes, setAccessNotes] = useState("")
  const [clientContactName, setClientContactName] = useState("")
  const [clientEmail2, setClientEmail2] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  // Pre-fill email from logged in user
  useEffect(() => { if (accountEmail && !clientEmail2) setClientEmail2(accountEmail) }, [accountEmail])
  const [draftDue, setDraftDue] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [propertyLiveDate, setPropertyLiveDate] = useState("")
  const [shotList, setShotList] = useState("• \n• \n• \n• \n• ")
  const [propertyFeatures, setPropertyFeatures] = useState('')
  const [homeType, setHomeType] = useState('')
  // These four fields on the Details step are optional and most bookings
  // don't need them — ticking the box is what reveals the textbox, rather
  // than showing four empty textareas by default regardless of whether the
  // client has anything to put in them.
  const [showBriefField, setShowBriefField] = useState(false)
  const [showTalentField, setShowTalentField] = useState(false)
  const [showShotListField, setShowShotListField] = useState(false)
  const [showPropertyFeaturesField, setShowPropertyFeaturesField] = useState(false)
  const [twilightDate, setTwilightDate] = useState("")
  const [twilightTime, setTwilightTime] = useState("")
  // Property Ad is filmed in one orientation, not both like the other
  // packages — defaults to Horizontal unless the client explicitly switches
  // it, since that's the more common pick for this package's use (listing
  // sites, TV screens) and shouldn't require an extra click to get.
  const [filmingOrientation, setFilmingOrientation] = useState('Horizontal')
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
  // A list rather than a single free-text field — lets a client add as
  // many reference URLs as they need instead of cramming them into one
  // line. Joined back into a plain string wherever it's sent on.
  const [referenceLinks, setReferenceLinks] = useState<string[]>([])
  function addReferenceLink(url: string) { setReferenceLinks(p => [...p, url]) }
  function removeReferenceLink(i: number) { setReferenceLinks(p => p.filter((_, idx) => idx !== i)) }
  const [budgetRange, setBudgetRange] = useState('')

  const [tcAccepted, setTcAccepted] = useState(false)
  const [submittingBooking, setSubmittingBooking] = useState(false)
  const [clientProjects, setClientProjects] = useState<any[]>([])
  const [clientBookings, setClientBookings] = useState<any[]>([])
  const [clientBriefs, setClientBriefs] = useState<any[]>([])
  const [clientInvoices, setClientInvoices] = useState<any[]>([])
  const [pendingChangeRequests, setPendingChangeRequests] = useState<any[]>([])
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
  // Still-pending bookings (no studio response yet) weren't viewable or
  // editable at all — a client could only see a bare "Pending" badge.
  // expandedBookingId reveals the full details inline; a change request
  // is a free-text note tagged with what it's about, same "client flags
  // it, studio actions it" shape as the alt-time-request flow above,
  // rather than letting a client silently edit a booking studio hasn't
  // seen yet.
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [changeRequestBookingId, setChangeRequestBookingId] = useState<string | null>(null)
  const [changeRequestType, setChangeRequestType] = useState<'package' | 'date' | 'addons' | 'other'>('other')
  const [changeRequestMessage, setChangeRequestMessage] = useState('')
  const [submittingChangeRequest, setSubmittingChangeRequest] = useState(false)
  // Lets a client add details (notes and/or files) they didn't include at
  // booking time, once the booking is pending or confirmed — 'b:<id>' or
  // 'p:<id>' so a pending booking and its eventual project never collide.
  const [addDetailsOpenId, setAddDetailsOpenId] = useState<string | null>(null)
  const [addDetailsText, setAddDetailsText] = useState('')
  const [addDetailsFiles, setAddDetailsFiles] = useState<{ name: string; url: string; size: number }[]>([])
  const [uploadingAddDetails, setUploadingAddDetails] = useState(false)
  const [submittingAddDetails, setSubmittingAddDetails] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [changeRequest, setChangeRequest] = useState('')
  const [changeRequestSent, setChangeRequestSent] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOther, setCancelOther] = useState('')
  const [cancellationSent, setCancellationSent] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  // A short, skippable guided tour chained directly off the Welcome
  // screen's dismissal — same session, no localStorage needed since it
  // only ever runs once right after Welcome. Kept deliberately light: a
  // sentence on the dashboard, a pointer at the one nav item worth
  // pointing at (booking itself is self-explanatory), a look at invoices,
  // then one question about inviting a team — not a full click-through of
  // every feature.
  const [tourStep, setTourStep] = useState<'dashboard' | 'book' | 'invoices' | 'team' | null>(null)
  // The "book" step's tooltip is rendered fixed-position (not absolutely
  // inside the nav button) and placed via the button's real on-screen rect
  // — nesting it inside the nav item put it in the sidebar's own stacking
  // context, where it rendered behind/blended into the dashboard panels
  // instead of floating cleanly above everything.
  const bookNavRef = useRef<HTMLButtonElement | null>(null)
  const [bookTooltipPos, setBookTooltipPos] = useState<{ top: number; left: number } | null>(null)
  useEffect(() => {
    if (tourStep === 'book' && bookNavRef.current) {
      const r = bookNavRef.current.getBoundingClientRect()
      setBookTooltipPos({ top: r.top + r.height / 2, left: r.right + 14 })
    }
  }, [tourStep])
  // Skipping early (e.g. from the dashboard step) leaves ec_team_nudge_pending
  // alone, so the standalone Team-page nudge still fires later if they visit
  // it on their own — only reaching the tour's own team question consumes it,
  // since that's the point this same message actually got delivered.
  function finishTourTeamStep() {
    setTourStep(null)
    try { localStorage.removeItem('ec_team_nudge_pending') } catch {}
  }
  const [showTeamInviteNudge, setShowTeamInviteNudge] = useState(false)
  // One-time callout pushing a brand-new account toward inviting teammates,
  // set at signup time (see ec_team_nudge_pending) and consumed the first
  // time this account actually opens the Team view, not before.
  useEffect(() => {
    if (activeView !== 'team') return
    try {
      if (localStorage.getItem('ec_team_nudge_pending')) {
        setShowTeamInviteNudge(true)
        localStorage.removeItem('ec_team_nudge_pending')
      }
    } catch {}
  }, [activeView])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      setLoading(false)
      // Set by the signup page right before it navigates away — the real
      // first landing here usually happens on a totally separate page load
      // after email confirmation, so this can't just be a signup-page state.
      try {
        if (localStorage.getItem('ec_welcome_pending')) {
          setShowWelcome(true)
          localStorage.removeItem('ec_welcome_pending')
        }
      } catch {}
      const loginEmail = session.user.email
      // Redirect studio staff to studio portal
      if (loginEmail === 'cody@examplecontent.co.nz') {
        router.push('/portal/studio')
        return
      }
      // A sub-user signs in under their own email but should see/act on the
      // same account as whoever invited them — resolve that here once, up
      // front, so every query below (and every write elsewhere in this
      // component) uses the shared account email instead of this login.
      const { data: membership } = await supabase.from('client_members').select('account_email').eq('member_email', loginEmail || '').eq('status', 'active').maybeSingle()
      let resolvedAccountEmail = membership?.account_email || null
      let isSubUser = !!membership
      if (!resolvedAccountEmail) {
        // First real login after accepting a team invite — the invite-accept
        // page only runs supabase.auth.signUp(), it can't write client_members
        // itself if Supabase required email confirmation first (no session
        // existed yet at that point). This is where that link actually gets
        // made, the first time this login shows up with a still-pending
        // invite addressed to it.
        const { data: pendingInvite } = await supabase.from('client_invites').select('*').eq('invited_email', loginEmail || '').eq('status', 'pending').maybeSingle()
        if (pendingInvite) {
          await supabase.from('client_members').insert([{ account_email: pendingInvite.account_email, member_email: loginEmail, member_name: pendingInvite.invited_name || '', invited_by: pendingInvite.invited_by, avatar_url: session.user.user_metadata?.avatar_url || null }])
          await supabase.from('client_invites').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', pendingInvite.id)
          resolvedAccountEmail = pendingInvite.account_email
          isSubUser = true
          try {
            await supabase.from('notifications').insert([{
              user_email: 'cody@examplecontent.co.nz',
              type: 'new_team_member',
              title: 'New team member joined',
              message: `${pendingInvite.invited_name || loginEmail} just joined ${pendingInvite.account_email}'s team.`,
              project_id: null,
              read: false,
            }])
          } catch (e) { console.error('New-team-member notification error:', e) }
          try {
            await fetch('/api/notify-new-signup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: pendingInvite.invited_name, email: loginEmail, kind: 'team_member', accountEmail: pendingInvite.account_email }),
            })
          } catch (e) { console.error('New-team-member email error:', e) }
        }
      }
      const email = resolvedAccountEmail || loginEmail
      setAccountEmail(email)
      // Only the main account holder's first login should create a new
      // clients1 row — a sub-user's own login email has no business becoming
      // its own separate client record.
      if (!isSubUser) await ensureClientProfile(session.user)
      const { data: profile } = await supabase.from('clients1').select('*').eq('email', email).single()
      if (profile) setClientProfile(profile)
      const { data: members } = await supabase.from('client_members').select('*').eq('account_email', email || '').eq('status', 'active').order('created_at', { ascending: true })
      if (members) setTeamMembers(members)
      const { data: invites } = await supabase.from('client_invites').select('*').eq('account_email', email || '').eq('status', 'pending').order('created_at', { ascending: true })
      if (invites) setTeamInvites(invites)
      // Load projects linked to this client
      const { data: projects } = await supabase.from('projects1').select('*').eq('email', email).eq('archived', false).order('created_at', { ascending: false })
      if (projects) setClientProjects(projects)
      // Also load every project regardless of archived state — invoice line
      // items and lifetime stats need projects that markSent already archived.
      const { data: allProjects } = await supabase.from('projects1').select('*').ilike('email', email || '').order('created_at', { ascending: false })
      if (allProjects) setAllClientProjects(allProjects)
      // Load bookings linked to this client — the main account holder sees
      // every booking on the account, but a teammate only sees the ones
      // they personally made (plus anything older than this distinction
      // existed, which has no created_by_email tracked at all).
      const { data: bookings } = await supabase.from('bookings1').select('*').eq('client_email', email).order('created_at', { ascending: false })
      const visibleBookings = isSubUser ? (bookings || []).filter((b: any) => !b.created_by_email || b.created_by_email === loginEmail) : bookings
      if (visibleBookings) setClientBookings(visibleBookings)
      const { data: briefs } = await supabase.from('briefs').select('*').eq('client_email', email).order('created_at', { ascending: false })
      if (briefs) setClientBriefs(briefs)
      const { data: invoices } = await supabase.from('invoices1').select('*').ilike('client_email', email || '').neq('status', 'draft').order('created_at', { ascending: false })
      if (invoices) setClientInvoices(invoices)
      const { data: changeRequests } = await supabase.from('change_requests').select('*').eq('client_email', email).eq('status', 'pending').order('created_at', { ascending: false })
      if (changeRequests) setPendingChangeRequests(changeRequests)
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

  async function handleSendTeamInvite() {
    if (!accountEmail || !teamInviteEmail.trim()) return
    setSendingTeamInvite(true)
    setTeamInviteNotice(null)
    try {
      const { invite, error, emailSent } = await sendTeamInvite({ accountEmail, invitedEmail: teamInviteEmail, invitedName: teamInviteName, invitedBy: user?.email, source: 'client' })
      if (error) { setTeamInviteNotice({ type: 'error', message: "Couldn't create the invite: " + error }); return }
      if (invite) setTeamInvites(p => [...p, invite])
      setTeamInviteNotice(emailSent
        ? { type: 'success', message: `Invite sent to ${teamInviteEmail.trim()}.` }
        : { type: 'warning', message: `Invite created, but the email couldn't be sent — let them know to check with you directly, or try resending later.` })
      setTeamInviteName('')
      setTeamInviteEmail('')
    } finally {
      setSendingTeamInvite(false)
    }
  }

  async function handleRemoveTeamMember(id: string) {
    setTeamMembers(p => p.filter(m => m.id !== id))
    await removeTeamMember(id)
  }

  // Only the signed-in person can set their own photo/title — opening
  // someone else's card is read-only (plus Remove, for the account owner).
  const isOwnCard = (target: 'main' | string) =>
    target === 'main' ? accountEmail === user?.email : teamMembers.find(m => m.id === target)?.member_email === user?.email

  async function handleAvatarUpload(file: File, target: 'main' | string) {
    setAvatarUploadError('')
    setUploadingAvatar(true)
    try {
      const dataUrl = await resizeImageToDataUrl(file)
      if (target === 'main') {
        await supabase.from('clients1').update({ avatar_url: dataUrl }).eq('email', accountEmail)
        setClientProfile((p: any) => p ? { ...p, avatar_url: dataUrl } : p)
      } else {
        await supabase.from('client_members').update({ avatar_url: dataUrl }).eq('id', target)
        setTeamMembers(p => p.map(m => m.id === target ? { ...m, avatar_url: dataUrl } : m))
      }
    } catch {
      setAvatarUploadError("Couldn't read that image — try a different file.")
    } finally {
      setUploadingAvatar(false)
    }
  }

  // Saves the editable profile fields for whichever card is open — the
  // main account's name/company/phone live on clients1, a sub-user's own
  // name/role live on their client_members row (they have no separate
  // business details of their own, those belong to the main account).
  async function saveProfile(cardId: string, isMain: boolean) {
    setEditingProfile(false)
    if (isMain) {
      const updates = { name: profileDraft.name, company: profileDraft.company, phone: profileDraft.phone }
      setClientProfile((p: any) => p ? { ...p, ...updates } : p)
      await supabase.from('clients1').update(updates).eq('email', accountEmail)
    } else {
      setTeamMembers(p => p.map(m => m.id === cardId ? { ...m, member_name: profileDraft.name, role_title: profileDraft.role } : m))
      await supabase.from('client_members').update({ member_name: profileDraft.name, role_title: profileDraft.role }).eq('id', cardId)
    }
  }

  async function handleRevokeTeamInvite(id: string) {
    setTeamInvites(p => p.filter(i => i.id !== id))
    await revokeTeamInvite(id)
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

  // Doesn't touch the booking's status (it stays 'pending' — studio
  // hasn't actioned it yet) — just appends the request to its notes so
  // it's visible whenever studio opens it, and raises an in-portal
  // notification so it's not easy to miss.
  async function submitBookingChangeRequest(booking: any) {
    if (!changeRequestMessage.trim()) return
    setSubmittingChangeRequest(true)
    const typeLabel = { package: 'Package', date: 'Date/time', addons: 'Add-ons', other: 'Other' }[changeRequestType]
    const appendedNotes = (booking.notes ? booking.notes + '\n\n' : '') +
      `--- Client requested a change (${typeLabel}) · ${new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })} ---\n${changeRequestMessage.trim()}`
    // A date/time change while a meeting is booked is a real negotiation
    // round, not just a note — flips the booking to meeting_alt_requested
    // (mirroring the existing date_proposed/alt_requested back-and-forth
    // used for the actual shoot date) so studio sees it as something that
    // needs a response, not just text sitting in the notes.
    const isMeetingTimeRequest = changeRequestType === 'date' && booking.status === 'meeting_booked'
    const updates: any = { notes: appendedNotes }
    if (isMeetingTimeRequest) {
      updates.status = 'meeting_alt_requested'
      updates.client_response_message = changeRequestMessage.trim()
    }
    try {
      const { error } = await supabase.from('bookings1').update(updates).eq('id', booking.id)
      if (error) { console.error('Booking change request error:', error); return }
      setClientBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...updates } : b))
      try {
        await supabase.from('notifications').insert([{
          user_email: 'cody@examplecontent.co.nz',
          type: 'booking_change_request',
          title: `Booking change requested — ${typeLabel}`,
          message: `${booking.client_name || booking.client_email} requested a ${typeLabel.toLowerCase()} change on their pending booking (${booking.address || booking.shoot_package || 'booking'}): ${changeRequestMessage.trim()}`,
          read: false,
        }])
      } catch (e) { console.error('Change request notification error:', e) }
      setChangeRequestBookingId(null)
      setChangeRequestMessage('')
      setChangeRequestType('other')
    } finally {
      setSubmittingChangeRequest(false)
    }
  }

  async function uploadAddDetailsFiles(files: FileList) {
    setUploadingAddDetails(true)
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const path = `${Date.now()}-${safeName}`
        const { error } = await supabase.storage.from('booking-attachments').upload(path, file)
        if (error) { console.error('Attachment upload error:', error); continue }
        const { data: { publicUrl } } = supabase.storage.from('booking-attachments').getPublicUrl(path)
        setAddDetailsFiles(prev => [...prev, { name: file.name, url: publicUrl, size: file.size }])
      }
    } finally {
      setUploadingAddDetails(false)
    }
  }

  function removeAddDetailsFile(url: string) {
    setAddDetailsFiles(prev => prev.filter(a => a.url !== url))
  }

  // Covers both a still-pending booking (writes onto bookings1) and an
  // already-confirmed one (writes onto its projects1 row instead, since
  // that's what studio actually works from once a project exists) — same
  // append-a-labeled-block pattern as submitBookingChangeRequest above, plus
  // an actual notification (not just a write nothing reads) and an email,
  // since studio asked specifically to be notified when this happens rather
  // than finding it buried in notes later.
  async function submitAdditionalDetails(target: { kind: 'booking' | 'project'; booking?: any; project?: any }) {
    if (!addDetailsText.trim() && addDetailsFiles.length === 0) return
    setSubmittingAddDetails(true)
    try {
      const dateLabel = new Date().toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
      const block = `--- Client added details · ${dateLabel} ---\n${addDetailsText.trim()}` +
        (addDetailsFiles.length ? '\n' + addDetailsFiles.map(f => `Attached: ${f.name} — ${f.url}`).join('\n') : '')
      const titleLabel = target.kind === 'project'
        ? (target.project?.title || 'their project')
        : (target.booking?.address || target.booking?.shoot_package || 'their booking')
      let projectIdForNotif: string | null = null

      if (target.kind === 'booking') {
        const b = target.booking
        const newNotes = (b.notes ? b.notes + '\n\n' : '') + block
        const newAttachments = [...(b.attachment_urls || []), ...addDetailsFiles]
        const { error } = await supabase.from('bookings1').update({ notes: newNotes, attachment_urls: newAttachments }).eq('id', b.id)
        if (error) { console.error('Add details error:', error); return }
        setClientBookings(prev => prev.map(x => x.id === b.id ? { ...x, notes: newNotes, attachment_urls: newAttachments } : x))
      } else {
        const p = target.project
        const newNotes = (p.general_notes ? p.general_notes + '\n\n' : '') + block
        const newAttachments = [...(p.attachment_urls || []), ...addDetailsFiles]
        const { error } = await supabase.from('projects1').update({ general_notes: newNotes, attachment_urls: newAttachments }).eq('id', p.id)
        if (error) { console.error('Add details error:', error); return }
        setClientProjects(prev => prev.map(x => x.id === p.id ? { ...x, general_notes: newNotes, attachment_urls: newAttachments } : x))
        setAllClientProjects(prev => prev.map(x => x.id === p.id ? { ...x, general_notes: newNotes, attachment_urls: newAttachments } : x))
        setSelectedProject((sp: any) => sp && sp.id === p.id ? { ...sp, general_notes: newNotes, attachment_urls: newAttachments } : sp)
        projectIdForNotif = p.id
      }

      const notifMessage = `${clientProfile?.name || accountEmail} added more details to ${titleLabel}` +
        (addDetailsFiles.length ? ` (${addDetailsFiles.length} file${addDetailsFiles.length > 1 ? 's' : ''} attached)` : '') +
        (addDetailsText.trim() ? `: ${addDetailsText.trim()}` : '.')
      try {
        await supabase.from('notifications').insert([{
          user_email: 'cody@examplecontent.co.nz',
          type: 'additional_details',
          title: 'Client added more details',
          message: notifMessage,
          project_id: projectIdForNotif,
          read: false,
        }])
      } catch (e) { console.error('Add-details notification error:', e) }

      try {
        await fetch('/api/notify-additional-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientName: clientProfile?.name || accountEmail,
            title: titleLabel,
            text: addDetailsText.trim(),
            fileCount: addDetailsFiles.length,
            projectId: projectIdForNotif,
          }),
        })
      } catch (e) { console.error('notify-additional-details error:', e) }

      setAddDetailsOpenId(null)
      setAddDetailsText('')
      setAddDetailsFiles([])
    } finally {
      setSubmittingAddDetails(false)
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
    // The coords (and whatever travel fee was calculated from them) belong
    // to the previous address text — stale the moment it's edited again, so
    // the review step doesn't keep showing a fee for an address that's since
    // changed underneath it.
    setPropertyCoords(null)
    if (addressDebounce) clearTimeout(addressDebounce)
    setAddressDebounce(setTimeout(() => searchAddresses(val), 350))
  }

  function selectAddress(feature: any) {
    setPropertyAddress(feature.place_name)
    setAddressSuggestions([])
    setShowAddressSuggestions(false)
    // Mapbox returns center as [lng, lat].
    if (Array.isArray(feature.center) && feature.center.length === 2) {
      setPropertyCoords({ lat: feature.center[1], lng: feature.center[0] })
    }
  }

  // Catches an address typed in full without ever clicking a suggestion —
  // selectAddress (the normal path) never fires for that, so there'd
  // otherwise be no coordinates to calculate a travel fee from at all.
  async function geocodePropertyAddressIfNeeded() {
    if (propertyCoords || !propertyAddress.trim()) return
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(propertyAddress)}.json?country=NZ&types=address&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`)
      const data = await res.json()
      const center = data.features?.[0]?.center
      if (Array.isArray(center) && center.length === 2) setPropertyCoords({ lat: center[1], lng: center[0] })
    } catch (e) { console.error('Travel fee geocode error:', e) }
  }

  // Straight-line distance — only used to pick which city's free radius
  // applies (cheap, no API call needed for that) and as a fallback if the
  // real driving-distance lookup below fails outright.
  function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLng = (b.lng - a.lng) * Math.PI / 180
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  }

  // Real road distance, via the same Mapbox account already used for address
  // search — straight-line badly understates routes with hills or coastline
  // between the CBD and the property (Raglan from Hamilton is the textbook
  // case: ~35km straight line, ~48km actually driven). Returns null on any
  // failure so the caller can fall back to straight-line rather than break.
  async function getDrivingKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<number | null> {
    try {
      const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`)
      const data = await res.json()
      const meters = data.routes?.[0]?.distance
      return typeof meters === 'number' ? meters / 1000 : null
    } catch (e) {
      console.error('Travel fee directions error:', e)
      return null
    }
  }

  // Auckland and Hamilton CBD reference points (Auckland's match the ones
  // already used for the dashboard weather widget, for one consistent
  // "where's the CBD" answer across the app). Hamilton's free zone isn't a
  // clean radius in reality (it runs out to named suburbs — Dinsdale,
  // Peacocke, Tamahere, Greenhill — in different directions and distances),
  // so 10km is an approximation of where those sit relative to the CBD, not
  // a precise boundary match. Whichever city is closer to the address is the
  // one its free-zone radius applies — anywhere else in NZ this will still
  // produce a number (measured against the nearer of the two), just one
  // that's increasingly a rough estimate the further out it gets.
  const AUCKLAND_CBD = { lat: -36.8485, lng: 174.7633 }
  const HAMILTON_CBD = { lat: -37.7870, lng: 175.2793 }
  const AUCKLAND_FREE_RADIUS_KM = 16
  const HAMILTON_FREE_RADIUS_KM = 10
  // Matches the studio's own internal rate card ($1.17/km) so the quoted
  // fee reflects real cost rather than a separate, lower placeholder number.
  const TRAVEL_RATE_PER_KM = 1.17

  async function calculatePropertyTravelFee(coords: { lat: number; lng: number }): Promise<number> {
    const dAklStraight = haversineKm(coords, AUCKLAND_CBD)
    const dHamStraight = haversineKm(coords, HAMILTON_CBD)
    const nearestCity = dAklStraight <= dHamStraight
      ? { cbd: AUCKLAND_CBD, freeRadius: AUCKLAND_FREE_RADIUS_KM, straight: dAklStraight }
      : { cbd: HAMILTON_CBD, freeRadius: HAMILTON_FREE_RADIUS_KM, straight: dHamStraight }
    const drivingKm = await getDrivingKm(nearestCity.cbd, coords)
    const dist = drivingKm ?? nearestCity.straight
    if (dist < nearestCity.freeRadius) return 0
    // Covers the full trip out to the property, then only the part of the
    // trip back that's still outside the free radius — the crew drives the
    // whole distance out regardless, but once they're back inside the free
    // zone that remaining leg is ordinary local driving again, not billable
    // travel. Charging the one-way distance alone under-covered the return.
    const billableKm = dist + (dist - nearestCity.freeRadius)
    return Math.round(billableKm * TRAVEL_RATE_PER_KM)
  }

  useEffect(() => {
    if (!propertyCoords) { setTravelFee(0); return }
    let cancelled = false
    setCalculatingTravelFee(true)
    calculatePropertyTravelFee(propertyCoords)
      .then(fee => { if (!cancelled) setTravelFee(fee) })
      .finally(() => { if (!cancelled) setCalculatingTravelFee(false) })
    return () => { cancelled = true }
  }, [propertyCoords])

  function toggleAddon(addon: any) {
    setSelectedAddons(prev =>
      prev.find(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, addon]
    )
  }

  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0)
  const grandTotal = (selectedShoot?.price || 0) + (selectedDel?.price || 0) + addonTotal + (selectedCat === 'property' ? travelFee : 0)

  const propertyShootPackages = [
    {
      name: 'Property Ad', price: 690,
      tag: 'Engaging - Great value for money',
      description: 'A punchy 20–30s property ad built for social — big impact.',
      includes: ['20–30s engaging/trending property ad', 'Optional agent introduction', 'Up to 1.5hrs filming', 'Filmed in vertical or horizontal', 'Full creative control by Example Content', '8-10 Slide Instagram Carousel'],
      deliverables: [
        { name: 'Property Ad (20–30s)', price: 0, includes: ['1x engaging/trending property ad', 'Optional agent introduction', 'Filmed vertical or horizontal (your choice)', 'Google Drive delivery'] },
        { name: '8-10 Slide Instagram Carousel', price: 0, includes: ['1x branded property carousel', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Content Campaign Package', price: 890,
      tag: 'Campaign package',
      description: "Give us direction or just let us do the work creating ads for your property. Campaigns comprise of momentum and this load of content does exactly that.",
      includes: ['20 Second Ad', '20 Second Property Ad', '8-10 Slide Instagram Carousel'],
      allIncluded: true,
      deliverables: [
        { name: 'Ad (20s)', price: 0, includes: ['1x social-optimised video', 'Vertical & landscape formats', 'Google Drive delivery'] },
        { name: 'Property Ad (20s)', price: 0, includes: ['1x property-focused social video', 'Vertical & landscape formats', 'Google Drive delivery'] },
        { name: '8-10 Slide Instagram Carousel', price: 0, includes: ['1x branded property carousel', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'The Walkthrough Package', price: 890,
      tag: 'Our base package',
      description: '60–90s cinematic property tour with a handful of agent lifestyle shots to bring the listing to life.',
      includes: ['60–90s property tour', 'Agent lifestyle shots', '8-10 Slide Instagram Carousel'],
      deliverables: [
        { name: 'Walkthrough Film (60–90s)', price: 0, includes: ['1x walkthrough film', 'Google Drive delivery'] },
        { name: '2x Showcase Reels (20s)', price: 0, includes: ['2x 20s showcase reels', 'Vertical & landscape', 'Google Drive delivery'] },
        { name: '8-10 Slide Instagram Carousel', price: 0, includes: ['1x branded property carousel', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Lifestyle and Living Package', price: 1280,
      tag: 'The lifestyle showcase',
      description: 'Everything in The Walkthrough Package, plus a full hour of lifestyle filming with talent to elevate the property narrative.',
      includes: ['60–90s property tour', '1hr lifestyle shoot with talent', 'Agent lifestyle shots', '8-10 Slide Instagram Carousel'],
      deliverables: [
        { name: 'Showcase Film (60–90s)', price: 0, includes: ['1x cinematic film', 'Vertical & landscape formats', 'Google Drive delivery'] },
        { name: '3x Reels', price: 0, includes: ['3x social reels', 'Vertical & landscape formats', 'Google Drive delivery'] },
        { name: '8-10 Slide Instagram Carousel', price: 0, includes: ['1x branded property carousel', 'Google Drive delivery'] },
      ]
    },
    {
      name: 'Media Release Package', price: 2480,
      tag: 'Full production',
      description: 'For the most upmarket and desirable homes. Everything you could need to drill home the perfect marketing campaign, showcased only in the best light.',
      includes: ['Morning, afternoon & twilight shoot', 'Lifestyle shoot + talking to camera', '90 Second Market Leading Property Showcase', '20-30 Second Ad', '5-8 Second Ad', '8-10 Slide Instagram Carousel'],
      deliverables: [
        { name: 'Full Media Release Package', price: 0, includes: ['1x Market-leading property showcase (90s)', '1x Ad (20-30s)', '1x Ad (5-8s)', '1x 8-10 Slide Instagram Carousel', 'Google Drive delivery'] },
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
  // Travel used to be two flat-rate addons (Raglan, Morrinsville/Whatawhata) —
  // replaced by an auto-calculated fee based on the entered property address
  // (see calculatePropertyTravelFee), so those are gone from this list and
  // the fee shows as its own line at review instead of something to select.
  const propertyAddons = [
    { name: 'Property Ad (5-8s)', price: 150, desc: '1x short-form property ad from the shoot (5-8s)' },
    { name: 'Additional Lifestyle Filming (1hr)', price: 175, desc: 'An extra hour of lifestyle filming with talent' },
    { name: 'Additional 20s Reel', price: 300, desc: 'An edited reel consisting of footage from the shoot (20s)' },
    { name: 'Additional 40s Reel', price: 400, desc: 'An edited reel consisting of footage from the shoot (40s)' },
    { name: '8-10 Slide Instagram Carousel', price: 100, desc: 'Visually engaging property showcase carousel' },
    { name: 'Open home stories', price: 80, desc: 'Includes 5 backgrounds for Open Home posts' },
    { name: 'Twilight Shoot', price: 350, desc: 'Golden hour & dusk exterior shoot' },
    { name: 'Property Content Creative Planning', price: 80, desc: 'Dedicated creative planning session for your property content' },
    { name: 'Pre Shoot Property Site Visit', price: 80, desc: 'In-person site visit ahead of the shoot (within Hamilton/Auckland)' },
  ]
  // Photo Package is deliberately kept out of propertyShootPackages/propertyAddons
  // — it's only ever offered alongside an existing video package, not as a
  // standalone product (yet), so it gets its own toggle card on the add-ons
  // step instead of sitting in either list.
  const PHOTO_PACKAGE = { name: 'Photo Package', price: 450, desc: '25-35 photos + 3 drone photos' }
  // The "Photo & Video Packages" tab — same packages, with the Photo
  // Package's deliverables folded in as a main part of each one (not an
  // add-on), priced at the video package's price plus the Photo Package's
  // own price, no bundle discount.
  // A couple of packages have their own specific price/photo inclusions
  // rather than the generic package-price + $450 / 25-35 photos formula —
  // everything else falls through to that default.
  const PHOTO_VIDEO_OVERRIDES: Record<string, { price: number; photoIncludes: string[] }> = {
    'Lifestyle and Living Package': { price: 1890, photoIncludes: ['25-35 Photos + 3 Drone Photos', '10 Lifestyle Photos'] },
    'Media Release Package': { price: 2990, photoIncludes: ['50-60 Photos', '5 Drone Photos', 'Twilight Photos'] },
  }
  const propertyShootPackagesWithPhoto = propertyShootPackages.map(pkg => {
    const override = PHOTO_VIDEO_OVERRIDES[pkg.name]
    const photoIncludes = override?.photoIncludes || ['25-35 Photos + 3 Drone Photos']
    return {
      ...pkg,
      name: pkg.name + ' + Photography',
      price: override?.price ?? (pkg.price + PHOTO_PACKAGE.price),
      includes: [...pkg.includes, ...photoIncludes],
      deliverables: [...pkg.deliverables, { name: photoIncludes.join(' + '), price: 0, includes: [...photoIncludes.map(p => p + ' (edited)'), 'Google Drive delivery'] }],
    }
  })
  // Only make sense once the base Photo Package is actually added.
  const photoPackageAddons = [
    { name: 'Lifestyle Agent Photo Shoot', price: 150, desc: 'A styled lifestyle photo shoot with the listing agent' },
    { name: '10 Additional Photos', price: 150, desc: '10 more edited photos on top of the Photo Package' },
    { name: '5 Additional Drone Photos', price: 120, desc: '5 more edited drone photos on top of the Photo Package' },
  ]
  const commercialAddons = [
    { name: 'Additional Talent', price: 220, desc: 'Extra on-screen talent sourced by Example Content' },
    { name: 'Rush Delivery (48hr)', price: 180, desc: 'Priority turnaround within 48 hours' },
    { name: 'Voiceover & Sound Design', price: 260, desc: 'Professional voiceover and custom sound design' },
    { name: 'Extra Shoot Hours', price: 290, desc: 'Add additional hours to any package' },
  ]
  const shootPackages = selectedCat === 'property'
    ? (packageMode === 'photo-video' ? propertyShootPackagesWithPhoto : propertyShootPackages)
    : commercialShootPackages
  const deliverables = selectedCat === 'property' ? propertyDeliverables : commercialDeliverables
  // Several property packages now bundle a carousel in directly — hide
  // the paid Carousel add-on when the chosen package already includes
  // one, so a client can't end up paying $100 extra for something
  // that's already covered.
  const packageHasCarousel = selectedShoot?.deliverables?.some((d: any) => d.name.toLowerCase().includes('carousel'))
  const addons = (selectedCat === 'property' ? propertyAddons : commercialAddons).filter(a => !(packageHasCarousel && a.name.toLowerCase().includes('carousel')))

  const s = { panel: { background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7 } as React.CSSProperties }
  const cInp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const cLbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)' }
  function addBriefDel() { setBriefDeliverables(p => [...p, { id: Date.now().toString(), name: '', quantity: 1, duration: '', formats: [], notes: '' }]) }
  function updateBriefDel(id: string, field: keyof BriefDeliverable, value: any) { setBriefDeliverables(p => p.map(d => d.id === id ? { ...d, [field]: value } : d)) }
  function removeBriefDel(id: string) { setBriefDeliverables(p => p.filter(d => d.id !== id)) }
  function toggleBriefFmt(id: string, fmt: string) { setBriefDeliverables(p => p.map(d => d.id === id ? { ...d, formats: d.formats.includes(fmt) ? d.formats.filter(f => f !== fmt) : [...d.formats, fmt] } : d)) }

  if (loading) return <LoadingScreen />

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Geist, sans-serif', color: '#C8C2BB', display: 'flex' }}>
      {showWelcome && <WelcomeScreen name={clientProfile?.name || clientProfile?.company || ''} onDismiss={() => { setShowWelcome(false); setTourStep('dashboard') }} />}
      {tourStep === 'dashboard' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 12, width: '100%', maxWidth: 400, padding: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Quick tour · 1 of 3</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 10 }}>This is your dashboard</div>
            <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.55)', lineHeight: 1.7, marginBottom: 24 }}>Everything lives here — your upcoming shoots, active projects, and recent deliveries, all at a glance.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setTourStep(null)} style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Skip tour</button>
              <button onClick={() => setTourStep('book')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Next →</button>
            </div>
          </div>
        </div>
      )}
      {tourStep === 'book' && bookTooltipPos && (
        <div style={{ position: 'fixed', top: bookTooltipPos.top, left: bookTooltipPos.left, transform: 'translateY(-50%)', zIndex: 450, width: 230, background: '#2a2210', border: '0.5px solid rgba(210,175,80,0.4)', borderRadius: 8, padding: '12px 14px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
          <div style={{ position: 'absolute', top: '50%', left: -5, width: 10, height: 10, background: '#2a2210', borderLeft: '0.5px solid rgba(210,175,80,0.4)', borderBottom: '0.5px solid rgba(210,175,80,0.4)', transform: 'translateY(-50%) rotate(45deg)' }} />
          <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(230,205,140,0.7)', marginBottom: 6 }}>Quick tour · 2 of 3</div>
          <div style={{ fontSize: 12, color: 'rgba(240,225,190,0.95)', lineHeight: 1.6, marginBottom: 10 }}>This is where you book your next project.</div>
          <button onClick={() => { setActiveView('invoices'); setTourStep('invoices') }} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: 'rgba(210,175,80,0.9)', color: '#1a1508', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Got it →</button>
        </div>
      )}
      {tourStep === 'invoices' && activeView === 'invoices' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 450, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 90, right: 28, pointerEvents: 'auto', maxWidth: 300, background: 'linear-gradient(135deg, rgba(100,150,220,0.14), rgba(100,150,220,0.05))', border: '0.5px solid rgba(100,150,220,0.3)', borderRadius: 8, padding: '14px 16px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(100,150,220,0.7)', marginBottom: 6 }}>Quick tour · 2 of 3</div>
            <div style={{ fontSize: 12, color: 'rgba(230,235,250,0.95)', lineHeight: 1.6, marginBottom: 12 }}>This is your Invoices page — they'll show up here once a project's confirmed and billed.</div>
            <button onClick={() => setTourStep('team')} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: 'rgba(100,150,220,0.9)', color: '#0E1014', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Got it →</button>
          </div>
        </div>
      )}
      {tourStep === 'team' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 12, width: '100%', maxWidth: 400, padding: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Quick tour · 3 of 3</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Working with a team?</div>
            <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.55)', lineHeight: 1.7, marginBottom: 24 }}>You can invite teammates to see the same bookings, deliverables and invoices under their own login, any time from the Team page.</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <button onClick={finishTourTeamStep} style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Maybe later</button>
              <button onClick={() => { setActiveView('team'); finishTourTeamStep() }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '10px 20px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Invite my team →</button>
            </div>
          </div>
        </div>
      )}
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
            { id: 'team', label: 'Team', Icon: IconUsers },
          ].map(item => {
            const active = activeView === item.id
            return (
              <button key={item.id} ref={item.id === 'book' ? bookNavRef : undefined} onClick={() => { setMobileMenuOpen(false); setActiveView(item.id); setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress(''); setProjectType(''); setProjectTitle(''); setProjectDescription(''); setTargetAudience(''); setKeyMessage(''); setTalentDetails(''); setBriefDeliverables([{ id: '1', name: '', quantity: 1, duration: '', formats: [], notes: '' }]); setDateFlexible(false); setShootDuration(''); setReferenceLinks([]); setBudgetRange(''); setBookingAttachments([]); setTwilightDate(''); setTwilightTime(''); setPropertyFeatures(''); setHomeType(''); setShowBriefField(false); setShowTalentField(false); setShowShotListField(false); setShowPropertyFeaturesField(false); setPropertyCoords(null); setTravelFee(0); setPackageMode('video') }} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 14px 11px 17px', borderRadius: 6, fontSize: 13, letterSpacing: '0.01em', fontWeight: active ? 600 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.65)', background: active ? 'rgba(61,71,86,0.4)' : 'transparent', border: active ? '0.5px solid rgba(200,194,187,0.15)' : '0.5px solid transparent', cursor: 'pointer', marginBottom: 4, textAlign: 'left', fontFamily: 'inherit' }}>
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
          // A booking is still "in flight" (not yet a project) across four statuses:
          // pending (no studio response yet), date_proposed (waiting on us to answer),
          // alt_requested (we asked for another time, waiting on the studio), and
          // meeting_booked (a discovery call is booked — proposed_date here is the
          // meeting's date, not a shoot date; studio still owes a real confirm).
          const isUnresolved = (s: string) => s === 'pending' || s === 'date_proposed' || s === 'alt_requested' || s === 'meeting_booked' || s === 'meeting_alt_requested'
          // A confirmed booking with no project yet is also still "in flight" — the
          // studio hasn't finalized it into a project/calendar event — so it shouldn't
          // vanish from these lists in the gap between the client confirming and that.
          const isAwaitingProject = (b: any) => isUnresolved(b.status) || (b.status === 'confirmed' && !b.project_id)
          const pendingShootBookings = clientBookings.filter((b: any) => (b.proposed_date || b.preferred_date) && new Date(b.proposed_date || b.preferred_date) >= now && isAwaitingProject(b) && !confirmedShootDates.has(b.proposed_date || b.preferred_date)).map((b: any) => ({ id: b.id, title: b.address || b.shoot_package || 'Pending booking', shoot_date: b.proposed_date || b.preferred_date, stage: b.status === 'date_proposed' ? 'Time proposed' : b.status === 'alt_requested' ? 'Awaiting new time' : b.status === 'meeting_booked' ? 'Meeting booked' : b.status === 'meeting_alt_requested' ? 'Awaiting new meeting time' : b.status === 'confirmed' ? 'Confirmed' : 'Pending', client: b.client_name, address: b.address, progress: 0, isPending: true, shoot_package: b.shoot_package, deliverables_type: b.deliverables, addons: b.addons, total: b.total }))
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
          const recentDeliveries = allClientProjects.filter((p: any) => p.drive_url && (p.stage === 'Awaiting Confirmation' || p.stage === 'Completed')).sort((a: any, b: any) => new Date(b.delivered_at || b.created_at).getTime() - new Date(a.delivered_at || a.created_at).getTime()).slice(0, 3)

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
                <div className="ec-grid-4-resp" style={{ gap: 10, marginBottom: 18 }}>
                  {[
                    { label: 'Upcoming shoots', value: upcomingShoots.length, sub: upcomingShoots.length > 0 ? 'Next: ' + new Date(upcomingShoots[0].shoot_date + 'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short'}) : 'None scheduled' },
                    { label: 'Active projects', value: activeProjects.length, sub: activeProjects.length > 0 ? activeProjects[0].stage : 'All clear' },
                    { label: 'Pending bookings', value: pendingBookings.length, sub: pendingBookings.length > 0 ? 'Awaiting confirmation' : 'All confirmed', alert: pendingBookings.length > 0 },
                    { label: 'Projects complete', value: completedProjects.length, sub: 'Delivered — in your library' },
                  ].map(({ label, value, sub, alert }: any) => (
                    <div key={label} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '16px 18px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.38)', marginBottom: 8 }}>{label}</div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: alert ? 'rgba(210,175,80,0.9)' : '#fff', letterSpacing: '-0.02em' }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.28)', marginTop: 4 }}>{sub}</div>
                    </div>
                  ))}
                </div>

                {pendingChangeRequests.length > 0 && (
                  <div style={{ background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.25)', borderRadius: 7, padding: '14px 18px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,175,80,0.9)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(210,175,80,0.95)' }}>{pendingChangeRequests.length} request{pendingChangeRequests.length !== 1 ? 's' : ''} awaiting a response from Example Content</span>
                    </div>
                    {pendingChangeRequests.map((cr: any) => (
                      <div key={cr.id} onClick={() => { const proj = clientProjects.find((p: any) => p.id === cr.project_id); if (proj) setSelectedProject(proj) }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingLeft: 15, cursor: cr.project_id ? 'pointer' : 'default' }}>
                        <div style={{ fontSize: 11, color: 'rgba(210,175,80,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong style={{ color: 'rgba(210,175,80,0.95)', fontWeight: 600 }}>{cr.project_title || 'Project'}</strong> — {cr.type === 'cancellation' ? 'cancellation requested' : 'change requested'}
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(210,175,80,0.5)', flexShrink: 0 }}>{new Date(cr.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ec-grid-sidebar-resp" style={{ gap: 16 }}>
                  {/* LEFT: UPCOMING SHOOTS + ACTIVE PROJECTS */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* UPCOMING SHOOTS — dashboard shows just the next couple; the full
                        list lives on the dedicated "Our Shoots" page. */}
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Upcoming shoots</span>
                        <button onClick={() => setActiveView('book')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>+ Book new</button>
                      </div>
                      {awaitingSchedule.length > 0 && awaitingSchedule.slice(0, 2).map((b: any) => (
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
                      {(() => {
                        const shownAwaiting = Math.min(awaitingSchedule.length, 2)
                        const shoots = upcomingShoots.slice(0, Math.max(0, 2 - shownAwaiting))
                        if (upcomingShoots.length === 0 && awaitingSchedule.length === 0) {
                          return <div style={{ padding: '24px 18px', fontSize: 12, color: 'rgba(200,194,187,0.25)', textAlign: 'center' }}>No upcoming shoots — book one above</div>
                        }
                        return shoots.map((p: any, i: number) => {
                          const d = new Date(p.shoot_date + 'T12:00:00')
                          const STAGE_C: Record<string,any> = { 'Pre-Production': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Shooting': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Post-Production': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Revisions': {color:'rgba(220,120,60,0.9)',bg:'rgba(80,35,15,0.4)'}, 'Awaiting Confirmation': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'}, 'Completed': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.6)'}, 'Pending': {color:'rgba(210,175,80,0.9)',bg:'rgba(65,52,18,0.4)'}, 'Time proposed': {color:'rgba(100,150,220,0.9)',bg:'rgba(25,45,80,0.4)'}, 'Awaiting new time': {color:'rgba(160,100,220,0.9)',bg:'rgba(50,25,80,0.4)'}, 'Confirmed': {color:'rgba(100,200,130,0.9)',bg:'rgba(30,70,45,0.4)'} }
                          const sc = STAGE_C[p.stage] || {color:'#C8C2BB',bg:'rgba(200,194,187,0.1)'}
                          return (
                            <div key={p.id} onClick={() => p.isPending ? setActiveView('upcoming') : setSelectedProject(p)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 18px', borderBottom: i < shoots.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none', cursor: 'pointer' }}>
                              <div style={{ width: 42, flexShrink: 0, textAlign: 'center', background: 'rgba(61,71,86,0.3)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 5, padding: '5px 3px' }}>
                                <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', lineHeight: 1 }}>{d.getDate()}</div>
                                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{d.toLocaleDateString('en-NZ',{month:'short'})}</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#C8C2BB', marginBottom: 3 }}>{p.title}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{p.address ? p.address.split(',')[0] : p.client}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {pendingChangeRequests.some((cr: any) => cr.project_id === p.id) && (
                                  <span title="Change request awaiting a response" style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,175,80,0.9)', flexShrink: 0 }} />
                                )}
                                {!p.isPending && (
                                  <button
                                    title="Add additional details"
                                    onClick={e => { e.stopPropagation(); setSelectedProject(p); setAddDetailsOpenId('p:' + p.id); setAddDetailsText(''); setAddDetailsFiles([]) }}
                                    style={{ width: 22, height: 22, borderRadius: '50%', border: '0.5px solid rgba(200,194,187,0.2)', background: 'transparent', color: 'rgba(200,194,187,0.5)', fontSize: 13, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }}
                                  >+</button>
                                )}
                                <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 2, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>{stageLabel(p.stage)}</span>
                              </div>
                            </div>
                          )
                        })
                      })()}
                      {(upcomingShoots.length + awaitingSchedule.length) > 2 && (
                        <div onClick={() => setActiveView('upcoming')} style={{ padding: '10px 18px', fontSize: 11, color: 'rgba(200,194,187,0.4)', textAlign: 'center', cursor: 'pointer', borderTop: '0.5px solid rgba(200,194,187,0.06)' }}>View all {upcomingShoots.length + awaitingSchedule.length} →</div>
                      )}
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
                              {pendingChangeRequests.some((cr: any) => cr.project_id === p.id) && (
                                <span title="Change request awaiting a response" style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(210,175,80,0.9)', flexShrink: 0 }} />
                              )}
                              <button
                                title="Add additional details"
                                onClick={e => { e.stopPropagation(); setSelectedProject(p); setAddDetailsOpenId('p:' + p.id); setAddDetailsText(''); setAddDetailsFiles([]) }}
                                style={{ width: 22, height: 22, borderRadius: '50%', border: '0.5px solid rgba(200,194,187,0.2)', background: 'transparent', color: 'rgba(200,194,187,0.5)', fontSize: 13, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }}
                              >+</button>
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

                    {/* PENDING BOOKINGS — only ones with something to actually
                        respond to (a proposed time, a meeting to confirm); a
                        plain "pending" booking with nothing to act on yet is
                        already shown in Upcoming Shoots above, so repeating
                        it here with no buttons was pure duplication. */}
                    {(() => {
                      const actionablePendingBookings = pendingBookings.filter((b: any) => b.status !== 'pending' && !(b.status === 'confirmed' && !b.project_id))
                      if (actionablePendingBookings.length === 0) return null
                      return (
                      <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>Pending bookings</div>
                        <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                          {actionablePendingBookings.map((b: any, i: number) => {
                            const isLast = i === actionablePendingBookings.length - 1
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
                      )
                    })()}
                  </div>
                </div>

                {/* RECENT DELIVERIES */}
                {recentDeliveries.length > 0 && (
                  <div style={{ marginTop: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Recent deliveries</div>
                      <span onClick={() => setActiveView('library')} style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', cursor: 'pointer' }}>View all →</span>
                    </div>
                    <DragScrollRow style={{ paddingBottom: 8 }}>
                      {recentDeliveries.map((p: any) => (
                        <DriveThumb key={p.id} project={p} onClick={() => { setLibraryProject(p); setActiveView('library') }} />
                      ))}
                    </DragScrollRow>
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
                        poster: '/images/booking/property-poster.jpg',
                        gradient: 'linear-gradient(160deg, #1a2535 0%, #0a0e14 100%)',
                      },
                      {
                        id: 'commercial',
                        title: 'Commercial\n& Events',
                        desc: 'Photo & Video Branding, Event Coverage, Commercial/Corporate Work, Other..',
                        video: '/videos/commercial.mp4',
                        poster: '/images/booking/commercial-poster.jpg',
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
                        {/* VIDEO BG — poster shows immediately so there's a real frame
                            in place while the (large, locally-hosted) mp4 loads in,
                            instead of flashing through to the bare gradient. */}
                        <video
                          src={cat.video}
                          poster={cat.poster}
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
                  {/* VIDEO / PHOTO+VIDEO TOGGLE — an iOS-style segmented control: a
                      pill track with a sliding highlight behind whichever side is
                      active, rather than two separate buttons. */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <div style={{ position: 'relative', display: 'flex', width: 340, maxWidth: '100%', background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.12)', borderRadius: 999, padding: 3 }}>
                      <div style={{ position: 'absolute', top: 3, bottom: 3, left: 3, width: 'calc(50% - 3px)', borderRadius: 999, background: '#C8C2BB', transform: packageMode === 'photo-video' ? 'translateX(100%)' : 'translateX(0)', transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                      {([{ id: 'video', label: 'Video Packages' }, { id: 'photo-video', label: 'Photo & Video Packages' }] as const).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setPackageMode(opt.id)
                            setSelectedShoot(null)
                            setSelectedDel(null)
                            // Leaving photo+video mode should drop any photo-only
                            // upsell add-ons picked on the next step — they only
                            // make sense once a photography-included package is chosen.
                            if (opt.id === 'video') setSelectedAddons(prev => prev.filter(a => !photoPackageAddons.some(pa => pa.name === a.name)))
                          }}
                          style={{ position: 'relative', zIndex: 1, flex: 1, padding: '9px 10px', fontSize: 11, letterSpacing: '0.02em', fontWeight: 600, textAlign: 'center', background: 'transparent', border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', color: packageMode === opt.id ? '#111' : 'rgba(200,194,187,0.55)', transition: 'color 0.25s ease' }}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>
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
                    <button onClick={() => { if (selectedShoot) setBookingStep(4) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: selectedShoot ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: selectedShoot ? '#111' : 'rgba(200,194,187,0.2)', border:'none', cursor: selectedShoot ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Continue →</button>
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
                      <label style={cLbl}>Overall goal for the project</label>
                      <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)} placeholder="e.g. Drive bookings for our new summer menu" style={cInp} />
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
                      <ReferenceLinksInput links={referenceLinks} onAdd={addReferenceLink} onRemove={removeReferenceLink} placeholder="Paste a link, then + Add" />
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
                  {selectedCat === 'property' && packageMode === 'photo-video' && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(210,175,80,0.7)', marginBottom: 10 }}>Photo package add-ons</div>
                      <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                        {photoPackageAddons.map(addon => {
                          const selected = selectedAddons.find(a => a.name === addon.name)
                          return (
                            <div key={addon.name} onClick={() => toggleAddon(addon)} style={{ border: `0.5px solid ${selected ? 'rgba(210,175,80,0.45)' : 'rgba(200,194,187,0.09)'}`, borderRadius: 6, padding: '13px 15px', cursor: 'pointer', background: selected ? 'rgba(210,175,80,0.06)' : '#1A1F28', display: 'flex', gap: 10 }}>
                              <div style={{ width: 17, height: 17, borderRadius: 3, border: `1px solid ${selected ? 'rgba(210,175,80,0.7)' : 'rgba(200,194,187,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: selected ? 'rgba(210,175,80,0.15)' : 'transparent', marginTop: 1 }}>{selected && <span style={{ fontSize: 10, color: 'rgba(210,175,80,0.9)' }}>✓</span>}</div>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 2 }}>{addon.name}</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 4 }}>+${addon.price} + GST</div>
                                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.3)', lineHeight: 1.4 }}>{addon.desc}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {selectedCat === 'property' && packageMode === 'photo-video' && (
                    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', marginBottom: 10 }}>Video package add-ons</div>
                  )}
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
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Listing agent name</label>
                      <input value={clientContactName} onChange={e => setClientContactName(e.target.value)} placeholder="e.g. Jessica Moore" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Your email</label>
                      <input type="email" value={clientEmail2} onChange={e => setClientEmail2(e.target.value)} placeholder="your@email.com" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Phone number</label>
                      <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="021 123 4567" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Property specific */}
                  {selectedCat === 'property' && (
                    <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: 'span 2' }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Property address</label>
                        <div style={{ position: 'relative' }}>
                          <input value={propertyAddress} onChange={e => handleAddressChange(e.target.value)} onBlur={() => { setTimeout(() => setShowAddressSuggestions(false), 200); geocodePropertyAddressIfNeeded() }} placeholder="Start typing an address..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                          {propertyAddress.trim() && selectedCat === 'property' && (
                            <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)', marginTop: 6 }}>
                              {!propertyCoords || calculatingTravelFee ? 'Calculating travel fee...' : travelFee > 0 ? `Travel fee: $${travelFee} + GST (auto-calculated from address)` : 'No travel fee — within the free zone'}
                            </div>
                          )}
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
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Property type</label>
                        <select value={homeType} onChange={e => setHomeType(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>Select type...</option><option>Standard Residential</option><option>High End Residential</option><option>Character Home</option><option>Lifestyle Property</option><option>High End Lifestyle</option><option>Townhouse</option><option>Section</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Access / key notes</label>
                        <input value={accessNotes} onChange={e => setAccessNotes(e.target.value)} placeholder="e.g. Key in lockbox, call owner on arrival" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                    </div>
                  )}

                  {/* Dates — always shown */}
                  <div className="ec-grid-resp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Preferred shoot date</label>
                      <div style={{ display:'flex', gap:10 }}>
                        <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', flex:1 }} />
                        <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }}>
                          <option value=''>Preferred time</option>
                          {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','15:00','16:00','17:00','17:30','18:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Property going live</label>
                      <input type="date" value={propertyLiveDate} onChange={e => setPropertyLiveDate(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>Final delivery needed by</label>
                      <input type="date" value={deliveryDue} onChange={e => setDeliveryDue(e.target.value)} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    <CheckboxReveal label="Brief/Concept" checked={showBriefField} onToggle={() => setShowBriefField(v => !v)}>
                      <textarea rows={4} value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="Style references, key features, specific requirements, timeline notes, or a suggested storyline — e.g. A warm family home nestled in a quiet cul-de-sac..." style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.65, width: '100%' }} />
                    </CheckboxReveal>
                    <CheckboxReveal label="Property Features" checked={showPropertyFeaturesField} onToggle={() => setShowPropertyFeaturesField(v => !v)}>
                      <textarea rows={4} value={propertyFeatures} onChange={e => setPropertyFeatures(e.target.value)} placeholder="Anything worth calling out — pool, view, renovated kitchen, home office, etc." style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.65, width:'100%' }} />
                    </CheckboxReveal>
                    <CheckboxReveal label="Talent required" checked={showTalentField} onToggle={() => setShowTalentField(v => !v)}>
                      <textarea rows={3} value={talentDetails} onChange={e => setTalentDetails(e.target.value)} placeholder="Describe the talent needed on shoot (e.g. homeowner walk-through, 2 lifestyle models), and whether you're providing/sourcing the talent yourself or need us to source it" style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.65, width:'100%' }} />
                    </CheckboxReveal>
                    <CheckboxReveal label="Suggested Shot List" checked={showShotListField} onToggle={() => setShowShotListField(v => !v)}>
                      <textarea rows={6} value={shotList} onChange={e => setShotList(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', lineHeight:1.75, width:'100%' }} />
                    </CheckboxReveal>
                    <div style={{ marginTop:16 }}>
                      <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#fff', display:'block', marginBottom:6 }}>Reference links</label>
                      <ReferenceLinksInput links={referenceLinks} onAdd={addReferenceLink} onRemove={removeReferenceLink} placeholder="Paste a link to a property you'd like to use as a reference, then + Add" />
                    </div>
                    {(selectedShoot?.name === 'Media Release Package' || selectedAddons.some((a: any) => a.name === 'Twilight Shoot')) && (
                      <div style={{ marginTop:16 }}>
                        <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#fff', display:'block', marginBottom:6 }}>Twilight shoot — date & time requested</label>
                        <div style={{ display:'flex', gap:10 }}>
                          <input type="date" value={twilightDate} onChange={e => setTwilightDate(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', flex:1 }} />
                          <select value={twilightTime} onChange={e => setTwilightTime(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none' }}>
                            <option value=''>Preferred time</option>
                            {['16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'].map(t => <option key={t} value={t}>{formatTime12(t)}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    {selectedShoot?.name === 'Property Ad' && (
                      <div style={{ marginTop:16 }}>
                        <label style={{ fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'#fff', display:'block', marginBottom:6 }}>Filming orientation</label>
                        <select value={filmingOrientation} onChange={e => setFilmingOrientation(e.target.value)} style={{ background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'9px 12px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', width:'100%' }}>
                          <option value='Horizontal'>Horizontal</option>
                          <option value='Vertical'>Vertical</option>
                        </select>
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
                      { key: 'Shoot package', val: selectedShoot?.price == null ? `${selectedShoot?.name} — price to be confirmed` : `${selectedShoot?.name} — $${selectedShoot?.price?.toLocaleString()} + GST` },
                      ...(selectedShoot?.name === 'Property Ad' ? [{ key: 'Filming orientation', val: filmingOrientation }] : []),
                      ...(selectedShoot?.price == null ? [] : [{ key: 'Deliverable package', val: `${selectedDel?.name} — $${selectedDel?.price} + GST` }]),
                      { key: 'Add-ons', val: selectedAddons.length ? selectedAddons.map(a => `${a.name} (+$${a.price})`).join(', ') : 'None' },
                      ...(travelFee > 0 ? [{ key: 'Travel fee', val: `$${travelFee} + GST (auto-calculated from address)` }] : []),
                      { key: 'Preferred date', val: 'TBC — confirmed within 24 hrs' },
                      { key: 'Attachments', val: bookingAttachments.length ? `${bookingAttachments.length} file${bookingAttachments.length !== 1 ? 's' : ''} attached` : 'None' },
                    ]).map(({ key, val }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>{key}</span>
                        <span style={{ fontSize: 13, color: '#C8C2BB', fontWeight: 500, textAlign: 'right', maxWidth: 360 }}>{val}</span>
                      </div>
                    ))}
                    {selectedCat === 'commercial' || selectedShoot?.price == null ? (
                      <>
                        <div style={{ paddingTop: 14, marginTop: 4, fontSize: 12, color: 'rgba(200,194,187,0.4)', lineHeight: 1.6 }}>{selectedCat === 'commercial' ? "This is quoted per project — we'll review your brief and come back with a custom quote within 24–48 hours." : "We'll review what you've described and come back with a price before anything's confirmed."}</div>
                        {grandTotal > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 10 }}>
                            <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>Add-ons & travel (excl. custom package)</span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#C8C2BB' }}>${grandTotal.toLocaleString()} + GST</span>
                          </div>
                        )}
                      </>
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
                      if (!tcAccepted || submittingBooking) return
                      setSubmittingBooking(true)
                      try {
                        const { data: newBooking } = await supabase.from('bookings1').insert([selectedCat === 'commercial' ? {
                          client_id: user?.id,
                          // The actual logged-in person, not the shared account
                          // email — lets booking-related emails go to whoever
                          // made this specific booking (owner or teammate)
                          // instead of always the main account holder.
                          created_by_email: user?.email || null,
                          client_name: clientContactName || accountEmail,
                          category: selectedCat,
                          shoot_package: projectType,
                          deliverables: briefDeliverables.filter(d => d.name).map(d => `${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}`).join(', '),
                          addons: '',
                          preferred_date: preferredDate || null,
                          preferred_time: preferredTime || null,
                          client_email: clientEmail2 || accountEmail,
                          draft_due: null,
                          delivery_due: deliveryDue || null,
                          property_live_date: null,
                          address: propertyAddress,
                          notes: [
                            projectTitle ? 'Project title: ' + projectTitle : '',
                            projectDescription ? 'Project description: ' + projectDescription : '',
                            targetAudience ? 'Overall goal for the project: ' + targetAudience : '',
                            keyMessage ? 'Key message: ' + keyMessage : '',
                            talentDetails ? 'Talent / interviews: ' + talentDetails : '',
                            briefDeliverables.filter(d => d.name).length ? 'Deliverables:\n' + briefDeliverables.filter(d => d.name).map(d => `- ${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}${d.formats.length ? ' [' + d.formats.join(', ') + ']' : ''}${d.notes ? ' — ' + d.notes : ''}`).join('\n') : '',
                            shootDuration ? 'Estimated duration: ' + shootDuration : '',
                            dateFlexible ? 'Preferred date is flexible' : '',
                            referenceLinks.length ? 'References: ' + referenceLinks.join(', ') : '',
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
                          created_by_email: user?.email || null,
                          client_name: clientContactName || accountEmail,
                          category: selectedCat,
                          shoot_package: selectedShoot?.name || '',
                          deliverables: selectedDel?.name || '',
                          addons: selectedAddons.map((a: any) => a.name).join(', '),
                          preferred_date: preferredDate,
                          preferred_time: preferredTime || null,
                          client_email: clientEmail2 || accountEmail,
                          draft_due: draftDue || null,
                          delivery_due: deliveryDue || null,
                          property_live_date: propertyLiveDate || null,
                          address: propertyAddress,
                          notes: [
                            selectedShoot?.price == null ? `CUSTOM REQUEST — "${selectedShoot?.name}". No package selected; set a price manually once scoped.` : '',
                            bookingNotes ? 'Brief/Concept: ' + bookingNotes : '',
                            homeType ? 'Property type: ' + homeType : '',
                            propertyFeatures ? 'Property features: ' + propertyFeatures : '',
                            accessNotes ? 'Access: ' + accessNotes : '',
                            talentDetails ? 'Talent required: ' + talentDetails : '',
                            shotList.replace(/[•\s]/g, '') ? 'Suggested shot list:\n' + shotList : '',
                            referenceLinks.length ? 'References: ' + referenceLinks.join(', ') : '',
                            (twilightDate || twilightTime) ? 'Twilight shoot requested: ' + (twilightDate ? new Date(twilightDate + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : 'date TBC') + (twilightTime ? ' at ' + formatTime12(twilightTime) : '') : '',
                            selectedShoot?.name === 'Property Ad' ? 'Filming orientation: ' + filmingOrientation : '',
                            travelFee > 0 ? `Travel fee: $${travelFee} + GST (auto-calculated from property address)` : '',
                            clientPhone ? 'Phone: ' + clientPhone : '',
                          ].filter(Boolean).join('\n\n'),
                          total: selectedShoot?.price == null ? 'Price to be confirmed' : `$${grandTotal.toLocaleString()} + GST`,
                          total_price: selectedShoot?.price == null ? null : grandTotal,
                          tc_accepted: true,
                          status: 'pending',
                          attachment_urls: bookingAttachments,
                        }]).select().single()
                        // Without this, the dashboard kept showing the
                        // pre-submission list until a manual page reload —
                        // clientBookings was only ever populated on the
                        // initial auth-check load, never updated after a
                        // new booking was actually created.
                        if (newBooking) setClientBookings(prev => [newBooking, ...prev])
                      } catch (e) { console.error('Booking save error:', e) }
                      try {
                        await supabase.from('clients1').upsert([{
                          email: clientEmail2 || accountEmail,
                          name: clientContactName || '',
                          phone: clientPhone || null,
                          category: selectedCat === 'property' ? 'Property' : 'Commercial',
                        }], { onConflict: 'email', ignoreDuplicates: false })
                      } catch (e) { console.error('Client upsert error:', e) }
                      try {
                        const details = selectedCat === 'commercial' ? [
                          { label: 'Business / brand', value: clientContactName },
                          { label: 'Project type', value: projectType },
                          { label: 'Overall goal for the project', value: targetAudience },
                          { label: 'Key message', value: keyMessage },
                          { label: 'Talent / interviews', value: talentDetails },
                          { label: 'Deliverables', value: briefDeliverables.filter(d => d.name).map(d => `${d.quantity}x ${d.name}${d.duration ? ' (' + d.duration + ')' : ''}`).join(', ') || 'To be discussed' },
                          { label: 'Location', value: propertyAddress },
                          { label: 'Preferred date', value: dateFlexible ? 'Flexible' : (preferredDate ? preferredDate + (preferredTime ? ' at ' + formatTime12(preferredTime) : '') : 'TBC') },
                          { label: 'Estimated duration', value: shootDuration },
                          { label: 'Budget range', value: budgetRange || 'Not specified' },
                          { label: 'Reference links', value: referenceLinks.join(', ') },
                          { label: 'Description', value: projectDescription },
                          { label: 'Additional notes', value: bookingNotes },
                          { label: 'Attachments', value: bookingAttachments.map(a => `${a.name}: ${a.url}`).join('\n') },
                        ] : [
                          { label: 'Listing agent', value: clientContactName },
                          { label: 'Package', value: selectedShoot?.name ? (selectedShoot.price == null ? `CUSTOM REQUEST — ${selectedShoot.name} (price to be confirmed)` : `${selectedShoot.name} — $${selectedShoot.price?.toLocaleString()} + GST`) : '' },
                          { label: 'Filming orientation', value: selectedShoot?.name === 'Property Ad' ? filmingOrientation : '' },
                          { label: 'Deliverables', value: selectedDel?.name },
                          { label: 'Add-ons', value: selectedAddons.length ? selectedAddons.map(a => a.name).join(', ') : 'None' },
                          { label: 'Travel fee', value: travelFee > 0 ? `$${travelFee} + GST (auto-calculated)` : '' },
                          { label: 'Address', value: propertyAddress },
                          { label: 'Property type', value: homeType },
                          { label: 'Preferred date', value: preferredDate ? preferredDate + (preferredTime ? ' at ' + formatTime12(preferredTime) : '') : 'TBC' },
                          { label: 'Notes', value: bookingNotes },
                          { label: 'Property features', value: propertyFeatures },
                          { label: 'Attachments', value: bookingAttachments.map(a => `${a.name}: ${a.url}`).join('\n') },
                        ]
                        await fetch('/api/notify-booking', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            category: selectedCat,
                            clientName: clientContactName || accountEmail,
                            clientEmail: clientEmail2 || accountEmail,
                            title: selectedCat === 'commercial' ? (projectTitle || projectType) : propertyAddress,
                            details: details.filter(d => d.value),
                          }),
                        })
                      } catch (e) { console.error('Notify-booking error:', e) }
                      setSubmittingBooking(false)
                      setBookingStep(7)
                    }} disabled={!tcAccepted || submittingBooking} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: tcAccepted && !submittingBooking ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: tcAccepted && !submittingBooking ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: tcAccepted && !submittingBooking ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>{submittingBooking ? 'Submitting...' : selectedCat === 'commercial' ? 'Submit request →' : 'Submit booking request →'}</button>
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
                    <button onClick={() => { setBookingStep(1); setSelectedCat(''); setSelectedShoot(null); setSelectedDel(null); setSelectedAddons([]); setTcAccepted(false); setPreferredDate(''); setDraftDue(''); setDeliveryDue(''); setBookingNotes(''); setAccessNotes(''); setPropertyAddress(''); setProjectType(''); setProjectTitle(''); setProjectDescription(''); setTargetAudience(''); setKeyMessage(''); setTalentDetails(''); setBriefDeliverables([{ id: '1', name: '', quantity: 1, duration: '', formats: [], notes: '' }]); setDateFlexible(false); setShootDuration(''); setReferenceLinks([]); setBudgetRange(''); setBookingAttachments([]) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Book another shoot</button>
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
          const pendingBookings = clientBookings.filter((b: any) => b.status === 'pending' || b.status === 'date_proposed' || b.status === 'alt_requested' || b.status === 'meeting_booked' || b.status === 'meeting_alt_requested' || (b.status === 'confirmed' && !b.project_id))
          // A booking cancelled after a project already existed shouldn't just
          // vanish on the client — they still see it here, clearly labelled.
          // Declined requests (never became a project) are left out entirely
          // rather than shown as a dead end.
          const cancelledBookings = clientBookings.filter((b: any) => b.status === 'cancelled').sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
                        // meeting_booked, meeting_alt_requested and plain
                        // pending all share the same expandable details +
                        // "Request a change" composer — only the icon,
                        // colour and status line differ.
                        const expanded = expandedBookingId === b.id
                        const isMeeting = b.status === 'meeting_booked' || b.status === 'meeting_alt_requested'
                        const badge = b.status === 'meeting_alt_requested'
                          ? { label: 'Awaiting new time', bg: 'rgba(160,100,220,0.12)', color: 'rgba(160,100,220,0.9)', border: 'rgba(160,100,220,0.25)' }
                          : b.status === 'meeting_booked'
                          ? { label: 'Meeting booked', bg: 'rgba(100,150,220,0.12)', color: 'rgba(100,150,220,0.9)', border: 'rgba(100,150,220,0.25)' }
                          : { label: 'Pending', bg: 'rgba(210,175,80,0.12)', color: 'rgba(210,175,80,0.9)', border: 'rgba(210,175,80,0.25)' }
                        return (
                          <div key={b.id} style={{ borderBottom: isLast ? 'none' : '0.5px solid rgba(200,194,187,0.06)' }}>
                            <div onClick={() => setExpandedBookingId(expanded ? null : b.id)} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', cursor:'pointer' }}>
                              <div style={{ width:42, flexShrink:0, textAlign:'center', background: isMeeting ? 'rgba(100,150,220,0.08)' : 'rgba(210,175,80,0.08)', border: `0.5px solid ${isMeeting ? 'rgba(100,150,220,0.2)' : 'rgba(210,175,80,0.2)'}`, borderRadius:5, padding:'10px 4px' }}>
                                {isMeeting ? <IconCalendar size={16} style={{ color: 'rgba(100,150,220,0.85)' }} /> : <IconClock size={16} style={{ color: 'rgba(210,175,80,0.8)' }} />}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, fontWeight:500, color:'#C8C2BB', marginBottom:2 }}>{b.address || b.shoot_package || 'Booking request'}</div>
                                <div style={{ fontSize:11, color: isMeeting ? 'rgba(100,150,220,0.9)' : 'rgba(200,194,187,0.4)' }}>
                                  {b.status === 'meeting_booked'
                                    ? (b.proposed_date ? 'Call booked: ' + new Date(b.proposed_date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'}) + (b.proposed_start_time ? ' · ' + formatTime12(b.proposed_start_time) : '') : 'A discovery call has been booked') + ' — we\'ll confirm your shoot after we talk'
                                    : b.status === 'meeting_alt_requested'
                                    ? 'Waiting on Example Content for a new meeting time'
                                    : `${b.shoot_package || ''} ${b.preferred_date ? '· ' + new Date(b.preferred_date+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}`}
                                </div>
                              </div>
                              <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:badge.bg, color:badge.color, border:`0.5px solid ${badge.border}` }}>{badge.label}</span>
                              <span style={{ fontSize:14, color:'rgba(200,194,187,0.3)', transform: expanded ? 'rotate(180deg)' : 'none', transition:'transform 0.15s ease' }}>▾</span>
                            </div>
                            {expanded && (
                              <div style={{ padding:'0 18px 18px 74px' }}>
                                <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:16, fontSize:12, color:'rgba(200,194,187,0.65)', lineHeight:1.6 }}>
                                  {b.shoot_package && <div><span style={{color:'#C8C2BB', fontWeight:500}}>Package: </span>{b.shoot_package}{b.total ? ' — ' + b.total : ''}</div>}
                                  {b.deliverables && <div><span style={{color:'#C8C2BB', fontWeight:500}}>Deliverables: </span>{b.deliverables}</div>}
                                  {b.addons && <div><span style={{color:'#C8C2BB', fontWeight:500}}>Add-ons: </span>{b.addons}</div>}
                                  {isMeeting && b.proposed_date && <div><span style={{color:'#C8C2BB', fontWeight:500}}>Meeting time: </span>{new Date(b.proposed_date+'T12:00:00').toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}{b.proposed_start_time ? ' · '+formatTime12(b.proposed_start_time) : ''}</div>}
                                </div>
                                <div style={{ marginBottom: 16, paddingTop: 14, borderTop: '0.5px solid rgba(200,194,187,0.07)' }}>
                                  <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>Details submitted with this booking</div>
                                  <FullBookingDetails record={b} isCommercial={b.category !== 'property'} />
                                </div>
                                {changeRequestBookingId === b.id ? (
                                  <div onClick={e => e.stopPropagation()}>
                                    <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                                      {(['package', 'date', 'addons', 'other'] as const).map(t => (
                                        <button key={t} onClick={() => setChangeRequestType(t)} style={{ fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', padding:'6px 11px', borderRadius:3, border:`0.5px solid ${changeRequestType===t ? 'rgba(200,194,187,0.5)' : 'rgba(200,194,187,0.15)'}`, background: changeRequestType===t ? '#C8C2BB' : 'transparent', color: changeRequestType===t ? '#111' : 'rgba(200,194,187,0.5)', cursor:'pointer', fontFamily:'inherit', fontWeight: changeRequestType===t ? 500 : 400 }}>{{ package:'Package', date:'Date / time', addons:'Add-ons', other:'Other' }[t]}</button>
                                      ))}
                                    </div>
                                    <textarea value={changeRequestMessage} onChange={e => setChangeRequestMessage(e.target.value)} placeholder="Describe the change you'd like..." rows={2} style={{ width:'100%', background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'8px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', marginBottom:8 }} />
                                    <div style={{ display:'flex', gap:8 }}>
                                      <button onClick={() => { setChangeRequestBookingId(null); setChangeRequestMessage('') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                                      <button disabled={submittingChangeRequest || !changeRequestMessage.trim()} onClick={() => submitBookingChangeRequest(b)} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background: submittingChangeRequest || !changeRequestMessage.trim() ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: submittingChangeRequest || !changeRequestMessage.trim() ? 'rgba(200,194,187,0.3)' : '#111', border:'none', cursor: submittingChangeRequest || !changeRequestMessage.trim() ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit' }}>{submittingChangeRequest ? 'Sending...' : 'Send request'}</button>
                                    </div>
                                  </div>
                                ) : addDetailsOpenId === 'b:' + b.id ? (
                                  <div onClick={e => e.stopPropagation()}>
                                    <textarea value={addDetailsText} onChange={e => setAddDetailsText(e.target.value)} placeholder="Anything you didn't get to add before — brief notes, shot requests, access info..." rows={3} style={{ width:'100%', background:'rgba(200,194,187,0.04)', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:4, padding:'8px 10px', fontSize:12, color:'#C8C2BB', fontFamily:'inherit', outline:'none', resize:'vertical', marginBottom:8 }} />
                                    <AttachmentUploader attachments={addDetailsFiles} uploading={uploadingAddDetails} onUpload={uploadAddDetailsFiles} onRemove={removeAddDetailsFile} />
                                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                                      <button onClick={() => { setAddDetailsOpenId(null); setAddDetailsText(''); setAddDetailsFiles([]) }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
                                      <button disabled={submittingAddDetails || (!addDetailsText.trim() && addDetailsFiles.length === 0)} onClick={() => submitAdditionalDetails({ kind: 'booking', booking: b })} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, background: submittingAddDetails || (!addDetailsText.trim() && addDetailsFiles.length === 0) ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: submittingAddDetails || (!addDetailsText.trim() && addDetailsFiles.length === 0) ? 'rgba(200,194,187,0.3)' : '#111', border:'none', cursor: submittingAddDetails ? 'not-allowed' : 'pointer', fontWeight:500, fontFamily:'inherit' }}>{submittingAddDetails ? 'Sending...' : 'Add details'}</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' as const }}>
                                    <button onClick={e => { e.stopPropagation(); setChangeRequestBookingId(b.id); setChangeRequestType('other'); setChangeRequestMessage('') }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Request a change</button>
                                    <button onClick={e => { e.stopPropagation(); setAddDetailsOpenId('b:' + b.id); setAddDetailsText(''); setAddDetailsFiles([]) }} style={{ fontSize:11, letterSpacing:'0.09em', textTransform:'uppercase', padding:'7px 14px', borderRadius:3, border:'0.5px solid rgba(200,194,187,0.2)', color:'rgba(200,194,187,0.5)', background:'transparent', cursor:'pointer', fontFamily:'inherit' }}>Add details / brief</button>
                                  </div>
                                )}
                              </div>
                            )}
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
                            <button
                              title="Add additional details"
                              onClick={e => { e.stopPropagation(); setSelectedProject(p); setAddDetailsOpenId('p:' + p.id); setAddDetailsText(''); setAddDetailsFiles([]) }}
                              style={{ width: 22, height: 22, borderRadius: '50%', border: '0.5px solid rgba(200,194,187,0.2)', background: 'transparent', color: 'rgba(200,194,187,0.5)', fontSize: 13, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }}
                            >+</button>
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
                {/* CANCELLED */}
                {cancelledBookings.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'rgba(200,194,187,0.3)', marginBottom:12 }}>Cancelled</div>
                    <div style={{ background:'#1A1F28', border:'0.5px solid rgba(200,194,187,0.09)', borderRadius:7, overflow:'hidden' }}>
                      {cancelledBookings.map((b: any, i: number) => (
                        <div key={b.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < cancelledBookings.length-1 ? '0.5px solid rgba(200,194,187,0.06)':'none' }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'rgba(200,194,187,0.6)', marginBottom:2, textDecoration:'line-through' }}>{b.address || b.shoot_package || 'Booking request'}</div>
                            <div style={{ fontSize:11, color:'rgba(200,194,187,0.35)' }}>{(b.proposed_date || b.preferred_date) ? new Date((b.proposed_date || b.preferred_date)+'T12:00:00').toLocaleDateString('en-NZ',{day:'numeric',month:'short',year:'numeric'}) : ''}</div>
                          </div>
                          <span style={{ fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', padding:'3px 9px', borderRadius:2, background:'rgba(210,90,90,0.1)', color:'rgba(210,90,90,0.8)', border:'0.5px solid rgba(210,90,90,0.25)' }}>Cancelled</span>
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
                  <DriveFolder project={libraryProject} clientEmail={accountEmail} clientName={clientProfile?.name} />
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

        {activeView === 'team' && (() => {
          const isSubUser = !!accountEmail && accountEmail !== user?.email
          const initials = (name: string, email: string) => (name || email || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          const fmtJoined = (d?: string) => d ? new Date(d).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : null

          function AvatarCircle({ url, name, email, size }: { url?: string | null; name: string; email: string; size: number }) {
            return url ? (
              <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #3D4756 0%, #2A323E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: '#C8C2BB', flexShrink: 0 }}>{initials(name, email)}</div>
            )
          }

          // Card data for both the main account and every active teammate,
          // in one shape so the grid and the profile modal can share logic.
          const cards = [
            { id: 'main', name: clientProfile?.name || accountEmail || '', email: accountEmail || '', avatar_url: clientProfile?.avatar_url, role_title: null as string | null, created_at: clientProfile?.created_at, isMain: true },
            ...teamMembers.map(m => ({ id: m.id, name: m.member_name || m.member_email, email: m.member_email, avatar_url: m.avatar_url, role_title: m.role_title ?? null, created_at: m.created_at, isMain: false })),
          ]
          const openCard = cards.find(c => c.id === teamProfileOpen)

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Team</div>
                  <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>People with full access to this account</div>
                </div>
                <button onClick={() => setActiveView('dashboard')} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
              </div>
              <div style={{ padding: 28 }}>
                {isSubUser && (
                  <div style={{ fontSize: 12, color: 'rgba(210,175,80,0.85)', background: 'rgba(210,175,80,0.08)', border: '0.5px solid rgba(210,175,80,0.25)', borderRadius: 6, padding: '12px 16px', marginBottom: 20, lineHeight: 1.6 }}>
                    You're signed in as a teammate on this account ({user?.email}) — invites and removals here apply to the whole account, same as the main account holder.
                  </div>
                )}

                {/* TEAM GRID — the main, bigger focus of the page now */}
                <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 12 }}>{cards.length} {cards.length === 1 ? 'person' : 'people'} on this account</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
                  {cards.map(c => (
                    <div key={c.id} onClick={() => setTeamProfileOpen(c.id)} style={{ background: 'linear-gradient(135deg, rgba(35,42,56,0.6) 0%, rgba(22,27,38,0.9) 100%)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 10, padding: 20, cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(200,194,187,0.25)')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(200,194,187,0.09)')}>
                      <AvatarCircle url={c.avatar_url} name={c.name} email={c.email} size={52} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.isMain ? 'rgba(100,200,130,0.75)' : 'rgba(100,150,220,0.75)', marginTop: 4 }}>{c.isMain ? 'Main account' : (c.role_title || 'Teammate')}</div>
                      <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                      {fmtJoined(c.created_at) && <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.25)', marginTop: 4 }}>Joined {fmtJoined(c.created_at)}</div>}
                    </div>
                  ))}
                </div>

                <div style={{ maxWidth: 640 }}>
                {showTeamInviteNudge && !isSubUser && (
                  <div style={{ position: 'relative', marginBottom: 16 }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(210,175,80,0.14), rgba(210,175,80,0.05))', border: '0.5px solid rgba(210,175,80,0.3)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ fontSize: 15, lineHeight: 1.3 }}>👋</div>
                      <div style={{ flex: 1, fontSize: 12, color: 'rgba(230,205,140,0.95)', lineHeight: 1.6 }}>
                        Working with others? Invite your team below so everyone sees the same bookings, deliverables and invoices.
                      </div>
                      <button onClick={() => setShowTeamInviteNudge(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(210,175,80,0.6)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                    <div style={{ position: 'absolute', bottom: -6, left: 28, width: 11, height: 11, background: '#211c13', borderRight: '0.5px solid rgba(210,175,80,0.3)', borderBottom: '0.5px solid rgba(210,175,80,0.3)', transform: 'rotate(45deg)' }} />
                  </div>
                )}
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Invite a teammate</div>
                  <div style={{ padding: 18, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                    <input value={teamInviteName} onChange={e => setTeamInviteName(e.target.value)} placeholder="Name" style={{ flex: '1 1 160px', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    <input type="email" value={teamInviteEmail} onChange={e => setTeamInviteEmail(e.target.value)} placeholder="their.email@company.com" style={{ flex: '2 1 220px', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                    <button disabled={sendingTeamInvite || !teamInviteEmail.trim()} onClick={handleSendTeamInvite} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: teamInviteEmail.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: teamInviteEmail.trim() ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: teamInviteEmail.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>{sendingTeamInvite ? 'Sending...' : 'Send invite'}</button>
                  </div>
                  {teamInviteNotice && (
                    <div style={{
                      margin: '0 18px 18px',
                      padding: '10px 14px',
                      borderRadius: 4,
                      fontSize: 12,
                      lineHeight: 1.5,
                      background: teamInviteNotice.type === 'success' ? 'rgba(100,200,130,0.08)' : teamInviteNotice.type === 'warning' ? 'rgba(210,175,80,0.08)' : 'rgba(210,90,90,0.08)',
                      border: `0.5px solid ${teamInviteNotice.type === 'success' ? 'rgba(100,200,130,0.25)' : teamInviteNotice.type === 'warning' ? 'rgba(210,175,80,0.25)' : 'rgba(210,90,90,0.25)'}`,
                      color: teamInviteNotice.type === 'success' ? 'rgba(100,200,130,0.9)' : teamInviteNotice.type === 'warning' ? 'rgba(210,175,80,0.9)' : 'rgba(210,90,90,0.9)',
                    }}>{teamInviteNotice.message}</div>
                  )}
                </div>
                {teamInvites.length > 0 && (
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                    <div style={{ padding: '13px 18px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', fontSize: 12, fontWeight: 500, color: '#C8C2BB' }}>Pending invites</div>
                    {teamInvites.map(inv => (
                      <div key={inv.id} style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(200,194,187,0.06)' }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#C8C2BB' }}>{inv.invited_name || inv.invited_email}</div>
                          <div style={{ fontSize: 11, color: 'rgba(210,175,80,0.7)' }}>{inv.invited_email} · awaiting acceptance</div>
                        </div>
                        <button onClick={() => handleRevokeTeamInvite(inv.id)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Revoke</button>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              </div>

              {/* PROFILE MODAL */}
              {openCard && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setTeamProfileOpen(null); setEditingProfile(false); setAvatarUploadError('') } }}>
                  <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 12, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center', position: 'relative' }}>
                    <button onClick={() => { setTeamProfileOpen(null); setEditingProfile(false); setAvatarUploadError('') }} style={{ position: 'absolute', top: 14, right: 14, fontSize: 18, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>

                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                      <AvatarCircle url={openCard.avatar_url} name={openCard.name} email={openCard.email} size={88} />
                      {isOwnCard(openCard.id) && (
                        <label style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#C8C2BB', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingAvatar ? 'default' : 'pointer', border: '2px solid #1A1F28', fontSize: 12 }}>
                          {uploadingAvatar ? (
                            <span style={{ fontSize: 11, color: '#111' }}>…</span>
                          ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                          )}
                          <input type="file" accept="image/*" disabled={uploadingAvatar} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f, openCard.id); e.target.value = '' }} />
                        </label>
                      )}
                    </div>
                    {avatarUploadError && <div style={{ fontSize: 11, color: 'rgba(210,90,90,0.85)', marginBottom: 10 }}>{avatarUploadError}</div>}

                    {editingProfile ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, textAlign: 'left' as const }}>
                        <div>
                          <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', display: 'block', marginBottom: 4 }}>Full name</label>
                          <input autoFocus value={profileDraft.name} onChange={e => setProfileDraft(d => ({ ...d, name: e.target.value }))} style={{ fontSize: 13, background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.2)', borderRadius: 4, padding: '8px 10px', color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                        </div>
                        {openCard.isMain ? (
                          <>
                            <div>
                              <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', display: 'block', marginBottom: 4 }}>Company / agency</label>
                              <input value={profileDraft.company} onChange={e => setProfileDraft(d => ({ ...d, company: e.target.value }))} style={{ fontSize: 13, background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.2)', borderRadius: 4, padding: '8px 10px', color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', display: 'block', marginBottom: 4 }}>Phone</label>
                              <input value={profileDraft.phone} onChange={e => setProfileDraft(d => ({ ...d, phone: e.target.value }))} placeholder="021 123 4567" style={{ fontSize: 13, background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.2)', borderRadius: 4, padding: '8px 10px', color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                            </div>
                          </>
                        ) : (
                          <div>
                            <label style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', display: 'block', marginBottom: 4 }}>Role</label>
                            <input value={profileDraft.role} onChange={e => setProfileDraft(d => ({ ...d, role: e.target.value }))} placeholder="e.g. Marketing Manager" style={{ fontSize: 13, background: 'rgba(200,194,187,0.06)', border: '0.5px solid rgba(200,194,187,0.2)', borderRadius: 4, padding: '8px 10px', color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button onClick={() => setEditingProfile(false)} style={{ flex: 1, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 0', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                          <button onClick={() => saveProfile(openCard.id, openCard.isMain)} style={{ flex: 1, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 0', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{openCard.name}</div>
                          {isOwnCard(openCard.id) && (
                            <button onClick={() => { setProfileDraft({ name: openCard.name || '', company: clientProfile?.company || '', phone: clientProfile?.phone || '', role: openCard.role_title || '' }); setEditingProfile(true) }} title="Edit profile" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(200,194,187,0.4)', padding: 2, display: 'flex' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                            </button>
                          )}
                        </div>
                        {openCard.isMain ? (
                          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,200,130,0.8)', marginBottom: 16 }}>Main account</div>
                        ) : (
                          <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,150,220,0.8)', marginBottom: 16 }}>{openCard.role_title || 'Teammate'}</div>
                        )}
                      </>
                    )}

                    <div style={{ background: 'rgba(200,194,187,0.03)', border: '0.5px solid rgba(200,194,187,0.07)', borderRadius: 6, padding: '14px 16px', marginBottom: 16, textAlign: 'left' as const, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: 'rgba(200,194,187,0.35)' }}>Email</span>
                        <span style={{ color: '#C8C2BB' }}>{openCard.email}</span>
                      </div>
                      {openCard.isMain && clientProfile?.company && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'rgba(200,194,187,0.35)' }}>Company</span>
                          <span style={{ color: '#C8C2BB' }}>{clientProfile.company}</span>
                        </div>
                      )}
                      {openCard.isMain && clientProfile?.phone && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'rgba(200,194,187,0.35)' }}>Phone</span>
                          <span style={{ color: '#C8C2BB' }}>{clientProfile.phone}</span>
                        </div>
                      )}
                      {fmtJoined(openCard.created_at) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'rgba(200,194,187,0.35)' }}>Joined</span>
                          <span style={{ color: '#C8C2BB' }}>{fmtJoined(openCard.created_at)}</span>
                        </div>
                      )}
                    </div>

                    {!openCard.isMain && !editingProfile && (
                      <button onClick={() => { handleRemoveTeamMember(openCard.id); setTeamProfileOpen(null) }} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>Remove from team</button>
                    )}
                  </div>
                </div>
              )}
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

              {selectedProject.shoot_date && (
                <button
                  onClick={() => downloadIcsFile(
                    (selectedProject.title || 'shoot') + '.ics',
                    buildShootIcs({
                      uid: selectedProject.id,
                      title: 'Example Content — ' + selectedProject.title,
                      description: 'Shoot with Example Content' + (selectedProject.shoot_package ? ' — ' + selectedProject.shoot_package : ''),
                      location: selectedProject.address || '',
                      date: selectedProject.shoot_date,
                      startTime: selectedProject.shoot_window_start,
                      endTime: selectedProject.shoot_window_end,
                    })
                  )}
                  style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <IconCalendar size={13} /> Add to calendar
                </button>
              )}

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

              {/* DETAILS PROVIDED — every Step 5 field from booking time, filled in
                  or not, so it's clear at a glance what's still missing. */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 10 }}>Details submitted with this booking</div>
                <FullBookingDetails record={selectedProject} isCommercial={selectedProject.category !== 'Property'} />
              </div>

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
                      const { data: created } = await supabase.from('change_requests').insert([{
                        project_id: selectedProject.id || null,
                        client_email: accountEmail,
                        client_name: clientProfile?.name || accountEmail,
                        message: changeRequest,
                        status: 'pending',
                        project_title: selectedProject.title || '',
                      }]).select().single()
                      if (created) setPendingChangeRequests(p => [created, ...p])
                      setChangeRequestSent(true)
                      setChangeRequest('')
                    }} disabled={!changeRequest.trim()} style={{ marginTop: 10, fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: changeRequest.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: changeRequest.trim() ? '#111' : 'rgba(200,194,187,0.2)', border: 'none', cursor: changeRequest.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>Send request</button>
                  </div>
                )}
              </div>

              {/* ADD ADDITIONAL DETAILS — for anything not included at booking time,
                  a brief, reference files, access notes, etc. */}
              <div style={{ borderTop: '0.5px solid rgba(200,194,187,0.09)', paddingTop: 20, marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 6 }}>Add additional details</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginBottom: 12 }}>Forgot to add a brief, shot list or reference files? Add them here any time before the shoot.</div>
                {addDetailsOpenId === 'p:' + selectedProject.id ? (
                  <div>
                    <textarea value={addDetailsText} onChange={e => setAddDetailsText(e.target.value)} placeholder="Brief notes, shot requests, access info, anything else we should know..." rows={3} style={{ width: '100%', background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', lineHeight: 1.65, resize: 'vertical' as const, minHeight: 80, marginBottom: 10 }} />
                    <AttachmentUploader attachments={addDetailsFiles} uploading={uploadingAddDetails} onUpload={uploadAddDetailsFiles} onRemove={removeAddDetailsFile} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button onClick={() => { setAddDetailsOpenId(null); setAddDetailsText(''); setAddDetailsFiles([]) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                      <button disabled={submittingAddDetails || (!addDetailsText.trim() && addDetailsFiles.length === 0)} onClick={() => submitAdditionalDetails({ kind: 'project', project: selectedProject })} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: submittingAddDetails || (!addDetailsText.trim() && addDetailsFiles.length === 0) ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: submittingAddDetails || (!addDetailsText.trim() && addDetailsFiles.length === 0) ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: submittingAddDetails ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{submittingAddDetails ? 'Sending...' : 'Add details'}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddDetailsOpenId('p:' + selectedProject.id); setAddDetailsText(''); setAddDetailsFiles([]) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add additional details</button>
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
              <button onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('user_email', accountEmail); setNotifications([]); setShowNotifications(false) }} style={{ fontSize: 20, color: 'rgba(200,194,187,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
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
              <button onClick={async () => { await supabase.from('notifications').update({ read: true }).eq('user_email', accountEmail); setNotifications([]); setShowNotifications(false) }} style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 28px', borderRadius: 4, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>OK</button>
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
                  const { data: created } = await supabase.from('change_requests').insert([{
                    project_id: selectedProject.id || null,
                    client_email: accountEmail,
                    client_name: clientProfile?.name || accountEmail,
                    message,
                    status: 'pending',
                    project_title: selectedProject.title || '',
                    type: 'cancellation',
                  }]).select().single()
                  if (created) setPendingChangeRequests(p => [created, ...p])
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
