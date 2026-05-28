#!/usr/bin/env python3
"""OpenAQ v3 adapter — fetches AQI data for CITIES and writes DATA_OUT.

v3 API flow per city:
  1. GET /v3/locations?coordinates=lat,lon&radius=25000   → stations + sensor metadata
  2. GET /v3/locations/{id}/latest                        → current reading per sensor
  3. GET /v3/sensors/{id}/measurements/hourly             → 24hr PM2.5 trend
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

API_KEY   = os.environ.get("OPENAQ_API_KEY", "")
CITIES    = [c.strip() for c in os.environ.get("CITIES", "Delhi,Mumbai,Bangalore,Chennai,Kolkata").split(",") if c.strip()]
DATA_OUT  = os.environ.get("DATA_OUT", "data/aqi.json")
BASE      = "https://api.openaq.org/v3"
RADIUS    = 25000  # metres — API max

# OpenAQ v3 has no city-name filter; use hardcoded city centres
CITY_COORDS: dict[str, tuple[float, float]] = {
    "Delhi":     (28.7041, 77.1025),
    "Mumbai":    (19.0760, 72.8777),
    "Bangalore": (12.9716, 77.5946),
    "Chennai":   (13.0827, 80.2707),
    "Kolkata":   (22.5726, 88.3639),
}

# US EPA PM2.5 breakpoints: (pm_lo, pm_hi, aqi_lo, aqi_hi)
_BREAKPOINTS = [
    (0.0,   12.0,   0,   50),
    (12.1,  35.4,  51,  100),
    (35.5,  55.4, 101,  150),
    (55.5, 150.4, 151,  200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]

def pm25_to_aqi(pm25: float) -> int:
    for pm_lo, pm_hi, aqi_lo, aqi_hi in _BREAKPOINTS:
        if pm_lo <= pm25 <= pm_hi:
            return round((aqi_hi - aqi_lo) / (pm_hi - pm_lo) * (pm25 - pm_lo) + aqi_lo)
    return 500

def aqi_category(aqi: int) -> str:
    if aqi <= 50:  return "Good"
    if aqi <= 100: return "Moderate"
    if aqi <= 150: return "Unhealthy for Sensitive Groups"
    if aqi <= 200: return "Unhealthy"
    if aqi <= 300: return "Very Unhealthy"
    return "Hazardous"

def get(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"X-API-Key": API_KEY, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code} — {url}", file=sys.stderr)
        return {"results": []}
    except Exception as e:
        print(f"    error — {e}", file=sys.stderr)
        return {"results": []}

def fetch_city(city: str) -> dict:
    if city not in CITY_COORDS:
        print(f"  no coordinates for {city!r}, skipping", file=sys.stderr)
        return {"name": city, "country": "IN", "aqi": 0,
                "category": "Unknown", "pollutants": {}, "stations": []}

    lat, lon = CITY_COORDS[city]
    since = (datetime.now(timezone.utc) - timedelta(hours=25)).strftime("%Y-%m-%dT%H:%M:%SZ")

    # ── 1. Stations near city centre ─────────────────────────────────────────
    print("  → locations", file=sys.stderr)
    data = get(f"{BASE}/locations?coordinates={lat},{lon}&radius={RADIUS}&limit=10")
    locations = data.get("results", [])

    if not locations:
        print("  no stations found", file=sys.stderr)
        return {"name": city, "country": "IN", "aqi": 0,
                "category": "Unknown", "pollutants": {}, "stations": []}

    # sensor_id → metadata; normalise param name ("PM2.5" → "pm25")
    sensor_map: dict[int, dict] = {}
    for loc in locations:
        for sensor in loc.get("sensors", []):
            raw = sensor.get("parameter", {}).get("name", "")
            sensor_map[sensor["id"]] = {
                "param":    "".join(c for c in raw.lower() if c.isalnum()),
                "unit":     sensor.get("parameter", {}).get("units", "µg/m³"),
                "loc_id":   loc["id"],
                "loc_name": loc.get("name") or "Unknown",
                "lat":      loc.get("coordinates", {}).get("latitude", 0),
                "lon":      loc.get("coordinates", {}).get("longitude", 0),
            }

    # ── 2. Latest reading per sensor, for the top 5 stations ─────────────────
    readings: list[dict] = []
    for loc in locations[:5]:
        print(f"  → latest @ location {loc['id']}", file=sys.stderr)
        latest = get(f"{BASE}/locations/{loc['id']}/latest")
        for item in latest.get("results", []):
            sid   = item.get("sensorsId")
            meta  = sensor_map.get(sid, {})
            value = item.get("value")
            if value is None or not meta:
                continue
            readings.append({
                "sensor_id": sid,
                "value":     value,
                "param":     meta["param"],
                "unit":      meta["unit"],
                "loc_id":    meta["loc_id"],
                "loc_name":  meta["loc_name"],
                "lat":       meta["lat"],
                "lon":       meta["lon"],
            })

    # ── 3. PM2.5 hourly trend (single extra call) ─────────────────────────────
    pm25_readings = [r for r in readings if r["param"] == "pm25"]
    pm25_trend: list[float] = []
    if pm25_readings:
        sid = pm25_readings[0]["sensor_id"]
        print(f"  → hourly trend (sensor {sid})", file=sys.stderr)
        hourly = get(f"{BASE}/sensors/{sid}/measurements/hourly"
                     f"?datetime_from={since}&limit=24")
        # API returns newest-first; reverse so trend is oldest → newest
        pm25_trend = [
            r["value"] for r in reversed(hourly.get("results", []))
            if r.get("value") is not None
        ]

    # ── Aggregate ─────────────────────────────────────────────────────────────
    pollutants: dict[str, dict] = {}
    for p in ("pm25", "pm10", "no2", "o3", "co", "so2"):
        vals = [r["value"] for r in readings if r["param"] == p]
        if not vals:
            continue
        pollutants[p] = {
            "value": round(sum(vals) / len(vals), 1),
            "unit":  next(r["unit"] for r in readings if r["param"] == p),
            "trend": pm25_trend if p == "pm25" else [],
        }

    # Stations: one entry per location that has a PM2.5 reading
    by_loc: dict[int, dict] = {}
    for r in readings:
        if r["param"] != "pm25":
            continue
        lid = r["loc_id"]
        if lid not in by_loc:
            by_loc[lid] = {**r, "values": []}
        by_loc[lid]["values"].append(r["value"])
    stations = sorted(
        [{"name": v["loc_name"], "lat": v["lat"], "lon": v["lon"],
          "pm25": round(sum(v["values"]) / len(v["values"]), 1)}
         for v in by_loc.values()],
        key=lambda s: -s["pm25"],
    )

    pm25_avg = sum(r["value"] for r in pm25_readings) / len(pm25_readings) if pm25_readings else 0.0
    aqi      = pm25_to_aqi(pm25_avg)

    return {
        "name":       city,
        "country":    "IN",
        "aqi":        aqi,
        "category":   aqi_category(aqi),
        "pollutants": pollutants,
        "stations":   stations,
    }

def main() -> None:
    if not API_KEY:
        sys.exit("OPENAQ_API_KEY is required")

    output = {
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "provider":   "openaq",
        "cities":     [],
    }

    for city in CITIES:
        print(f"▶ {city}", file=sys.stderr)
        output["cities"].append(fetch_city(city))

    out = Path(DATA_OUT)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(output, indent=2))
    print(f"✓ Written to {DATA_OUT}", file=sys.stderr)

if __name__ == "__main__":
    main()
