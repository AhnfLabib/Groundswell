import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Narrator from '../components/Narrator'

describe('Narrator', () => {
  it('renders nothing when narration is null', () => {
    const { container } = render(<Narrator narration={null} topic="AI" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when narration is empty string', () => {
    const { container } = render(<Narrator narration="" topic="AI" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders AI NARRATOR label when narration is provided', () => {
    render(<Narrator narration="Global sentiment is rising." topic="AI" />)
    expect(screen.getByText(/AI NARRATOR/)).toBeTruthy()
  })

  it('renders narration text', () => {
    const narration = 'Europe leads optimism as Asia diverges sharply.'
    render(<Narrator narration={narration} topic="AI" />)
    expect(screen.getByText(narration)).toBeTruthy()
  })

  it('does not crash with undefined narration', () => {
    const { container } = render(<Narrator topic="AI" />)
    expect(container.firstChild).toBeNull()
  })
})
