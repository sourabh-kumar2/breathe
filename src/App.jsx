import { useState, useEffect } from 'react'
import Map from './components/Map'
import CityPanel from './components/CityPanel'
import { relativeTime } from './utils/aqi'

const DATA_URL = `${import.meta.env.BASE_URL}data/aqi.json`

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cities = data?.cities ?? []

  return (
    <div className="app">
      <header className="header">
        <span className="header-logo">breathe</span>
        {data?.updated_at && (
          <span className="header-updated">
            Updated {relativeTime(data.updated_at)}
          </span>
        )}
      </header>

      {loading ? (
        <div className="loading">Loading&hellip;</div>
      ) : (
        <Map cities={cities} selected={selected} onSelect={setSelected} />
      )}

      {selected && (
        <CityPanel city={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
