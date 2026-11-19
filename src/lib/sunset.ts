// Sunset-time calculation for the property booking form's twilight shoot —
// the Almanac/NOAA sunset algorithm (https://edwilliams.org/sunrise_sunset_algorithm.htm),
// computed locally with no external API call so it works the moment a
// property address is geocoded.

const toRad = (d: number) => d * Math.PI / 180
const toDeg = (r: number) => r * 180 / Math.PI
const sinD = (d: number) => Math.sin(toRad(d))
const cosD = (d: number) => Math.cos(toRad(d))
const tanD = (d: number) => Math.tan(toRad(d))
const acosD = (x: number) => toDeg(Math.acos(x))
const atanD = (x: number) => toDeg(Math.atan(x))
const norm360 = (x: number) => ((x % 360) + 360) % 360

// Returns the sunset instant for `dateStr` ('YYYY-MM-DD') at the given
// coordinates, as a UTC Date — or null on the (NZ-irrelevant) edge case
// where the algorithm finds no sunset that day.
export function sunsetUtc(lat: number, lng: number, dateStr: string): Date | null {
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month || !day) return null

  const N1 = Math.floor(275 * month / 9)
  const N2 = Math.floor((month + 9) / 12)
  const N3 = 1 + Math.floor((year - 4 * Math.floor(year / 4) + 2) / 3)
  const N = N1 - (N2 * N3) + day - 30

  const lngHour = lng / 15
  const t = N + ((18 - lngHour) / 24)

  const M = (0.9856 * t) - 3.289
  let L = M + (1.916 * sinD(M)) + (0.020 * sinD(2 * M)) + 282.634
  L = norm360(L)

  let RA = atanD(0.91764 * tanD(L))
  RA = norm360(RA)
  const Lquadrant = Math.floor(L / 90) * 90
  const RAquadrant = Math.floor(RA / 90) * 90
  RA = (RA + (Lquadrant - RAquadrant)) / 15

  const sinDec = 0.39782 * sinD(L)
  const cosDec = Math.cos(Math.asin(sinDec))

  const zenith = 90.833 // official sunset — atmospheric refraction + solar disk radius
  const cosH = (cosD(zenith) - (sinDec * sinD(lat))) / (cosDec * cosD(lat))
  if (cosH > 1 || cosH < -1) return null

  const H = acosD(cosH) / 15

  const T = H + RA - (0.06571 * t) - 6.622
  let UT = T - lngHour
  UT = ((UT % 24) + 24) % 24

  const hours = Math.floor(UT)
  const minutes = Math.round((UT - hours) * 60)
  return new Date(Date.UTC(year, month - 1, day, hours, minutes))
}

// Sunset as an 'HH:MM' 24-hour NZ-local time string.
export function sunsetNzLocal(lat: number, lng: number, dateStr: string): string | null {
  const utc = sunsetUtc(lat, lng, dateStr)
  if (!utc) return null
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Auckland', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(utc)
  const h = Number(parts.find(p => p.type === 'hour')?.value)
  const m = Number(parts.find(p => p.type === 'minute')?.value)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Shifts an 'HH:MM' time by `deltaMinutes` (negative moves it earlier),
// wrapping within a single day. Used to derive "30 min before sunset".
export function shiftTime(time: string, deltaMinutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = (((h * 60 + m + deltaMinutes) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
