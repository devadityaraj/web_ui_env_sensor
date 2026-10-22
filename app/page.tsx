'use client'

import { useEffect, useState } from 'react'
import { Activity, Cloud, Compass, Droplets, Gauge, MapPin, Maximize2, RefreshCw, Thermometer, Wind } from 'lucide-react'
import { FullscreenModal } from '@/components/FullscreenModal'
import { useSensorData } from '@/hooks/useSensorData'
import { useWeatherData } from '@/hooks/useWeatherData'
import { weatherLabel, windDirection } from '@/lib/weather'

function Card({
  icon: Icon, label, value, unit, accent, text,
}: {
  icon: typeof Activity
  label: string
  value?: number | null
  unit?: string
  accent: string
  text?: string
}) {
  const displayVal =
    text !== undefined
      ? text
      : value == null
      ? '—'
      : value.toFixed(label === 'Humidity' || label === 'Cloud Cover' ? 0 : 1)

  return (
    <article className="metric-card">
      <div className="metric-top">
        <div className="metric-icon" style={{ color: accent, boxShadow: `0 0 14px ${accent}33` }}>
          <Icon size={20} />
        </div>
        <p className="eyebrow">{label}</p>
      </div>
      <div className="metric-value">
        {displayVal}
        {unit && text === undefined && <small>{unit}</small>}
      </div>
      <div className="metric-line" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </article>
  )
}

export default function Page() {
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false)

  const { data: sensors, connection, error } = useSensorData()
  const { data: weather, loading } = useWeatherData()
  const display = (n: number | null, d = 0) => (n === null ? '—' : n.toFixed(d))

  useEffect(() => {
    const prompted = sessionStorage.getItem('drone_lab_fullscreen_prompted')
    if (!prompted) setShowFullscreenPrompt(true)
  }, [])

  const handleEnterFullscreen = () => {
    setShowFullscreenPrompt(false)
    sessionStorage.setItem('drone_lab_fullscreen_prompted', 'true')
    document.documentElement.requestFullscreen?.().catch(() => {})
  }

  const handleDismissFullscreen = () => {
    setShowFullscreenPrompt(false)
    sessionStorage.setItem('drone_lab_fullscreen_prompted', 'true')
  }

  return (
    <main className="dashboard-shell">
      {showFullscreenPrompt && (
        <FullscreenModal onConfirm={handleEnterFullscreen} onCancel={handleDismissFullscreen} />
      )}

      <div className="dashboard-grid">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <img src="/galgotias.png" alt="Galgotias" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </div>
            <div>
              <p className="brand-name">Galgotias College of Engineering and Technology</p>
              <p className="brand-sub">Knowledge Park II, Greater Noida, UP – 201310</p>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="location-chip">
              <MapPin size={13} />
              <span>Drone &amp; Robotics Lab</span>
            </div>
            <div
              className="status-chip"
              title={error || (connection === 'connected' ? 'Firebase Realtime Database Connected' : connection === 'connecting' ? 'Connecting to Firebase...' : 'Firebase Disconnected')}
            >
              <span className={`status-dot ${connection}`} />
              <span>{connection === 'connected' ? 'Live' : connection === 'connecting' ? 'Connecting' : 'Offline'}</span>
            </div>
            <button className="icon-btn" onClick={handleEnterFullscreen} title="Full Screen"><Maximize2 size={15} /></button>
            <button className="icon-btn" onClick={() => window.location.reload()} title="Refresh"><RefreshCw size={15} /></button>
          </div>
        </header>

        <section className="hero">
          <div className="hero-text">
            <p className="eyebrow">LIVE ENVIRONMENTAL MONITOR</p>
            <h1>Know the air<br /><em>around you.</em></h1>
            <p className="hero-copy">Continuous real-time atmosphere monitoring for the Drone &amp; Robotics Lab.</p>
          </div>
          <div className="hero-orbit" aria-hidden="true">
            <div className="orbit-pulse pulse-one" />
            <div className="orbit-pulse pulse-two" />
            <div className="orbit-pulse pulse-three" />
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="orbit-core">
              <span>{display(sensors.pm25.value)}</span>
              <small>PM2.5</small>
            </div>
          </div>
        </section>

        <section className="card-section">
          <div className="section-head">
            <p className="section-eyebrow">INDOOR · DRONE &amp; ROBOTICS LAB</p>
            {error && (
              <span className="error-badge" title={error}>
                {error.includes('Permission Denied') ? 'Firebase Rules: Permission Denied' : 'Firebase Offline'}
              </span>
            )}
          </div>
          <div className="metrics">
            <Card icon={Thermometer} label="Temperature" value={sensors.temperature.value} unit="°C"    accent="#ef233c" />
            <Card icon={Droplets}   label="Humidity"    value={sensors.humidity.value}    unit="%"      accent="#3b82f6" />
            <Card icon={Gauge}      label="PM2.5"       value={sensors.pm25.value}        unit="µg/m³"  accent="#10b981" />
            <Card icon={Activity}   label="PM10"        value={sensors.pm10.value}        unit="µg/m³"  accent="#f59e0b" />
          </div>
        </section>

        <section className="card-section">
          <p className="section-eyebrow">OUTSIDE · GREATER NOIDA</p>
          <div className="metrics">
            <Card icon={Wind}    label="Wind Speed"     value={weather.windSpeed}   unit="km/h" accent="#3b82f6" />
            <Card icon={Compass} label="Wind Direction" text={loading ? '—' : windDirection(weather.windDirection)} accent="#f59e0b" />
            <Card icon={Cloud}   label="Cloud Cover"    value={weather.cloudCover}  unit="%"    accent="#8b5cf6" />
            <Card icon={Activity} label="Condition"     text={loading ? '—' : weatherLabel(weather.weatherCode)} accent="#06b6d4" />
          </div>
        </section>

        <footer>
          <span>Galgotias Drone &amp; Robotics Lab</span>
          <a href="https://linkedin.com/in/devadityaraj" target="_blank" rel="noreferrer">Aditya Raj</a>
        </footer>

      </div>
    </main>
  )
}
