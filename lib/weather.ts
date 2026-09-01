import type { WeatherSnapshot } from '@/types/weather'

export function windDirection(degrees: number | null) {
  if (degrees === null) return '—'
  const directions = [
    'North',
    'North-North-East',
    'North-East',
    'East-North-East',
    'East',
    'East-South-East',
    'South-East',
    'South-South-East',
    'South',
    'South-South-West',
    'South-West',
    'West-South-West',
    'West',
    'West-North-West',
    'North-West',
    'North-North-West',
  ]
  return directions[Math.round(degrees / 22.5) % 16]
}

export function weatherLabel(code: number | null) {
  if (code === null) return 'Unavailable'
  if (code === 0) return 'Clear sky'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Foggy'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  return 'Showers'
}

export async function getWeather(): Promise<WeatherSnapshot> {
  const response = await fetch(`${process.env.OPEN_METEO_URL ?? 'https://api.open-meteo.com/v1/forecast'}?latitude=${process.env.WEATHER_LATITUDE ?? '40.7128'}&longitude=${process.env.WEATHER_LONGITUDE ?? '-74.006'}&current=wind_speed_10m,wind_direction_10m,weather_code,cloud_cover`, { next: { revalidate: 900 } })
  if (!response.ok) throw new Error('Weather service unavailable')
  const json = await response.json()
  const current = json.current
  return { windSpeed: current.wind_speed_10m, windDirection: current.wind_direction_10m, weatherCode: current.weather_code, cloudCover: current.cloud_cover, updatedAt: current.time }
}
