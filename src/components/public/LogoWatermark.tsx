// A large, low-opacity emblem bled off the bottom-right corner of the
// viewport — background texture, not a decoration anyone should notice
// consciously. Fixed (not absolute) so it stays put as the page scrolls,
// and sits behind everything else simply by being the first thing in the
// DOM with no competing z-index — later, normal-flow content paints over
// it without needing any stacking-context gymnastics.
export default function LogoWatermark() {
  return (
    <img
      src="/images/EX Logo EMBLEMPALE.png"
      alt=""
      aria-hidden="true"
      style={{
        position: 'fixed',
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
