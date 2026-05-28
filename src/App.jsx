import { useState, useEffect } from 'react'
import Map from './components/Map'
import CityPanel from './components/CityPanel'
import CityList from './components/CityList'
import Legend from './components/Legend'
import { relativeTime } from './utils/aqi'

const DATA_URL = `${import.meta.env.BASE_URL}data/aqi.json`

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const cities = data?.cities ?? []

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-name">breathe</span>
          {data?.updated_at && (
            <span className="brand-updated">Updated {relativeTime(data.updated_at)}</span>
          )}
        </div>
        <CityList cities={cities} selected={selected} onSelect={setSelected} />
        <Legend />
      </aside>

      <div className="map-area">
        {loading ? (
          <div className="loading">Loading&hellip;</div>
        ) : error ? (
          <div className="loading">Could not load air quality data.</div>
        ) : (
          <Map cities={cities} selected={selected} onSelect={setSelected} />
        )}

        {selected && (
          <CityPanel city={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  )
}
