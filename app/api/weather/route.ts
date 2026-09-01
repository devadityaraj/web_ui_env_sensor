import { NextResponse } from 'next/server'
import { getWeather } from '@/lib/weather'

let latest: Awaited<ReturnType<typeof getWeather>> | null = null

export async function GET() {
  try { latest = await getWeather(); return NextResponse.json(latest) }
  catch { return latest ? NextResponse.json(latest) : NextResponse.json({ error: 'Weather unavailable' }, { status: 503 }) }
}
