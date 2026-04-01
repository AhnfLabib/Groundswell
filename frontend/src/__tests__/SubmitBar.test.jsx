import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubmitBar from '../components/SubmitBar'

describe('SubmitBar', () => {
  const mockSubmit = vi.fn()

  beforeEach(() => {
    mockSubmit.mockReset()
    mockSubmit.mockResolvedValue(true)
  })

  it('renders topic in uppercase', () => {
    render(<SubmitBar onSubmit={mockSubmit} topic="the future of AI" />)
    expect(screen.getByText('ON THE FUTURE OF AI')).toBeTruthy()
  })

  it('shows placeholder text', () => {
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    expect(screen.getByPlaceholderText('Share your take in one line...')).toBeTruthy()
  })

  it('submit button is disabled when input is empty', () => {
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    expect(screen.getByRole('button', { name: 'SEND' }).disabled).toBe(true)
  })

  it('submit button is enabled when text is entered', async () => {
    const user = userEvent.setup()
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    await user.type(screen.getByPlaceholderText('Share your take in one line...'), 'hello world')
    expect(screen.getByRole('button', { name: 'SEND' }).disabled).toBe(false)
  })

  it('calls onSubmit with trimmed text on button click', async () => {
    const user = userEvent.setup()
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    await user.type(screen.getByPlaceholderText('Share your take in one line...'), '  my opinion  ')
    await user.click(screen.getByRole('button', { name: 'SEND' }))
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('my opinion'))
  })

  it('calls onSubmit on Enter key', async () => {
    const user = userEvent.setup()
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    await user.type(screen.getByPlaceholderText('Share your take in one line...'), 'test opinion')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('test opinion'))
  })

  it('clears input after submit', async () => {
    const user = userEvent.setup()
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    const input = screen.getByPlaceholderText('Share your take in one line...')
    await user.type(input, 'test opinion')
    await user.click(screen.getByRole('button', { name: 'SEND' }))
    await waitFor(() => expect(input.value).toBe(''))
  })

  it('ignores whitespace-only input', async () => {
    const user = userEvent.setup()
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    await user.type(screen.getByPlaceholderText('Share your take in one line...'), '   ')
    expect(screen.getByRole('button', { name: 'SEND' }).disabled).toBe(true)
    await user.keyboard('{Enter}')
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('shows loading indicator while submitting', async () => {
    let resolve
    mockSubmit.mockReturnValue(new Promise(r => (resolve = r)))
    const user = userEvent.setup()
    render(<SubmitBar onSubmit={mockSubmit} topic="AI" />)
    await user.type(screen.getByPlaceholderText('Share your take in one line...'), 'test')
    await user.click(screen.getByRole('button', { name: 'SEND' }))
    expect(screen.getByRole('button', { name: '...' })).toBeTruthy()
    resolve(true)
    await waitFor(() => expect(screen.queryByRole('button', { name: '...' })).toBeNull())
  })
})
