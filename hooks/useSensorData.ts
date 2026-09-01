'use client'

import { onValue, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { getFirebaseDatabase } from '@/lib/firebase'
import type { ConnectionState, SensorSnapshot } from '@/types/sensors'

const empty: SensorSnapshot = {
  temperature: { value: null, unit: '°C', label: 'Temperature' },
  humidity: { value: null, unit: '%', label: 'Humidity' },
  pm25: { value: null, unit: 'µg/m³', label: 'PM2.5' },
  pm10: { value: null, unit: 'µg/m³', label: 'PM10' },
  updatedAt: null,
}

export function useSensorData() {
  const [data, setData] = useState(empty)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  useEffect(() => {
    const database = getFirebaseDatabase()
    if (!database) { setConnection('unavailable'); return }
    const unsubscribe = onValue(ref(database, 'sensors'), (snapshot) => {
      const value = snapshot.val() ?? {}
      const read = (key: string, unit: string, label: string) => ({ value: typeof value[key] === 'number' ? value[key] : null, unit, label })
      setData({ temperature: read('temperature', '°C', 'Temperature'), humidity: read('humidity', '%', 'Humidity'), pm25: read('pm25', 'µg/m³', 'PM2.5'), pm10: read('pm10', 'µg/m³', 'PM10'), updatedAt: new Date() })
      setConnection('connected')
    }, () => setConnection('unavailable'))
    return unsubscribe
  }, [])
  return { data, connection }
}
