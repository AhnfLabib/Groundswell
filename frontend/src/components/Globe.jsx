import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Country centroid coordinates (~80 countries)
const COUNTRY_COORDS = {
  // Americas
  US: [37.09, -95.71], CA: [56.13, -106.34], MX: [23.63, -102.55],
  BR: [-14.23, -51.92], AR: [-38.41, -63.61], CL: [-35.67, -71.54],
  CO: [4.57, -74.29], PE: [-9.19, -75.01], VE: [6.42, -66.58],
  EC: [-1.83, -78.18], BO: [-16.29, -63.58], PY: [-23.44, -58.44],
  UY: [-32.52, -55.76], CR: [9.74, -83.75], PA: [8.99, -79.52],
  CU: [21.52, -77.78], DO: [18.73, -70.16], GT: [15.78, -90.23],
  HN: [15.20, -86.24], SV: [13.79, -88.90], NI: [12.86, -85.21],
  JM: [18.10, -77.30],
  // Europe
  GB: [55.37, -3.43], DE: [51.16, 10.45], FR: [46.22, 2.21],
  IT: [41.87, 12.56], ES: [40.46, -3.74], PL: [51.91, 19.14],
  NL: [52.13, 5.29], BE: [50.50, 4.47], SE: [60.12, 18.64],
  NO: [60.47, 8.47], DK: [56.26, 9.50], FI: [61.92, 25.74],
  CH: [46.82, 8.23], AT: [47.51, 14.55], PT: [39.40, -8.22],
  GR: [39.07, 21.82], CZ: [49.82, 15.47], HU: [47.16, 19.50],
  RO: [45.94, 24.97], BG: [42.73, 25.49], HR: [45.10, 15.20],
  UA: [48.38, 31.16], RS: [44.02, 21.01], SK: [48.67, 19.70],
  IE: [53.41, -8.24], LT: [55.17, 23.88], LV: [56.88, 24.60],
  EE: [58.59, 25.01],
  // Russia/CIS
  RU: [61.52, 105.31], KZ: [48.02, 66.92], UZ: [41.38, 64.59],
  // Middle East
  TR: [38.96, 35.24], SA: [23.88, 45.07], IR: [32.43, 53.69],
  IQ: [33.22, 43.68], IL: [31.05, 34.85], AE: [23.42, 53.85],
  QA: [25.35, 51.18], KW: [29.31, 47.48], JO: [30.59, 36.24],
  LB: [33.85, 35.86],
  // Africa
  NG: [9.08, 8.67], EG: [26.82, 30.80], ZA: [-30.55, 22.93],
  KE: [-0.02, 37.91], ET: [9.15, 40.49], GH: [7.95, -1.02],
  TZ: [-6.37, 34.89], MA: [31.79, -7.09], DZ: [28.03, 1.66],
  UG: [1.37, 32.29], MZ: [-18.67, 35.53], MG: [-18.77, 46.87],
  CI: [7.54, -5.55], CM: [7.37, 12.35], SN: [14.50, -14.45],
  ZM: [-13.13, 27.85], ZW: [-19.01, 29.15], AO: [-11.20, 17.87],
  // Asia
  CN: [35.86, 104.19], IN: [20.59, 78.96], JP: [36.20, 138.25],
  KR: [35.90, 127.76], ID: [-0.78, 113.92], PK: [30.37, 69.34],
  BD: [23.68, 90.35], PH: [12.88, 121.77], VN: [14.06, 108.28],
  TH: [15.87, 100.99], MY: [4.21, 101.97], MM: [21.91, 95.96],
  KH: [12.57, 104.99], NP: [28.39, 84.12], LK: [7.87, 80.77],
  TW: [23.70, 121.00], HK: [22.35, 114.18], SG: [1.35, 103.82],
  // Oceania
  AU: [-25.27, 133.77], NZ: [-40.90, 174.89],
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
