import { NextRequest, NextResponse } from 'next/server'
import { ZipArchive } from 'archiver'
import { Readable } from 'stream'

export const dynamic = 'force-dynamic'

type DriveFile = { id: string; name: string; path: string; mimeType: string }

// Recurses into subfolders too — "download everything in this folder" should
// behave like Drive's own folder download, not stop at the first level.
async function listFilesRecursive(folderId: string, apiKey: string, relPath = ''): Promise<DriveFile[]> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType)&pageSize=1000&key=${apiKey}`)
  const data = await res.json()
  const files = data.files || []
  let out: DriveFile[] = []
  for (const f of files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      out = out.concat(await listFilesRecursive(f.id, apiKey, relPath + f.name + '/'))
    } else {
      out.push({ id: f.id, name: f.name, path: relPath + f.name, mimeType: f.mimeType })
    }
  }
  return out
}

export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId')
  const zipName = req.nextUrl.searchParams.get('name') || 'download'
  if (!folderId) return NextResponse.json({ error: 'Missing folderId' }, { status: 400 })

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const files = await listFilesRecursive(folderId, apiKey)
  if (files.length === 0) return NextResponse.json({ error: 'No files to download' }, { status: 404 })

  const archive = new ZipArchive({ zlib: { level: 6 } })
  archive.on('error', (err: Error) => console.error('Archive error:', err))

  // Fetched and appended one at a time rather than all in parallel — keeps
  // memory flat regardless of folder size, since archiver streams each
  // entry straight through instead of buffering the whole zip in memory.
  ;(async () => {
    for (const f of files) {
      try {
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${apiKey}`)
        if (!fileRes.ok || !fileRes.body) { console.error('Drive fetch failed for', f.name, fileRes.status); continue }
        archive.append(Readable.fromWeb(fileRes.body as any), { name: f.path })
      } catch (e) {
        console.error('Zip file fetch error:', f.name, e)
      }
    }
    await archive.finalize()
  })()

  return new NextResponse(Readable.toWeb(archive) as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(zipName)}.zip"`,
    },
  })
}
