export type AirStatus = 'good' | 'moderate' | 'poor' | 'unavailable'

export function pmStatus(value: number | null): AirStatus {
  if (value === null || !Number.isFinite(value)) return 'unavailable'
  if (value <= 12) return 'good'
  if (value <= 35.4) return 'moderate'
  return 'poor'
}

export function statusLabel(status: AirStatus) {
  return { good: 'Good', moderate: 'Moderate', poor: 'Needs attention', unavailable: 'Unavailable' }[status]
}
