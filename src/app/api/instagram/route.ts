import { NextResponse } from 'next/server'

// Real Instagram Graph API integration — INSTAGRAM_ACCESS_TOKEN has to come
// from Cody's own Instagram professional account connected through a Meta
// developer app (can't be set up without his login). Until that's
// configured, this just reports itself as not configured so the frontend
// can fall back gracefully instead of showing fake photos.
export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return NextResponse.json({ configured: false, items: [] })

  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ configured: true, items: [], error: data.error?.message })

    const items = (data.data || [])
      .filter((m: any) => m.media_type !== 'VIDEO' || m.thumbnail_url)
      .map((m: any) => ({
        id: m.id,
        image: m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url,
        permalink: m.permalink,
        caption: m.caption || '',
      }))

    return NextResponse.json({ configured: true, items })
  } catch (e) {
    console.error('Instagram feed error:', e)
    return NextResponse.json({ configured: true, items: [], error: 'fetch failed' })
  }
}
