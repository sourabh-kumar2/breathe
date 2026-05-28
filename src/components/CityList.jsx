import { useState } from 'react'
import { aqiColor } from '../utils/aqi'

export default function CityList({ cities, selected, onSelect }) {
  const [query, setQuery] = useState('')

  const filtered = cities
    .filter(c =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.state.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => b.aqi - a.aqi)

  return (
    <aside className="city-list">
      <div className="city-list-header">
        <span className="city-list-title">Cities</span>
      </div>

      <div className="city-list-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search city or state…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <ul className="city-list-items">
        {filtered.map(city => (
          <li
            key={city.name}
            className={`city-list-item${selected?.name === city.name ? ' active' : ''}`}
            onClick={() => onSelect(city)}
          >
            <span className="city-dot" style={{ background: aqiColor(city.aqi) }} />
            <span className="city-list-info">
              <span className="city-list-name">{city.name}</span>
              <span className="city-list-state">{city.state}</span>
            </span>
            <span className="city-list-aqi">
              {city.aqi > 0 ? city.aqi : '—'}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
