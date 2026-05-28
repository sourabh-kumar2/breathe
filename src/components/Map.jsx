import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { aqiColor } from '../utils/aqi'

// Tight bounding box around India (includes all states + Andaman/Nicobar)
const INDIA_CENTER = [22.5, 82.5]
const INDIA_BOUNDS = [[6.5, 68.0], [37.5, 97.5]]

function FlyTo({ city }) {
  const map = useMap()
  useEffect(() => {
    if (city?.lat && city?.lon) {
      map.flyTo([city.lat, city.lon], 9, { duration: 1.2 })
    }
  }, [city, map])
  return null
}

export default function Map({ cities, selected, onSelect }) {
  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={5}
      minZoom={4}
      maxZoom={12}
      maxBounds={INDIA_BOUNDS}
      maxBoundsViscosity={0.85}
      className="map-container"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <FlyTo city={selected} />
      {cities.map(city => {
        if (!city.lat || !city.lon) return null
        const isSelected = selected?.name === city.name
        return (
          <CircleMarker
            key={city.name}
            center={[city.lat, city.lon]}
            radius={isSelected ? 14 : 9}
            fillColor={aqiColor(city.aqi)}
            fillOpacity={0.88}
            color={isSelected ? '#0f172a' : 'rgba(0,0,0,0.25)'}
            weight={isSelected ? 2.5 : 1}
            eventHandlers={{ click: () => onSelect(city) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <strong>{city.name}</strong>
              <br />
              {city.aqi > 0 ? `AQI ${city.aqi} · ${city.category}` : 'No data'}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
