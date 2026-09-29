import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const thumbId = searchParams.get('thumb')
  const folderIdParam = searchParams.get('folderId')

  // Proxy thumbnail
  if (thumbId) {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${thumbId}?fields=thumbnailLink&key=${apiKey}`)
    const data = await res.json()
    if (data.thumbnailLink) {
      const imgRes = await fetch(data.thumbnailLink.replace('=s220', '=s800'))
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

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,videoMediaMetadata,imageMediaMetadata)&orderBy=folder,name&key=${apiKey}`,
    { next: { revalidate: 60 } }
  )
  const data = await res.json()
  return NextResponse.json(data)
}
