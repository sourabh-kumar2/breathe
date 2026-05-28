import Sparkline from './Sparkline'
import { aqiColor, aqiTextColor, POLLUTANT_LABELS } from '../utils/aqi'

const POLLUTANT_ORDER = ['pm25', 'pm10', 'no2', 'o3', 'co', 'so2']

export default function CityPanel({ city, onClose }) {
  const { name, state, aqi, category, pollutants = {}, stations = [] } = city
  const hasData = aqi > 0
  const bgColor = aqiColor(aqi)
  const txtColor = aqiTextColor(aqi)
  const trend = pollutants.pm25?.trend ?? []
  const visiblePollutants = POLLUTANT_ORDER.filter(p => pollutants[p])

  return (
    <aside className="city-panel">
      <button className="panel-close" onClick={onClose} aria-label="Close">&#x2715;</button>

      <div className="panel-header">
        <div className="panel-city-name">{name}</div>
        {state && <div className="panel-state">{state}</div>}
      </div>

      <div className="aqi-block" style={{ background: bgColor }}>
        {hasData ? (
          <>
            <span className="aqi-number" style={{ color: txtColor }}>{aqi}</span>
            <span className="aqi-label" style={{ color: txtColor }}>{category}</span>
          </>
        ) : (
          <span className="aqi-nodata">No monitoring data</span>
        )}
      </div>

      {visiblePollutants.length > 0 && (
        <section className="panel-section">
          <h3 className="section-title">Pollutants</h3>
          <div className="pollutant-grid">
            {visiblePollutants.map(p => (
              <div key={p} className="pollutant-card">
                <span className="pollutant-label">{POLLUTANT_LABELS[p]}</span>
                <span className="pollutant-value">{pollutants[p].value}</span>
                <span className="pollutant-unit">{pollutants[p].unit}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {trend.length >= 2 && (
        <section className="panel-section">
          <h3 className="section-title">PM2.5 — 24h trend</h3>
          <div className="sparkline-wrap">
            <Sparkline values={trend} />
          </div>
        </section>
      )}

      {stations.length > 0 && (
        <section className="panel-section">
          <h3 className="section-title">Stations</h3>
          <ul className="station-list">
            {stations.map((s, i) => (
              <li key={i} className="station-item">
                <span className="station-name">{s.name}</span>
                <span className="station-pm25">PM2.5 {s.pm25}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
