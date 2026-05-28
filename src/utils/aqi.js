export function aqiColor(aqi) {
  if (!aqi || aqi <= 0) return '#9ca3af'
  if (aqi <= 50)        return '#00e400'
  if (aqi <= 100)       return '#ffff00'
  if (aqi <= 150)       return '#ff7e00'
  if (aqi <= 200)       return '#ff0000'
  if (aqi <= 300)       return '#8f3f97'
  return '#7e0023'
}

export function aqiTextColor(aqi) {
  if (!aqi || aqi <= 0 || aqi <= 100) return '#111827'
  return '#ffffff'
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const POLLUTANT_LABELS = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2:  'NO₂',
  o3:   'O₃',
  co:   'CO',
  so2:  'SO₂',
}
