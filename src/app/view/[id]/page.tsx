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
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading...</div>
      </main>
    )
  }

  if (notFound || !project) {
    return (
      <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', gap: 16, textAlign: 'center', padding: '0 24px' }}>
        <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 36, objectFit: 'contain', opacity: 0.6, marginBottom: 8 }} />
        <div style={{ color: 'rgba(200,194,187,0.5)', fontSize: 14 }}>This link isn't available.</div>
        <div style={{ color: 'rgba(200,194,187,0.3)', fontSize: 12 }}>It may have been removed, or the content hasn't been delivered yet. Contact Example Content if you think this is a mistake.</div>
      </main>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB' }}>
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

  function loadRoot() {
    if (!project.drive_url) return
    setLoading(true)
    fetch(`/api/drive?url=${encodeURIComponent(project.drive_url)}`)
      .then(r => r.json())
      .then(data => { setFiles(data.files || []); setStack([]); setSelectedFileIds(new Set()); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadRoot() }, [project.drive_url])

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

  if (loading) return <div style={{ color: 'rgba(200,194,187,0.2)', fontSize: 12, padding: '40px 0', textAlign: 'center' }}>Loading files...</div>

  return (
    <div>
      <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#fff', marginBottom: 6 }}>{project.title}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const }}>
          {project.shoot_date && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>Shoot: {new Date(project.shoot_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
          {project.address && <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{project.address.split(',')[0]}</div>}
          <div style={{ fontSize: 11, color: 'rgba(100,200,130,0.7)' }}>{files.length} item{files.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {stack.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4, marginBottom: 14, fontSize: 11 }}>
          <span onClick={() => goToCrumb(-1)} style={{ cursor: 'pointer', color: 'rgba(200,194,187,0.4)', textDecoration: 'underline' }}>📁 {project.title}</span>
          {stack.map((s, i) => (
            <span key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'rgba(200,194,187,0.25)' }}>/</span>
              <span onClick={() => goToCrumb(i)} style={{ cursor: i < stack.length - 1 ? 'pointer' : 'default', color: i < stack.length - 1 ? 'rgba(200,194,187,0.4)' : '#C8C2BB', textDecoration: i < stack.length - 1 ? 'underline' : 'none' }}>{s.name}</span>
            </span>
          ))}
        </div>
      )}
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
              <div key={file.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden', cursor: 'pointer', width: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? 'calc(33% - 10px)' : 'calc(50% - 7px)', minWidth: 160 }} onClick={() => { if (isFolder(file.mimeType)) openFolder(file); else setPreviewFile(file) }}>
                <div style={{ aspectRatio: file.videoMediaMetadata && parseInt(file.videoMediaMetadata.height) > parseInt(file.videoMediaMetadata.width) ? '9/16' : '16/9', background: '#0E1014', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isFolder(file.mimeType) ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📁</div>
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
                    <button onClick={e => { e.stopPropagation(); setPreviewFile(file) }} style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.09)', color: 'rgba(200,194,187,0.4)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Preview</button>
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
            <a href={`/api/drive/download?id=${previewFile.id}&name=${encodeURIComponent(previewFile.name)}`} download={previewFile.name} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500 }}>Download</a>
            <button onClick={() => setPreviewFile(null)} style={{ fontSize: 24, color: 'rgba(200,194,187,0.5)', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
          <div style={{ width: '94vw', height: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }} onClick={e => e.stopPropagation()}>
            {isVideo(previewFile.mimeType) ? (
              <iframe src={`https://drive.google.com/file/d/${previewFile.id}/preview`} style={{ width: '100%', maxWidth: previewFile.videoMediaMetadata && parseInt(previewFile.videoMediaMetadata.height) > parseInt(previewFile.videoMediaMetadata.width) ? 'min(40vw,700px)' : '84vw', height: '82vh', border: 'none', borderRadius: 6 }} allow="autoplay; fullscreen" allowFullScreen />
            ) : isImage(previewFile.mimeType) ? (
              <img src={`https://drive.google.com/uc?id=${previewFile.id}`} alt={previewFile.name} style={{ maxWidth: '94vw', maxHeight: '86vh', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <a href={previewFile.webViewLink} target="_blank" rel="noopener noreferrer" style={{ color: '#C8C2BB', fontSize: 14 }}>Open file in Google Drive</a>
            )}
            <div style={{ fontSize: 13, color: 'rgba(200,194,187,0.6)' }}>{previewFile.name}</div>
          </div>
        </div>
      )}
    </div>
  )
}
