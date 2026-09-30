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

// A calendar-grid day (built via local Date arithmetic, e.g. startOfWeek.setDate(...))
// represents a *local* calendar date, not a UTC instant. `.toISOString()` converts
// through UTC first, which shifts it back a day for any positive-offset timezone
// (NZ is UTC+12/+13) whenever the local time is before the offset hour — i.e. this
// bug fires for literally every date in NZ, not just an edge case near midnight.
// Reading the date parts straight off the local Date object avoids that conversion.
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
