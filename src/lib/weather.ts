export const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm',
}

export const WEATHER_CODE_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 80: '🌧️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
}

export type DayWeather = { maxTemp: number; minTemp: number; rainChance: number; condition: string; code: number }

// Explicitly requests Open-Meteo's ECMWF IFS 0.25° model rather than its
// "best_match" auto-selection — ECMWF is the better-performing global model
// for NZ specifically (no dedicated high-res regional model exists here),
// and best_match's blend can fall back to the less accurate GFS. Verified
// directly against the live API before this was adopted elsewhere.
export async function getWeatherForCoords(date: string, latitude: number, longitude: number): Promise<DayWeather | null> {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Pacific/Auckland&models=ecmwf_ifs025&start_date=${date}&end_date=${date}`)
    const data = await res.json()
    if (!data?.daily?.time?.length) return null
    const code = data.daily.weathercode[0]
    return {
      maxTemp: data.daily.temperature_2m_max[0],
      minTemp: data.daily.temperature_2m_min[0],
      rainChance: data.daily.precipitation_probability_max[0],
      condition: WEATHER_CODE_LABELS[code] || 'Unknown',
      code,
    }
  } catch (e) {
    console.error('Weather fetch error:', e)
    return null
  }
}

// Open-Meteo's own geocoder, keyed off the last comma-separated part of the
// address (typically the suburb/town) — no separate API key needed, unlike
// Mapbox, so this works anywhere this app runs without extra config.
export async function getWeatherForAddress(date: string, address: string): Promise<DayWeather | null> {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address.split(',').pop()?.trim() || 'New Zealand')}&count=1&country=NZ`)
    const geoData = await geoRes.json()
    if (!geoData.results || geoData.results.length === 0) return null
    const { latitude, longitude } = geoData.results[0]
    return await getWeatherForCoords(date, latitude, longitude)
  } catch (e) {
    console.error('Weather geocode error:', e)
    return null
  }
}
