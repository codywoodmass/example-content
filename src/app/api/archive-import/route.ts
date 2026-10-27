import { NextResponse } from 'next/server'

// One-off import of the studio's existing hard-drive folder scan, kept as a
// Google Sheet with one tab per physical drive (gid below). Each tab is a flat
// export of a `find`-style scan: every row is one folder at some depth, with
// its full path already spelled out — nothing here needs live sync back to
// the sheet, it's just the seed data for the in-app archive_drives1 /
// archive_entries1 tables, which are editable directly afterwards.
const SHEET_ID = '1jw15PWeVmGtuUNmuzA3Q5Jne2X6lz2W5kgJGs2YCv1I'
const TABS = [
  { name: 'Arch 1', gid: '133206234' },
  { name: 'Arch 2', gid: '672001' },
  { name: 'Arch 3', gid: '672002' },
]

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cur += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { out.push(cur); cur = '' }
      else cur += c
    }
  }
  out.push(cur)
  return out
}

export async function GET() {
  try {
    const drives = await Promise.all(TABS.map(async tab => {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${tab.gid}`)
      const text = await res.text()
      const lines = text.split('\n').filter(l => l.trim())
      // First two rows are "SCAN DATE: ..." and a blank spacer, third is the header.
      const dataLines = lines.slice(3)
      const entries = dataLines.map(line => {
        const cols = parseCsvLine(line).map(c => c.trim())
        return { project_name: (cols[1] || '').trim(), folder_path: cols[3] || '' }
      }).filter(e => e.project_name && e.folder_path)
      return { name: tab.name, entries }
    }))
    return NextResponse.json({ success: true, drives })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch sheet' }, { status: 500 })
  }
}
