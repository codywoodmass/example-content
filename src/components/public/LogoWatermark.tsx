// A large, low-opacity emblem bled off the bottom-right corner of the
// page — background texture, not a decoration anyone should notice
// consciously. Absolute (not fixed) and anchored to the bottom of
// whichever <main> it's rendered in, so it stays pinned to the bottom of
// the actual page content (behind the footer) instead of following the
// viewport as you scroll. Requires the parent <main> to have
// position: relative so the clipping wrapper below resolves against the
// page's full height rather than some positioned ancestor further up.
// Sits behind everything else simply by being the first thing in the
// DOM with no competing z-index — later, normal-flow content paints over
// it without needing any stacking-context gymnastics.
//
// The outer div is `inset: 0` with `overflow: hidden` — sized to exactly
// match <main>'s box, no bigger — so anything bled off the corner by the
// image inside it gets clipped right at that boundary. This is the only
// way that's actually reliable: both a negative bottom/right percentage
// AND a transform can still inflate the page's scrollable area (visually
// "nothing painted there" but still part of document.scrollWidth/
// scrollHeight), which is exactly the blank-space-past-the-footer bug
// this replaced. A plain decorative wrapper with overflow: hidden doesn't
// have that problem, and — unlike `overflowX: hidden` on <main> itself —
// it isn't the element anything relies on for window scroll detection, so
// it can't cause the same bug that broke nav scroll tracking before.
export default function LogoWatermark() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <img
        src="/images/EX Logo EMBLEMPALE.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          transform: 'translate(8%, 12%)',
          width: 'clamp(520px, 52vw, 920px)',
          opacity: 0.05,
          userSelect: 'none',
        }}
      />
    </div>
  )
}
