import LoadingScreen from '@/components/public/LoadingScreen'

// Next.js shows this automatically while a route segment is loading —
// e.g. the brief gap right after clicking a nav link, before the next
// page's own content is ready. Without this, that gap could show
// whatever was last on screen, or flash an intermediate state.
export default function Loading() {
  return <LoadingScreen />
}
