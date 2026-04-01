import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGroundswell } from '../hooks/useGroundswell'

class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.OPEN
    this.onopen = null
    this.onclose = null
    this.onmessage = null
    MockWebSocket.instances.push(this)
  }
  send(data) { this._sent = (this._sent || []).concat(data) }
  close() { this.onclose?.() }
}

MockWebSocket.instances = []
MockWebSocket.OPEN = 1

global.WebSocket = MockWebSocket
global.fetch = vi.fn()

function sendMessage(ws, msg) {
  ws.onmessage?.({ data: JSON.stringify(msg) })
}

describe('useGroundswell', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.clearAllMocks()
  })

  it('starts with empty submissions and disconnected state', () => {
    const { result } = renderHook(() => useGroundswell())
    expect(result.current.submissions).toEqual([])
    expect(result.current.connected).toBe(false)
    expect(result.current.narration).toBeNull()
  })

  it('defaults topic to "the future of AI"', () => {
    const { result } = renderHook(() => useGroundswell())
    expect(result.current.topic).toBe('the future of AI')
  })

  it('sets connected true when WebSocket opens', () => {
    const { result } = renderHook(() => useGroundswell())
    act(() => { MockWebSocket.instances[0].onopen?.() })
    expect(result.current.connected).toBe(true)
  })

  it('sets connected false when WebSocket closes', () => {
    const { result } = renderHook(() => useGroundswell())
    act(() => { MockWebSocket.instances[0].onopen?.() })
    act(() => { MockWebSocket.instances[0].onclose?.() })
    expect(result.current.connected).toBe(false)
  })

  it('prepends new submission to list on submission message', () => {
    const { result } = renderHook(() => useGroundswell())
    act(() => sendMessage(MockWebSocket.instances[0], { type: 'submission', data: { id: '1', text: 'first' } }))
    act(() => sendMessage(MockWebSocket.instances[0], { type: 'submission', data: { id: '2', text: 'second' } }))
    expect(result.current.submissions[0].id).toBe('2')
    expect(result.current.submissions[1].id).toBe('1')
  })

  it('updates narration on narration message', () => {
    const { result } = renderHook(() => useGroundswell())
    act(() => sendMessage(MockWebSocket.instances[0], { type: 'narration', data: 'Global sentiment is rising.' }))
    expect(result.current.narration).toBe('Global sentiment is rising.')
  })

  it('handles init message setting all state', () => {
    const { result } = renderHook(() => useGroundswell())
    act(() => sendMessage(MockWebSocket.instances[0], {
      type: 'init',
      data: {
        submissions: [{ id: '1' }, { id: '2' }],
        topic: 'climate change',
        narration: 'The world watches.',
      }
    }))
    expect(result.current.submissions).toHaveLength(2)
    expect(result.current.topic).toBe('climate change')
    expect(result.current.narration).toBe('The world watches.')
  })

  it('caps submissions at 200', () => {
    const { result } = renderHook(() => useGroundswell())
    act(() => {
      for (let i = 0; i < 205; i++) {
        sendMessage(MockWebSocket.instances[0], { type: 'submission', data: { id: String(i) } })
      }
    })
    expect(result.current.submissions).toHaveLength(200)
  })

  it('submit function POSTs to /submit with text and topic', async () => {
    global.fetch.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useGroundswell())
    await act(async () => { await result.current.submit('my opinion') })
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/submit'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('my opinion'),
      })
    )
  })

  it('submit returns true on ok response', async () => {
    global.fetch.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useGroundswell())
    let ret
    await act(async () => { ret = await result.current.submit('test') })
    expect(ret).toBe(true)
  })
})
