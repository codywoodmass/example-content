import { NextRequest, NextResponse } from 'next/server'

// Streams a Drive file through our own server so downloads happen entirely within
// the portal (same-origin) instead of navigating out to drive.google.com.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const name = req.nextUrl.searchParams.get('name') || 'download'
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${apiKey}`)
  if (!res.ok || !res.body) return NextResponse.json({ error: 'File not found' }, { status: res.status || 404 })

  const headers: Record<string, string> = {
    'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
  }
  const length = res.headers.get('content-length')
  if (length) headers['Content-Length'] = length

  return new NextResponse(res.body, { headers })
}
