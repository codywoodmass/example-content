export default function RingProgress({ pct, size = 76, stroke = 7, color, label, sublabel }: { pct: number; size?: number; stroke?: number; color: string; label: string; sublabel?: string }) {
  const r = size / 2 - stroke
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(200,194,187,0.08)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c - (clamped / 100) * c} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 8.5, color: 'rgba(200,194,187,0.35)', marginTop: 1 }}>{sublabel}</div>}
      </div>
    </div>
  )
}
