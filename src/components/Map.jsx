import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { aqiColor } from '../utils/aqi'

const INDIA = [20.5937, 78.9629]

export default function Map({ cities, selected, onSelect }) {
  return (
    <MapContainer center={INDIA} zoom={5} className="map-container">
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
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
            color={isSelected ? '#1f2937' : 'rgba(0,0,0,0.25)'}
            weight={isSelected ? 2 : 1}
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
