export type WeatherSnapshot = {
  windSpeed: number | null
  windDirection: number | null
  weatherCode: number | null
  cloudCover: number | null
  updatedAt: string | null
}

export const defaultWeather: WeatherSnapshot = {
  windSpeed: null,
  windDirection: null,
  weatherCode: null,
  cloudCover: null,
  updatedAt: null,
}
