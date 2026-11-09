'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Project = { id: string; title: string; client: string; address: string; category: string; drive_url: string; delivery_due: string; shoot_date: string }

export default function PublicContentViewer() {
  const params = useParams()
  const id = params?.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    fetch(`/api/view-project?id=${id}`)
      .then(r => r.json())
      .then(data => { if (data.project) setProject(data.project); else setNotFound(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif' }}>
        <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
      </main>
    )
  }

  if (notFound || !project) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Geist, sans-serif', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 36, objectFit: 'contain', opacity: 0.6, marginBottom: 8 }} />
        <div style={{ color: 'rgba(200,194,187,0.5)', fontSize: 14 }}>This link isn't available.</div>
        <div style={{ color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>It may have been removed, or the content hasn't been delivered yet. Contact Example Content if you think this is a mistake.</div>
      </main>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Geist, sans-serif', color: '#C8C2BB' }}>
      <div style={{ padding: '18px clamp(20px, 5vw, 40px)', borderBottom: '0.5px solid rgba(200,194,187,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(14,16,20,0.92)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 30, objectFit: 'contain' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)' }}>Shared with you</span>
      </div>
      <div style={{ padding: 'clamp(20px, 5vw, 40px)', maxWidth: 1100, margin: '0 auto' }}>
        <PublicDriveViewer project={project} />
      </div>
    </main>
  )
}

function PublicDriveViewer({ project }: { project: Project }) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [stack, setStack] = useState<{ id: string; name: string }[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [rootFolderId, setRootFolderId] = useState<string | null>(null)
  // Nudges an anonymous visitor toward creating a real account — fires 5s
  // after landing on the page, regardless of whether they've clicked
  // anything yet, so it reaches browsers who never open a file at all.
  const [showSignupNudge, setShowSignupNudge] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowSignupNudge(true), 5000)
    return () => clearTimeout(t)
  }, [])
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedbackName, setFeedbackName] = useState('')
  const [feedbackEmail, setFeedbackEmail] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

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

  useEffect(() => { loadRoot() }, [project.drive_url])

  function openPreview(file: any) {
    setPreviewFile(file)
  }

  async function submitFeedback() {
    if (!feedbackEmail.trim() || !feedbackMessage.trim()) return
    setSubmittingFeedback(true)
    try {
      await fetch('/api/video-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectTitle: project.title,
          clientName: feedbackName.trim() || feedbackEmail.trim(),
          clientEmail: feedbackEmail.trim(),
          message: feedbackMessage.trim(),
        }),
      })
      setFeedbackSent(true)
      setFeedbackMessage('')
    } catch (e) {
      console.error('Public feedback error:', e)
    }
    setSubmittingFeedback(false)
  }

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
  // click into the next file each time.
  const navigableFiles = files.filter(f => !isFolder(f.mimeType))
  function previewIndex() { return navigableFiles.findIndex(f => f.id === previewFile?.id) }
  function previewStep(delta: number) {
    const i = previewIndex()
    if (i === -1) return
    const next = navigableFiles[i + delta]
    if (next) setPreviewFile(next)
  }
  useEffect(() => {
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

  if (loading) return <div style={{ color: 'rgba(200,194,187,0.2)', fontSize: 12, padding: '40px 0', textAlign: 'center' }}>Loading files...</div>

  return (
    <div>
      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' as const }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 6 }}>{project.title}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
              {project.shoot_date && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Shoot: {new Date(project.shoot_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
              {project.address && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{project.address.split(',')[0]}</div>}
              <div style={{ fontSize: 11, color: 'rgba(100,200,130,0.7)' }}>{files.length} item{files.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <button onClick={() => setShowFeedbackModal(true)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>Leave feedback / request changes</button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10, marginBottom: 14 }}>
        {stack.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 10, fontSize: 11 }}>
            <button onClick={() => goToCrumb(stack.length - 2)} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4 }}>
              <span onClick={() => goToCrumb(-1)} style={{ cursor: 'pointer', color: 'rgba(200,194,187,0.4)', textDecoration: 'underline' }}>📁 {project.title}</span>
              {stack.map((s, i) => (
                <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'rgba(200,194,187,0.25)' }}>/</span>
                  <span onClick={() => goToCrumb(i)} style={{ cursor: i < stack.length - 1 ? 'pointer' : 'default', color: i < stack.length - 1 ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: i < stack.length - 1 ? 'underline' : 'none' }}>{s.name}</span>
                </span>
              ))}
            </div>
          </div>
        ) : <div />}
        {files.length > 0 && (
          <a
            href={`/api/drive/download-all?folderId=${stack.length > 0 ? stack[stack.length - 1].id : rootFolderId}&name=${encodeURIComponent(stack.length > 0 ? stack[stack.length - 1].name : project.title)}`}
            style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.6)', background: 'transparent', textDecoration: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}
          >Download all (.zip)</a>
        )}
      </div>
      {files.length === 0 ? (
        <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '40px 20px', textAlign: 'center', color: 'rgba(200,194,187,0.25)', fontSize: 13 }}>No files in this folder</div>
      ) : (
        <>
          {files.some(f => !isFolder(f.mimeType)) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 12, minHeight: 28 }}>
              {selectedFileIds.size > 0 && (
                <>
                  <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.5)' }}>{selectedFileIds.size} selected</span>
                  <button onClick={() => setSelectedFileIds(new Set())} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 12px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.12)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                  <button onClick={downloadSelected} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Download selected ({selectedFileIds.size})</button>
                </>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'flex-start', gap: 14 }}>
            {files.map((file: any) => (
              <div key={file.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', cursor: 'pointer', width: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? 'calc(33% - 10px)' : 'calc(50% - 7px)', minWidth: 160 }} onClick={() => { if (isFolder(file.mimeType)) openFolder(file); else openPreview(file) }}>
                <div style={{ aspectRatio: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? '9/16' : '16/9', background: '#0E1014', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isFolder(file.mimeType) ? (
                    <FolderThumb folderId={file.id} />
                  ) : isVideo(file.mimeType) ? (
                    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0a0c10' }} onClick={e => e.stopPropagation()}>
                      <iframe src={`https://drive.google.com/file/d/${file.id}/preview`} style={{ width: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? '56%' : '100%', height: 'calc(100% + 220px)', border: 'none', marginTop: '-110px', marginBottom: '-110px' }} allow="autoplay; fullscreen" allowFullScreen />
                    </div>
                  ) : isImage(file.mimeType) ? (
                    <img src={`https://lh3.googleusercontent.com/d/${file.id}`} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { const t = e.target as HTMLImageElement; t.src = `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`; t.onerror = () => { t.style.display = 'none' } }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📄</div>
                  )}
                  {!isFolder(file.mimeType) && <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.6)', color: '#C8C2BB', padding: '3px 8px', borderRadius: 2 }}>{isVideo(file.mimeType) ? 'Video' : isImage(file.mimeType) ? 'Photo' : 'File'}</span>}
                  {!isFolder(file.mimeType) && (
                    <div onClick={e => { e.stopPropagation(); toggleFileSelected(file.id) }} style={{ position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderRadius: 4, border: selectedFileIds.has(file.id) ? 'none' : '1.5px solid rgba(255,255,255,0.55)', background: selectedFileIds.has(file.id) ? '#C8C2BB' : 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
                      {selectedFileIds.has(file.id) && <span style={{ fontSize: 12, color: '#111', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 14px 6px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#C8C2BB', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  {file.size && <div style={{ fontSize: 10, color: 'rgba(200,194,187,0.35)' }}>{(parseInt(file.size) / 1024 / 1024).toFixed(1)} MB</div>}
                </div>
                {isFolder(file.mimeType) ? (
                  <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.3)', padding: '6px 14px 12px' }}>Open folder →</div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, padding: '6px 14px 12px' }}>
                    <button onClick={e => { e.stopPropagation(); openPreview(file) }} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.09)', color: 'rgba(200,194,187,0.4)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Preview</button>
                    <a href={`/api/drive/download?id=${file.id}&name=${encodeURIComponent(file.name)}`} download={file.name} onClick={e => e.stopPropagation()} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.09)', color: 'rgba(200,194,187,0.4)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>Download</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPreviewFile(null)}>
          <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 12, alignItems: 'center', zIndex: 10 }} onClick={e => e.stopPropagation()}>
            {navigableFiles.length > 1 && <span style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{previewIndex() + 1} / {navigableFiles.length}</span>}
            <a href={`/api/drive/download?id=${previewFile.id}&name=${encodeURIComponent(previewFile.name)}`} download={previewFile.name} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500 }}>Download</a>
            <button onClick={() => setPreviewFile(null)} style={{ fontSize: 24, color: 'rgba(200,194,187,0.5)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
          {previewIndex() > 0 && (
            <button onClick={e => { e.stopPropagation(); previewStep(-1) }} aria-label="Previous file" style={{ position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(200,194,187,0.2)', color: '#C8C2BB', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          )}
          {previewIndex() < navigableFiles.length - 1 && (
            <button onClick={e => { e.stopPropagation(); previewStep(1) }} aria-label="Next file" style={{ position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(200,194,187,0.2)', color: '#C8C2BB', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          )}
          <div style={{ width: '94vw', height: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }} onClick={e => e.stopPropagation()}>
            {isVideo(previewFile.mimeType) ? (
              <iframe src={`https://drive.google.com/file/d/${previewFile.id}/preview`} style={{ width: '100%', maxWidth: previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width) ? 'min(40vw,700px)' : '84vw', height: '82vh', border: 'none', borderRadius: 6 }} allow="autoplay; fullscreen" allowFullScreen />
            ) : isImage(previewFile.mimeType) ? (
              <img src={`/api/drive?thumb=${previewFile.id}&size=2000`} alt={previewFile.name} style={{ maxWidth: '94vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color: '#C8C2BB', fontSize: 14 }}>Open file in Google Drive</a>
            )}
            <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.6)' }}>{previewFile.name}</div>
          </div>
        </div>
      )}

      {/* SIGNUP NUDGE — shown once, the first time this visitor opens a piece
          of content, not before they've actually seen anything. */}
      {showSignupNudge && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowSignupNudge(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 12, width: '100%', maxWidth: 400, padding: 28, textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }}>
            <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 30, objectFit: 'contain', marginBottom: 18 }} />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 10 }}>Like what you see?</div>
            <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.55)', lineHeight: 1.7, marginBottom: 22 }}>Sign up to the Example Content portal to make bookings for your projects and view all your content in one place.</div>
            <a href="/signup" style={{ display: 'block', fontSize: 12, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '13px', borderRadius: 4, background: '#C8C2BB', color: '#111', textDecoration: 'none', fontWeight: 600, marginBottom: 10 }}>Sign up</a>
            <button onClick={() => setShowSignupNudge(false)} style={{ fontSize: 12, color: 'rgba(200,194,187,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* LEAVE FEEDBACK / REQUEST CHANGES — for a visitor with no account,
          emails the studio directly via the same route logged-in client
          feedback already uses. */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowFeedbackModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, width: '100%', maxWidth: 440, padding: 26 }}>
            {feedbackSent ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 8 }}>✓ Sent</div>
                <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.5)', lineHeight: 1.6, marginBottom: 20 }}>Thanks — Example Content has been notified and will be in touch.</div>
                <button onClick={() => { setShowFeedbackModal(false); setFeedbackSent(false) }} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 6 }}>Leave feedback or request changes</div>
                <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)', marginBottom: 16, lineHeight: 1.6 }}>No account needed — this goes straight to Example Content.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <input value={feedbackName} onChange={e => setFeedbackName(e.target.value)} placeholder="Your name" style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                  <input type="email" value={feedbackEmail} onChange={e => setFeedbackEmail(e.target.value)} placeholder="Your email" required style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }} />
                  <textarea value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} placeholder="What would you like changed, or any feedback on the content..." rows={4} style={{ background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '10px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const, lineHeight: 1.6 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setShowFeedbackModal(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button disabled={submittingFeedback || !feedbackEmail.trim() || !feedbackMessage.trim()} onClick={submitFeedback} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '9px 18px', borderRadius: 3, background: submittingFeedback || !feedbackEmail.trim() || !feedbackMessage.trim() ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: submittingFeedback || !feedbackEmail.trim() || !feedbackMessage.trim() ? 'rgba(200,194,187,0.2)' : '#111', border: 'none', cursor: submittingFeedback ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{submittingFeedback ? 'Sending...' : 'Send'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FolderThumb({ folderId }: { folderId: string }) {
  const [firstFile, setFirstFile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const isMedia = (f: any) => f.mimeType?.includes('video') || f.mimeType?.includes('image')
    fetch(`/api/drive?folderId=${folderId}`)
      .then(r => r.json())
      .then(async data => {
        const items = data.files || []
        const media = items.find(isMedia)
        if (media) { if (!cancelled) { setFirstFile(media); setLoading(false) }; return }
        const subfolder = items.find((f: any) => f.mimeType === 'application/vnd.google-apps.folder')
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

  if (loading || !firstFile) return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📁</div>

  return isVideo(firstFile.mimeType) ? (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={`/api/drive?thumb=${firstFile.id}`} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <span style={{ position: 'relative', fontSize: 28, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>📁</span>
    </div>
  ) : (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <img src={`https://lh3.googleusercontent.com/d/${firstFile.id}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.6))' }}>📁</span>
    </div>
  )
}
