import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Deletes client-uploaded attachment files for projects that have been
// archived for 30+ days, so Supabase Storage doesn't grow unbounded with
// files nobody's going to look at again. Runs daily via Vercel Cron
// (see vercel.json) — Vercel sends `Authorization: Bearer $CRON_SECRET`
// on cron-triggered requests when CRON_SECRET is set, which is what's
// checked below so this can't be triggered by an arbitrary request.
const BUCKET = 'booking-attachments'

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: projects, error } = await supabase
    .from('projects1')
    .select('id, attachment_urls')
    .eq('archived', true)
    .lt('archived_at', cutoff)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let projectsCleaned = 0
  let filesDeleted = 0
  const errors: string[] = []

  for (const project of projects || []) {
    const attachments: { name: string; url: string }[] = project.attachment_urls || []
    if (attachments.length === 0) continue

    const paths = attachments.map(a => extractStoragePath(a.url)).filter((p): p is string => !!p)
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths)
      if (removeError) {
        errors.push(`project ${project.id}: ${removeError.message}`)
        continue
      }
      filesDeleted += paths.length
    }

    const { error: updateError } = await supabase.from('projects1').update({ attachment_urls: [] }).eq('id', project.id)
    if (updateError) {
      errors.push(`project ${project.id} clear column: ${updateError.message}`)
      continue
    }
    projectsCleaned++
  }

  return NextResponse.json({ projectsCleaned, filesDeleted, errors })
}
