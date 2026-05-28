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
  const [selected, setSelected] = useState(null)
  const [showList, setShowList] = useState(false)

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cities = data?.cities ?? []

  function selectCity(city) {
    setSelected(city)
    setShowList(false)
  }

  return (
    <div className="app">
      <header className="header">
        <button
          className={`btn-cities${showList ? ' active' : ''}`}
          onClick={() => setShowList(v => !v)}
        >
          {showList ? 'Hide' : 'All cities'}
        </button>
        <span className="header-logo">breathe</span>
        {data?.updated_at && (
          <span className="header-updated">Updated {relativeTime(data.updated_at)}</span>
        )}
      </header>

      {loading ? (
        <div className="loading">Loading&hellip;</div>
      ) : (
        <Map cities={cities} selected={selected} onSelect={selectCity} />
      )}

      <Legend />

      {showList && (
        <CityList
          cities={cities}
          selected={selected}
          onSelect={selectCity}
          onClose={() => setShowList(false)}
        />
      )}

      {selected && !showList && (
        <CityPanel city={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
