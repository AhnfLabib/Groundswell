import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LiveFeed from '../components/LiveFeed'

const mockSubmissions = [
  { id: '1', text: 'AI is transforming the world', country: 'US', colo: 'LAX', theme: 'optimism', sentiment: 0.8 },
  { id: '2', text: 'Concerns about job losses', country: 'GB', colo: 'LHR', theme: 'concern', sentiment: -0.5 },
  { id: '3', text: 'Hard to say what will happen', country: 'DE', colo: 'FRA', theme: 'uncertain', sentiment: 0.1 },
]

describe('LiveFeed', () => {
  it('shows correct opinion count', () => {
    render(<LiveFeed submissions={mockSubmissions} />)
    expect(screen.getByText('LIVE FEED · 3 OPINIONS')).toBeTruthy()
  })

  it('shows zero opinions for empty list', () => {
    render(<LiveFeed submissions={[]} />)
    expect(screen.getByText('LIVE FEED · 0 OPINIONS')).toBeTruthy()
  })

  it('renders all submission texts', () => {
    render(<LiveFeed submissions={mockSubmissions} />)
    expect(screen.getByText('AI is transforming the world')).toBeTruthy()
    expect(screen.getByText('Concerns about job losses')).toBeTruthy()
    expect(screen.getByText('Hard to say what will happen')).toBeTruthy()
  })

  it('renders positive sentiment indicator ▲', () => {
    render(<LiveFeed submissions={[mockSubmissions[0]]} />)
    expect(screen.getByText('▲')).toBeTruthy()
  })

  it('renders negative sentiment indicator ▼', () => {
    render(<LiveFeed submissions={[mockSubmissions[1]]} />)
    expect(screen.getByText('▼')).toBeTruthy()
  })

  it('renders neutral sentiment indicator ●', () => {
    render(<LiveFeed submissions={[mockSubmissions[2]]} />)
    expect(screen.getByText('●')).toBeTruthy()
  })

  it('renders colo and theme info', () => {
    render(<LiveFeed submissions={[mockSubmissions[0]]} />)
    expect(screen.getByText(/via LAX/)).toBeTruthy()
    expect(screen.getByText(/optimism/)).toBeTruthy()
  })

  it('renders flag images for each submission', () => {
    render(<LiveFeed submissions={[mockSubmissions[0]]} />)
    const img = screen.getByRole('img')
    expect(img.src).toContain('us')
  })
})
