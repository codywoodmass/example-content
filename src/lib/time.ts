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

// NZ alternates between NZST (+12:00) and NZDT (+13:00) — a hardcoded +12:00
// offset is wrong for roughly half the year, and silently shifts any
// Date.toISOString() derived from an NZ-local date/time by an hour.
export function nzOffset(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', timeZoneName: 'longOffset' }).formatToParts(d)
  const tz = parts.find(p => p.type === 'timeZoneName')?.value
  return tz ? tz.replace('GMT', '') : '+12:00'
}

// The inverse of combining a local NZ date+time with nzOffset() into an ISO
// instant — given that instant back, returns the NZ-local 'YYYY-MM-DD' date
// and 'HH:MM' time it represents. Used when a change made directly in Google
// Calendar (a different timezone's instant) needs to be read back as the
// local date/time fields this app stores.
export function nzLocalDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
  return { date, time }
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

// Adds `days` business days (skipping Sat/Sun) to a 'YYYY-MM-DD' date string,
// returning a 'YYYY-MM-DD' string. Used to estimate delivery dates before a
// studio-set delivery_due exists.
export function addBusinessDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return localDateKey(d)
}
