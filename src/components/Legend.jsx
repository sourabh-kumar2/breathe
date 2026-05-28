import { aqiColor } from '../utils/aqi'

const ITEMS = [
  { label: 'Good',                    aqi: 25,  range: '0–50' },
  { label: 'Moderate',                aqi: 75,  range: '51–100' },
  { label: 'Unhealthy (Sensitive)',   aqi: 125, range: '101–150' },
  { label: 'Unhealthy',               aqi: 175, range: '151–200' },
  { label: 'Very Unhealthy',          aqi: 250, range: '201–300' },
  { label: 'Hazardous',               aqi: 400, range: '301+' },
]

export default function Legend() {
  return (
    <div className="legend">
      {ITEMS.map(item => (
        <div key={item.label} className="legend-row">
          <span className="legend-dot" style={{ background: aqiColor(item.aqi) }} />
          <span className="legend-label">{item.label}</span>
          <span className="legend-range">{item.range}</span>
        </div>
      ))}
    </div>
  )
}
