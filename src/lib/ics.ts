import { nzOffset } from './time'

// Universal calendar file — works in Google Calendar, Outlook, Apple
// Calendar and everything else without any account connection, so this is
// the one calendar feature that works for every client regardless of what
// they use day to day.
function toIcsUtc(date: string, time: string): string {
  return new Date(`${date}T${time}:00${nzOffset(date)}`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function buildShootIcs(opts: {
  uid: string
  title: string
  description?: string
  location?: string
  date: string // YYYY-MM-DD
  startTime?: string | null // HH:mm
  endTime?: string | null
}): string {
  const { uid, title, description, location, date, startTime, endTime } = opts
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Example Content//Portal//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`]
  if (startTime && endTime) {
    lines.push(`DTSTART:${toIcsUtc(date, startTime)}`)
    lines.push(`DTEND:${toIcsUtc(date, endTime)}`)
  } else {
    // No specific window set yet — an all-day placeholder beats omitting
    // the date entirely.
    const nextDay = new Date(date + 'T12:00:00')
    nextDay.setDate(nextDay.getDate() + 1)
    lines.push(`DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`)
    lines.push(`DTEND;VALUE=DATE:${nextDay.toISOString().split('T')[0].replace(/-/g, '')}`)
  }
  lines.push(`SUMMARY:${escapeIcsText(title)}`)
  if (location) lines.push(`LOCATION:${escapeIcsText(location)}`)
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcsFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
