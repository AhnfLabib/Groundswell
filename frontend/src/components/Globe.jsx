import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Country centroid coordinates
const COUNTRY_COORDS = {
  US: [37.09, -95.71], GB: [55.37, -3.43], DE: [51.16, 10.45],
  FR: [46.22, 2.21], JP: [36.20, 138.25], CN: [35.86, 104.19],
  IN: [20.59, 78.96], BR: [14.23, -51.92], AU: [-25.27, 133.77],
  CA: [56.13, -106.34], MX: [23.63, -102.55], ZA: [-30.55, 22.93],
  NG: [9.08, 8.67], EG: [26.82, 30.80], RU: [61.52, 105.31],
  KR: [35.90, 127.76], ID: [-0.78, 113.92], AR: [-38.41, -63.61],
  TR: [38.96, 35.24], SA: [23.88, 45.07], IT: [41.87, 12.56],
  ES: [40.46, -3.74], PL: [51.91, 19.14], NL: [52.13, 5.29],
  // Add more as needed
}

function sentimentColor(score) {
  if (score > 0.2) return '#22c55e'   // positive — green
  if (score < -0.2) return '#ef4444'  // negative — red
  return '#eab308'                     // neutral — yellow
}

export default function Globe({ submissions }) {
  // Aggregate latest sentiment per country
  const byCountry = {}
  for (const s of submissions) {
    if (!byCountry[s.country]) byCountry[s.country] = []
    byCountry[s.country].push(s.sentiment)
  }

  const markers = Object.entries(byCountry).map(([country, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const coords = COUNTRY_COORDS[country]
    if (!coords) return null
    return { country, avg, coords, count: scores.length }
  }).filter(Boolean)

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      minZoom={2}
      maxZoom={6}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {markers.map(({ country, avg, coords, count }) => (
        <CircleMarker
          key={country}
          center={coords}
          radius={Math.min(6 + count * 1.5, 28)}
          pathOptions={{
            fillColor: sentimentColor(avg),
            fillOpacity: 0.75,
            color: sentimentColor(avg),
            weight: 1.5,
            opacity: 0.9,
          }}
        >
          <Tooltip>
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              <strong>{country}</strong> · {count} opinion{count !== 1 ? 's' : ''}<br />
              sentiment: {avg.toFixed(2)}
            </span>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
