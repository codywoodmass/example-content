// A large, low-opacity emblem bled off the bottom-right corner of the
// page — background texture, not a decoration anyone should notice
// consciously. Absolute (not fixed) and anchored to the bottom of
// whichever <main> it's rendered in, so it stays pinned to the bottom of
// the actual page content (behind the footer) instead of following the
// viewport as you scroll. Requires the parent <main> to have
// position: relative so "bottom/right" resolve against the page's full
// height rather than the nearest positioned ancestor further up.
// Sits behind everything else simply by being the first thing in the
// DOM with no competing z-index — later, normal-flow content paints over
// it without needing any stacking-context gymnastics.
export default function LogoWatermark() {
  return (
    <img
      src="/images/EX Logo EMBLEMPALE.png"
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        bottom: '-12%',
        right: '-8%',
        width: 'clamp(520px, 52vw, 920px)',
        opacity: 0.05,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
      }}
    />
  )
}
