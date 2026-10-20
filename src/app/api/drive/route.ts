import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const thumbId = searchParams.get('thumb')
  const folderIdParam = searchParams.get('folderId')

  // Proxy thumbnail — also doubles as the full preview image (with a
  // larger ?size=) since drive.google.com/uc?id= (the old direct-serving
  // URL every preview modal used to hit) no longer reliably renders
  // inline — Google has progressively locked it down, so it was just
  // showing a broken image. Fetching thumbnailLink through the Drive API
  // with our own key sidesteps that entirely.
  if (thumbId) {
    const size = searchParams.get('size') || '800'
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${thumbId}?fields=thumbnailLink&key=${apiKey}`)
    const data = await res.json()
    if (data.thumbnailLink) {
      const imgRes = await fetch(data.thumbnailLink.replace('=s220', `=s${size}`))
      const buffer = await imgRes.arrayBuffer()
      return new NextResponse(buffer, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' } })
    }
    return new NextResponse(null, { status: 404 })
  }

  let folderId = folderIdParam
  if (!folderId) {
    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })
    const match = url.match(/folders\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/)
    if (!match) return NextResponse.json({ error: 'Invalid Drive URL' }, { status: 400 })
    folderId = match[1]
  }

  // createdTime drives "recent deliveries" on the studio dashboard (when
  // was content actually added to this folder), and the modifiedTime-desc
  // ordering means the thumbnail picker (.find(isMedia) in StudioDriveThumb)
  // naturally lands on the newest media item instead of whatever sorts
  // first alphabetically.
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,videoMediaMetadata,imageMediaMetadata,createdTime,modifiedTime)&orderBy=folder,modifiedTime desc&key=${apiKey}`,
    { next: { revalidate: 60 } }
  )
  const data = await res.json()
  return NextResponse.json(data)
}
