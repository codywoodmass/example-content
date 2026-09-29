// Converts a 24-hour "HH:MM" string to a 12-hour "h:mm AM/PM" string for display.
// Leaves the underlying stored value untouched — this is purely a display formatter.
export function formatTime12(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}
