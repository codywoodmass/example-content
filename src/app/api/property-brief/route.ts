import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function getCoordinates(address: string) {
  try {
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=NZ&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`)
    const data = await res.json()
    if (!data.features || data.features.length === 0) return null
    const [lng, lat] = data.features[0].center
    return { lat, lng }
  } catch (e) {
    console.error('Geocoding error:', e)
    return null
  }
}

async function getWeather(date: string, address: string) {
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address.split(',').pop()?.trim() || 'New Zealand')}&count=1&country=NZ`)
    const geoData = await geoRes.json()
    if (!geoData.results || geoData.results.length === 0) return null

    const { latitude, longitude } = geoData.results[0]

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=Pacific/Auckland&start_date=${date}&end_date=${date}`)
    const weatherData = await weatherRes.json()

    if (!weatherData.daily || !weatherData.daily.time || weatherData.daily.time.length === 0) return null

    const weatherCodes: Record<number, string> = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
      80: 'Light showers', 81: 'Showers', 82: 'Heavy showers', 95: 'Thunderstorm',
    }

    return {
      maxTemp: weatherData.daily.temperature_2m_max[0],
      minTemp: weatherData.daily.temperature_2m_min[0],
      rainChance: weatherData.daily.precipitation_probability_max[0],
      condition: weatherCodes[weatherData.daily.weathercode[0]] || 'Unknown',
    }
  } catch (e) {
    console.error('Weather fetch error:', e)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, propertyType, briefNotes, shootDate } = body

    if (!address) {
      return NextResponse.json({ error: 'Property address is required' }, { status: 400 })
    }

    const [weather, coords] = await Promise.all([
      shootDate ? getWeather(shootDate, address) : Promise.resolve(null),
      getCoordinates(address),
    ])

    const mapboxImageUrl = coords
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/pin-l+C8C2BB(${coords.lng},${coords.lat})/${coords.lng},${coords.lat},17,0/600x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      : null

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        } as any,
      ],
      messages: [
        {
          role: 'user',
          content: `You are researching a New Zealand property at: "${address}" for a video production crew. Search broadly across multiple sources to find as much data as possible. Try these searches:

1. Search for "${address}" on homes.co.nz, OneRoof, Trade Me Property, or Realestate.co.nz to find listing details, floor plans, bedrooms, bathrooms
2. Search for "${address} property" to find council records, QV, or rateable value data
3. Search for the suburb/area to understand the neighbourhood character, nearby amenities, and what makes it desirable
4. Search for any recent sales history at or near this address

Property type: ${propertyType || 'not specified'}
Additional notes: ${briefNotes || 'none'}

Based on everything you find, return ONLY a JSON object with no other text:

{
  "bedrooms": "number as string, or 'Not found'",
  "bathrooms": "number as string, or 'Not found'",
  "garageSpaces": "number as string, or 'Not found'",
  "floorSize": "floor area in m² as string e.g. '180m²', or 'Not found'",
  "landSize": "land area in m² as string e.g. '600m²', or 'Not found'",
  "rateableValue": "CV or RV if found e.g. '$1,200,000', or 'Not found'",
  "lastSalePrice": "last known sale price if found, or 'Not found'",
  "lastSaleDate": "year of last sale if found, or 'Not found'",
  "suburb": "suburb name and city",
  "suburbCharacter": "2 sentences describing what the suburb is known for and who lives there",
  "description": "3 sentences describing this specific property — its style, key features, and what makes it stand out for a video shoot",
  "listingUrl": "direct URL to the current or most recent listing on homes.co.nz, OneRoof, or Trade Me Property if found, or null"
}`,
        },
      ],
    })

    const textContent = message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n')

    let propertyData
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      propertyData = jsonMatch ? JSON.parse(jsonMatch[0]) : { description: textContent }
    } catch {
      propertyData = { description: textContent }
    }

    return NextResponse.json({ property: propertyData, weather, mapboxImageUrl })
  } catch (error: any) {
    console.error('Property brief generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate brief' }, { status: 500 })
  }
}
