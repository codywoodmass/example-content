// The booking forms (client portal) build their `notes`/`general_notes`
// text as label-prefixed paragraphs joined with blank lines — e.g.
// "Brief: ...\n\nAccess: ...\n\nReferences: ...". Splitting that back out
// lets the studio side render each one as its own clearly labeled block
// instead of one undifferentiated wall of text.
export type NoteSegment = { label: string | null; body: string }

const LABEL_RE = /^([A-Za-z][A-Za-z /&'-]{1,40}):\s*([\s\S]*)$/

export function parseLabeledNotes(text: string | null | undefined): NoteSegment[] {
  if (!text || !text.trim()) return []
  return text.split(/\n\s*\n/).map(paragraph => {
    const trimmed = paragraph.trim()
    const match = trimmed.match(LABEL_RE)
    if (match) return { label: match[1].trim(), body: match[2].trim() }
    return { label: null, body: trimmed }
  }).filter(seg => seg.body || seg.label)
}
