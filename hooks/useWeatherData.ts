'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WeatherSnapshot } from '@/types/weather'
import { defaultWeather } from '@/types/weather'

export function useWeatherData() {
  const [data, setData] = useState<WeatherSnapshot>(defaultWeather)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => { try { const response = await fetch('/api/weather'); if (!response.ok) throw new Error(); setData(await response.json()) } catch { setData((current) => current) } finally { setLoading(false) } }, [])
  useEffect(() => { refresh(); const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }; document.addEventListener('visibilitychange', onVisibility); const timer = window.setInterval(refresh, 900000); return () => { document.removeEventListener('visibilitychange', onVisibility); window.clearInterval(timer) } }, [refresh])
  return { data, loading }
}
