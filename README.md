# Drone Lab Environment Sensor

Real-time air quality dashboard for the Galgotias College Drone & Robotics Lab.  
Built with **Next.js 16**, **Firebase Realtime Database**, and **Open-Meteo API**.

---

## How it works

```
ESP8266 sensor node
      │
      ▼ writes numbers to
Firebase Realtime Database
  └── sensors/
        ├── temperature
        ├── humidity
        ├── pm25
        └── pm10
      │
      ▼ onValue() live stream
useSensorData hook  ──▶  Indoor cards on dashboard

Open-Meteo API (Greater Noida coords)
      │
      ▼ /api/weather route (cached 15 min)
useWeatherData hook  ──▶  Outdoor cards on dashboard
```

**`hooks/useSensorData.ts`** — opens a persistent Firebase `onValue` listener on the `/sensors` path. Any write from the ESP8266 instantly updates the UI.

**`hooks/useWeatherData.ts`** — polls `/api/weather` every 15 minutes. The route server-side fetches Open-Meteo and returns wind speed, direction, cloud cover, and weather code.

**`app/page.tsx`** — renders 8 cards in two rows (4 indoor, 4 outdoor) on a single full-screen page. No login, no routing.

**`lib/firebase.ts`** — initialises the Firebase app from `.env` variables. Returns `null` if config is missing, which the hook handles gracefully (shows `—`).

---

## Firebase data structure

```json
{
  "sensors": {
    "temperature": 28.5,
    "humidity": 64,
    "pm25": 12.3,
    "pm10": 21.7
  }
}
```

Values must be **numbers**. Missing or non-numeric fields display as `—`.

---

## Setup

```bash
cp .env.example .env.local   # fill in Firebase config
npm install
npm run dev
```

Required env vars are listed in `.env.example`.
# web_ui_env_sensor
