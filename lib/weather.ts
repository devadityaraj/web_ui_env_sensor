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

  switch (code) {
    case 0:
      return 'Clear sky'
    case 1:
      return 'Mainly clear'
    case 2:
      return 'Partly cloudy'
    case 3:
      return 'Overcast'
    case 45:
    case 48:
      return 'Foggy'
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return 'Drizzle'
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return 'Rain'
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return 'Snow'
    case 80:
    case 81:
    case 82:
      return 'Rain showers'
    case 95:
    case 96:
    case 99:
      return 'Thunderstorm'
    default:
      return 'Unavailable'
  }
}

export async function getWeather(): Promise<WeatherSnapshot> {
  const response = await fetch(`${process.env.OPEN_METEO_URL ?? 'https://api.open-meteo.com/v1/forecast'}?latitude=${process.env.WEATHER_LATITUDE ?? '40.7128'}&longitude=${process.env.WEATHER_LONGITUDE ?? '-74.006'}&current=wind_speed_10m,wind_direction_10m,weather_code,cloud_cover`, { next: { revalidate: 900 } })
  if (!response.ok) throw new Error('Weather service unavailable')
  const json = await response.json()
  const current = json.current
  return { windSpeed: current.wind_speed_10m, windDirection: current.wind_direction_10m, weatherCode: current.weather_code, cloudCover: current.cloud_cover, updatedAt: current.time }
}
