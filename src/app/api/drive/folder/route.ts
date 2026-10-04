import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getGoogleClients } from '@/lib/google'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function escapeName(name: string) {
  return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function findFolderByExactName(drive: ReturnType<typeof google.drive>, name: string, parentId: string) {
  const q = `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false and name='${escapeName(name)}'`
  const res = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 })
  return res.data.files?.[0]?.id || null
}

async function findFolderContaining(drive: ReturnType<typeof google.drive>, term: string, parentId: string) {
  const q = `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false and name contains '${escapeName(term)}'`
  const res = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 })
  return res.data.files?.[0]?.id || null
}

async function listFoldersIn(drive: ReturnType<typeof google.drive>, parentId: string) {
  const q = `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`
  const res = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 200 })
  return res.data.files || []
}

async function createFolder(drive: ReturnType<typeof google.drive>, name: string, parentId: string) {
  const res = await drive.files.create({
    requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
    fields: 'id',
  })
  return res.data.id as string
}

async function findOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string, parentId: string) {
  const target = name.trim()
  const existing = await findFolderByExactName(drive, target, parentId)
  if (existing) return existing
  // Exact match can miss folders that were created manually with slightly different
  // casing or spacing (e.g. "Rachel Waldegrave " vs "Rachel Waldegrave") — check
  // siblings case/whitespace-insensitively before creating a duplicate.
  const siblings = await listFoldersIn(drive, parentId)
  const loose = siblings.find(f => f.name?.trim().toLowerCase() === target.toLowerCase())
  if (loose?.id) return loose.id
  return createFolder(drive, target, parentId)
}

async function findOrCreateCategoryFolder(drive: ReturnType<typeof google.drive>, category: string, rootId: string) {
  const isProperty = category?.toLowerCase() === 'property'
  const term = isProperty ? 'Architect' : 'Commercial'
  const canonicalName = isProperty ? 'Architectural' : 'Commercial'
  const existing = await findFolderContaining(drive, term, rootId)
  if (existing) return existing
  return createFolder(drive, canonicalName, rootId)
}

export async function POST(req: NextRequest) {
  const clients = await getGoogleClients()
  if (!clients) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { drive } = clients

  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!rootId) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured' }, { status: 500 })
  }

  const { category, client, projectTitle } = await req.json()
  if (!client || !projectTitle) {
    return NextResponse.json({ error: 'Missing client or projectTitle' }, { status: 400 })
  }

  try {
    const categoryFolderId = await findOrCreateCategoryFolder(drive, category, rootId)
    const clientFolderId = await findOrCreateFolder(drive, client.trim(), categoryFolderId)
    const projectFolderId = await findOrCreateFolder(drive, projectTitle.trim(), clientFolderId)

    try {
      await drive.permissions.create({
        fileId: projectFolderId,
        requestBody: { role: 'reader', type: 'anyone' },
      })
    } catch (permError) {
      console.error('Drive permission error:', permError)
    }

    const meta = await drive.files.get({ fileId: projectFolderId, fields: 'webViewLink' })
    return NextResponse.json({ url: meta.data.webViewLink, id: projectFolderId })
  } catch (e: any) {
    console.error('Drive folder creation error:', e)
    return NextResponse.json({ error: e.message || 'Drive folder creation failed' }, { status: 500 })
  }
}
