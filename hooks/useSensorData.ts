'use client'

import { onValue, ref } from 'firebase/database'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { getFirebaseAuth, getFirebaseDatabase } from '@/lib/firebase'
import type { ConnectionState, SensorSnapshot } from '@/types/sensors'

const empty: SensorSnapshot = {
  temperature: { value: null, unit: '°C', label: 'Temperature' },
  humidity: { value: null, unit: '%', label: 'Humidity' },
  pm25: { value: null, unit: 'µg/m³', label: 'PM2.5' },
  pm10: { value: null, unit: 'µg/m³', label: 'PM10' },
  updatedAt: null,
}

function parseSensorNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

function normalizeSensorPayload(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== 'object') return {}

  const obj = raw as Record<string, any>

  // Direct matches
  if (
    'temperature' in obj ||
    'humidity' in obj ||
    'pm25' in obj ||
    'pm10' in obj ||
    'temp' in obj
  ) {
    return obj
  }

  // Nested 'sensors'
  if (obj.sensors && typeof obj.sensors === 'object') {
    return normalizeSensorPayload(obj.sensors)
  }

  // Nested 'data'
  if (obj.data && typeof obj.data === 'object') {
    return normalizeSensorPayload(obj.data)
  }

  // If push keys were used (e.g. -NxXYZ...)
  const keys = Object.keys(obj)
  if (keys.length > 0) {
    const lastKey = keys[keys.length - 1]
    if (typeof obj[lastKey] === 'object' && obj[lastKey] !== null) {
      return normalizeSensorPayload(obj[lastKey])
    }
  }

  return obj
}

function extractSensorValue(data: Record<string, any>, candidateKeys: string[]): number | null {
  if (!data || typeof data !== 'object') return null
  for (const key of candidateKeys) {
    if (key in data) {
      const parsed = parseSensorNumber(data[key])
      if (parsed !== null) return parsed
    }
  }
  return null
}

export function useSensorData() {
  const [data, setData] = useState(empty)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const database = getFirebaseDatabase()
    if (!database) {
      setConnection('unavailable')
      setError('Firebase Realtime Database configuration missing or invalid.')
      return
    }

    // Auto-authenticate with admin credentials if provided in env
    const auth = getFirebaseAuth()
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

    if (auth && !auth.currentUser && adminEmail && adminPassword) {
      signInWithEmailAndPassword(auth, adminEmail, adminPassword).catch((err) => {
        console.warn('[Firebase Auth] Auto-authentication failed:', err.message)
      })
    }

    const sensorRef = ref(database, 'sensors')
    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        const raw = snapshot.val()
        if (raw === null || raw === undefined) {
          console.warn('[Firebase RTDB] Connected to /sensors, but path is currently empty (null). Waiting for sensor writes.')
          setConnection('connected')
          setError(null)
          return
        }

        const payload = normalizeSensorPayload(raw)
        const read = (keys: string[], unit: string, label: string) => ({
          value: extractSensorValue(payload, keys),
          unit,
          label,
        })

        setData({
          temperature: read(['temperature', 'temp', 'Temperature', 'Temp', 't', 'T'], '°C', 'Temperature'),
          humidity: read(['humidity', 'hum', 'Humidity', 'Hum', 'h', 'H'], '%', 'Humidity'),
          pm25: read(['pm25', 'pm2_5', 'pm2.5', 'PM25', 'PM2_5', 'PM2.5', 'pm_25'], 'µg/m³', 'PM2.5'),
          pm10: read(['pm10', 'pm_10', 'PM10', 'PM_10'], 'µg/m³', 'PM10'),
          updatedAt: new Date(),
        })
        setConnection('connected')
        setError(null)
      },
      (err) => {
        console.error('[Firebase RTDB] onValue error:', err)
        setConnection('unavailable')
        const msg = err.message || ''
        if (msg.toLowerCase().includes('permission_denied') || msg.toLowerCase().includes('permission denied')) {
          setError('Permission Denied: Firebase Realtime Database Security Rules are blocking read access to /sensors.')
          console.error(
            '\n⚠️ [Firebase RTDB Permission Denied]\n' +
            'Your Firebase Realtime Database Security Rules are rejecting reads.\n' +
            'Fix this in Firebase Console -> Realtime Database -> Rules tab:\n' +
            '{\n' +
            '  "rules": {\n' +
            '    "sensors": {\n' +
            '      ".read": true,\n' +
            '      ".write": true\n' +
            '    }\n' +
            '  }\n' +
            '}\n' +
            'Then click "Publish".\n'
          )
        } else {
          setError(msg || 'Unable to connect to Firebase Realtime Database.')
        }
      }
    )

    return unsubscribe
  }, [])

  return { data, connection, error }
}
