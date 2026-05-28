# breathe

Real-time air quality explorer for India — all 32 states and union territories on a live interactive map.

**[Live demo →](https://sourabh-kumar2.github.io/breathe/)**

---

## What it does

- Fetches PM2.5, PM10, NO₂, O₃, CO, SO₂ readings from [OpenAQ v3](https://api.openaq.org) every 30 minutes via GitHub Actions
- Computes US EPA AQI from raw pollutant concentrations
- Renders a CartoDB Positron base map with colour-coded city markers (Leaflet + React)
- Clicking a city opens a detail panel: AQI score, health advisory, pollutant cards, 24h trend sparkline, and individual station readings
- "Search cities" panel lets you filter and jump to any city by name or state

## Architecture

```
GitHub Actions (cron every 30 min)
    │
    ├─ python3 scripts/openaq.py   ← OpenAQ v3 REST adapter
    │      reads:  CITY_COORDS dict (32 hardcoded city centres)
    │      writes: public/data/aqi.json
    │
    ├─ git commit "chore: update aqi data [skip ci]"
    │
    └─ npm run build → peaceiris/actions-gh-pages → gh-pages branch
                                              │
                                    GitHub Pages serves /breathe/
```

The frontend fetches `data/aqi.json` at runtime — no backend, no database.

## Data pipeline

### OpenAQ v3 adapter (`scripts/openaq.py`)

For each of the 32 cities:

1. `GET /v3/locations?coordinates={lat},{lon}&radius=25000` — find nearby monitoring stations
2. `GET /v3/locations/{id}/latest` — current readings per sensor
3. `GET /v3/sensors/{id}/hours` — last 24h PM2.5 trend (precomputed hourly aggregates; falls back to `/days` if empty)

Rate-limit handling: 0.3 s throttle per request + exponential backoff on HTTP 429 (reads `Retry-After` header).

### `public/data/aqi.json` shape

```json
{
  "updated_at": "2026-05-29T10:00:00Z",
  "provider": "openaq",
  "cities": [
    {
      "name": "Delhi",
      "state": "Delhi",
      "country": "IN",
      "lat": 28.7041,
      "lon": 77.1025,
      "aqi": 156,
      "category": "Unhealthy",
      "pollutants": {
        "pm25": { "value": 87.3, "unit": "µg/m³", "trend": [72.1, 80.4, 87.3] }
      },
      "stations": [
        { "name": "Anand Vihar", "lat": 28.6469, "lon": 77.3164, "pm25": 89.1 }
      ]
    }
  ]
}
```

AQI is derived from PM2.5 using US EPA linear interpolation between breakpoints.

## AQI colour scale

| AQI | Category | Colour |
|-----|----------|--------|
| 0–50 | Good | `#00e400` |
| 51–100 | Moderate | `#ffff00` |
| 101–150 | Unhealthy for Sensitive Groups | `#ff7e00` |
| 151–200 | Unhealthy | `#ff0000` |
| 201–300 | Very Unhealthy | `#8f3f97` |
| 301+ | Hazardous | `#7e0023` |

## Local development

```bash
# Install
npm install

# Start dev server (hot reload)
npm run dev

# Fetch fresh data locally (requires OPENAQ_API_KEY)
OPENAQ_API_KEY=your_key python3 scripts/openaq.py

# Build + deploy to gh-pages branch
npm run deploy
```

Set `OPENAQ_API_KEY` as a GitHub Actions secret named `OPENAQ_API_KEY`.  
Set `API_PROVIDER` as a GitHub Actions variable (defaults to `openaq`).

## Tech stack

| Layer | Choice |
|-------|--------|
| Data fetch | Python 3 stdlib (no dependencies) |
| CI/CD | GitHub Actions + peaceiris/actions-gh-pages |
| Frontend build | Vite + React 18 |
| Map | react-leaflet v4 + CartoDB Positron tiles |
| Styling | Plain CSS (no framework) |
| Hosting | GitHub Pages |

## Data attribution

Air quality data provided by [OpenAQ](https://openaq.org) — open air quality data platform.  
Map tiles © [CARTO](https://carto.com) © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
