import { NextRequest, NextResponse } from 'next/server'

// Streams a Drive video inline (not as a download) with Range support, so a
// plain <video> tag can actually play and seek it — the file-preview iframe
// and the dashboard's hover-autoplay both need real byte-range streaming to
// start quickly and scrub smoothly; without forwarding Range, the browser
// either refuses to play at all or has to wait for the whole file first,
// which is what made the hover preview feel slow and unreliable.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  const range = req.headers.get('range')
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`, {
    headers: range ? { Range: range } : {},
  })
  if (!res.ok && res.status !== 206 || !res.body) {
    return NextResponse.json({ error: 'File not found' }, { status: res.status || 404 })
  }

  const headers: Record<string, string> = {
    'Content-Type': res.headers.get('content-type') || 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  }
  const length = res.headers.get('content-length')
  if (length) headers['Content-Length'] = length
  const contentRange = res.headers.get('content-range')
  if (contentRange) headers['Content-Range'] = contentRange

  return new NextResponse(res.body, { status: res.status, headers })
}
