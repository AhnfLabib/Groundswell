import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Globe from '../components/Globe'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children, pathOptions }) => (
    <div data-testid="circle-marker" data-fill={pathOptions?.fillColor}>{children}</div>
  ),
  Tooltip: ({ children }) => <div data-testid="tooltip">{children}</div>,
}))

vi.mock('leaflet/dist/leaflet.css', () => ({}))

const POSITIVE = [{ id: '1', country: 'US', sentiment: 0.8, text: 'Great' }]
const NEGATIVE = [{ id: '2', country: 'GB', sentiment: -0.6, text: 'Bad' }]
const NEUTRAL  = [{ id: '3', country: 'DE', sentiment: 0.1, text: 'Meh' }]
const MULTI    = [
  { id: '1', country: 'US', sentiment: 0.8, text: 'Great' },
  { id: '2', country: 'US', sentiment: 0.6, text: 'Good' },
  { id: '3', country: 'GB', sentiment: -0.5, text: 'Bad' },
]

describe('Globe', () => {
  it('renders map container', () => {
    const { getByTestId } = render(<Globe submissions={[]} />)
    expect(getByTestId('map-container')).toBeTruthy()
  })

  it('renders no markers for empty submissions', () => {
    const { queryAllByTestId } = render(<Globe submissions={[]} />)
    expect(queryAllByTestId('circle-marker').length).toBe(0)
  })

  it('renders one marker per unique country', () => {
    const { getAllByTestId } = render(<Globe submissions={MULTI} />)
    expect(getAllByTestId('circle-marker').length).toBe(2)
  })

  it('renders no marker for unknown country code', () => {
    const { queryAllByTestId } = render(<Globe submissions={[{ id: '1', country: 'XX', sentiment: 0.5 }]} />)
    expect(queryAllByTestId('circle-marker').length).toBe(0)
  })

  it('uses green fill for positive sentiment', () => {
    const { getByTestId } = render(<Globe submissions={POSITIVE} />)
    expect(getByTestId('circle-marker').dataset.fill).toBe('#22c55e')
  })

  it('uses red fill for negative sentiment', () => {
    const { getByTestId } = render(<Globe submissions={NEGATIVE} />)
    expect(getByTestId('circle-marker').dataset.fill).toBe('#ef4444')
  })

  it('uses yellow fill for neutral sentiment', () => {
    const { getByTestId } = render(<Globe submissions={NEUTRAL} />)
    expect(getByTestId('circle-marker').dataset.fill).toBe('#eab308')
  })

  it('shows averaged sentiment in tooltip', () => {
    const twoUS = [
      { id: '1', country: 'US', sentiment: 1.0 },
      { id: '2', country: 'US', sentiment: 0.0 },
    ]
    const { getByTestId } = render(<Globe submissions={twoUS} />)
    expect(getByTestId('tooltip').textContent).toContain('0.50')
  })

  it('shows opinion count in tooltip', () => {
    const { getByTestId } = render(<Globe submissions={MULTI.filter(s => s.country === 'US')} />)
    expect(getByTestId('tooltip').textContent).toContain('2 opinions')
  })
})
