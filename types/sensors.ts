export type ConnectionState = 'connected' | 'connecting' | 'unavailable'

export type SensorReading = {
  value: number | null
  unit: string
  label: string
  status?: 'good' | 'moderate' | 'poor' | 'unavailable'
}

export type SensorSnapshot = {
  temperature: SensorReading
  humidity: SensorReading
  pm25: SensorReading
  pm10: SensorReading
  updatedAt: Date | null
}
