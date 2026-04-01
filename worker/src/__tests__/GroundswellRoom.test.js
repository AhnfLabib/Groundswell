import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroundswellRoom } from '../GroundswellRoom.js'

function makeEnv(overrides = {}) {
  return {
    TOPIC: 'the future of AI',
    AI: { run: vi.fn().mockResolvedValue({ response: 'Global sentiment is mixed.' }) },
    ...overrides,
  }
}

function makeRoom(envOverrides = {}) {
  return new GroundswellRoom({}, makeEnv(envOverrides))
}

function makeWS() {
  const handlers = {}
  const ws = {
    sent: [],
    accept: vi.fn(),
    send: vi.fn(data => ws.sent.push(JSON.parse(data))),
    addEventListener: vi.fn((event, cb) => { handlers[event] = cb }),
    trigger: (event) => handlers[event]?.(),
  }
  return ws
}

async function ingest(room, submission) {
  return room.fetch(new Request('https://internal/ingest', {
    method: 'POST',
    body: JSON.stringify(submission),
    headers: { 'Content-Type': 'application/json' },
  }))
}

const baseSub = (id) => ({ id: String(id), text: `sub ${id}`, country: 'US', sentiment: 0, theme: 'test', ts: Date.now() })

describe('GroundswellRoom', () => {
  let room

  beforeEach(() => {
    room = makeRoom()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends init message with topic when session connects', () => {
    const ws = makeWS()
    room.handleSession(ws)
    const init = ws.sent[0]
    expect(init.type).toBe('init')
    expect(init.data.topic).toBe('the future of AI')
  })

  it('sends existing submissions (up to 50) in init message', async () => {
    await ingest(room, baseSub(1))
    await ingest(room, baseSub(2))
    const ws = makeWS()
    room.handleSession(ws)
    const init = ws.sent[0]
    expect(init.data.submissions).toHaveLength(2)
  })

  it('broadcasts submission to all connected clients', async () => {
    const ws1 = makeWS()
    const ws2 = makeWS()
    room.handleSession(ws1)
    room.handleSession(ws2)
    await ingest(room, baseSub(1))
    expect(ws1.sent.find(m => m.type === 'submission')?.data.id).toBe('1')
    expect(ws2.sent.find(m => m.type === 'submission')?.data.id).toBe('1')
  })

  it('increments submission count per ingest', async () => {
    await ingest(room, baseSub(1))
    await ingest(room, baseSub(2))
    expect(room.submissionCount).toBe(2)
  })

  it('keeps only last 200 submissions', async () => {
    for (let i = 0; i < 205; i++) {
      await ingest(room, baseSub(i))
    }
    expect(room.submissions.length).toBe(200)
  })

  it('stores newest submission at head', async () => {
    await ingest(room, baseSub(1))
    await ingest(room, baseSub(2))
    expect(room.submissions[0].id).toBe('2')
  })

  it('removes session when WebSocket closes', () => {
    const ws = makeWS()
    room.handleSession(ws)
    expect(room.sessions.size).toBe(1)
    ws.trigger('close')
    expect(room.sessions.size).toBe(0)
  })

  it('removes session when WebSocket errors', () => {
    const ws = makeWS()
    room.handleSession(ws)
    ws.trigger('error')
    expect(room.sessions.size).toBe(0)
  })

  it('triggers narration on every 10th submission', async () => {
    // Prime lastNarratedAt so the 30s time-based trigger doesn't fire on first ingest
    room.lastNarratedAt = Date.now()
    const spy = vi.spyOn(room, 'generateNarration')
    for (let i = 1; i <= 10; i++) {
      await ingest(room, baseSub(i))
    }
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('triggers narration after 30s even without 10 submissions', async () => {
    // Prime lastNarratedAt so first ingest doesn't trigger via the time condition
    room.lastNarratedAt = Date.now()
    const spy = vi.spyOn(room, 'generateNarration')
    await ingest(room, baseSub(1))
    vi.advanceTimersByTime(31_000)
    await ingest(room, baseSub(2))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('returns 404 for unknown route', async () => {
    const res = await room.fetch(new Request('https://internal/nope'))
    expect(res.status).toBe(404)
  })

  it('broadcasts narration to all clients after generation', async () => {
    for (let i = 0; i < 3; i++) {
      await ingest(room, baseSub(i))
    }
    const ws = makeWS()
    room.handleSession(ws)
    await room.generateNarration()
    const narrationMsg = ws.sent.find(m => m.type === 'narration')
    expect(narrationMsg?.data).toBeTruthy()
  })

  it('skips narration when fewer than 3 submissions', async () => {
    const ws = makeWS()
    room.handleSession(ws)
    await ingest(room, baseSub(1))
    await ingest(room, baseSub(2))
    ws.sent = []
    await room.generateNarration()
    expect(ws.sent.find(m => m.type === 'narration')).toBeUndefined()
  })
})
