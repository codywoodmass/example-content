import { parseLabeledNotes } from '@/lib/parseNotes'

// Renders a client's submitted notes as distinct labeled blocks (Brief,
// References, Access, etc.) instead of one flat paragraph — previously
// everything just sat together in a single block of text, making it easy
// for an editor to miss something while skimming. Read-only; studio's own
// free-form notes stay in whatever editable textarea sits alongside this.
export default function LabeledNotes({ text }: { text: string | null | undefined }) {
  const segments = parseLabeledNotes(text)
  if (segments.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {segments.map((seg, i) => (
        <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? '0.5px solid rgba(200,194,187,0.07)' : 'none' }}>
          {seg.label && (
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)', marginBottom: 4 }}>{seg.label}</div>
          )}
          <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.7)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{seg.body}</div>
        </div>
      ))}
    </div>
  )
}
