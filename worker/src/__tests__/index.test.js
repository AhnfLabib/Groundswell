import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../index.js'

vi.mock('../sentiment.js', () => ({
  scoreSentiment: vi.fn().mockResolvedValue({ score: 0.5, theme: 'test theme' }),
}))

function makeEnv(overrides = {}) {
  return {
    GROUNDSWELL_ROOM: {
      idFromName: vi.fn().mockReturnValue('room-id'),
      get: vi.fn().mockReturnValue({
        fetch: vi.fn().mockResolvedValue(new Response('ok')),
      }),
    },
    KV_SENTIMENT: {
      put: vi.fn().mockResolvedValue(undefined),
    },
    AI: {},
    TOPIC: 'the future of AI',
    ...overrides,
  }
}

function makeRequest(method, path, body, cfOverrides = {}) {
  const req = new Request(`https://worker.test${path}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : {},
  })
  req.cf = { country: 'US', colo: 'LAX', ...cfOverrides }
  return req
}

describe('Worker entry point', () => {
  let env

  beforeEach(() => {
    env = makeEnv()
    vi.clearAllMocks()
  })

  it('returns 400 for empty text', async () => {
    const res = await worker.fetch(makeRequest('POST', '/submit', { text: '' }), env)
    expect(res.status).toBe(400)
  })

  it('returns 400 when text exceeds 160 chars', async () => {
    const res = await worker.fetch(makeRequest('POST', '/submit', { text: 'a'.repeat(161) }), env)
    expect(res.status).toBe(400)
  })

  it('returns 400 when text is missing', async () => {
    const res = await worker.fetch(makeRequest('POST', '/submit', {}), env)
    expect(res.status).toBe(400)
  })

  it('returns 200 with submission JSON for valid input', async () => {
    const res = await worker.fetch(makeRequest('POST', '/submit', { text: 'AI will change everything', topic: 'AI' }), env)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.text).toBe('AI will change everything')
    expect(json.id).toBeDefined()
    expect(json.sentiment).toBe(0.5)
  })

  it('reads country from cf object', async () => {
    const res = await worker.fetch(makeRequest('POST', '/submit', { text: 'hello', topic: 'AI' }, { country: 'FR' }), env)
    const json = await res.json()
    expect(json.country).toBe('FR')
  })

  it('reads colo from cf object', async () => {
    const res = await worker.fetch(makeRequest('POST', '/submit', { text: 'hello', topic: 'AI' }, { colo: 'CDG' }), env)
    const json = await res.json()
    expect(json.colo).toBe('CDG')
  })

  it('falls back to XX when cf.country is missing', async () => {
    const req = new Request('https://worker.test/submit', {
      method: 'POST',
      body: JSON.stringify({ text: 'hello', topic: 'AI' }),
      headers: { 'Content-Type': 'application/json' },
    })
    req.cf = {}
    const res = await worker.fetch(req, env)
    const json = await res.json()
    expect(json.country).toBe('XX')
  })

  it('handles OPTIONS preflight with CORS headers', async () => {
    const req = new Request('https://worker.test/submit', { method: 'OPTIONS' })
    req.cf = {}
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('returns 404 for unknown paths', async () => {
    const req = new Request('https://worker.test/unknown')
    req.cf = {}
    const res = await worker.fetch(req, env)
    expect(res.status).toBe(404)
  })

  it('forwards /ws to Durable Object', async () => {
    const req = new Request('https://worker.test/ws')
    req.cf = {}
    await worker.fetch(req, env)
    expect(env.GROUNDSWELL_ROOM.get().fetch).toHaveBeenCalled()
  })

  it('sets timestamp on submission', async () => {
    const before = Date.now()
    const res = await worker.fetch(makeRequest('POST', '/submit', { text: 'timed', topic: 'AI' }), env)
    const json = await res.json()
    expect(json.ts).toBeGreaterThanOrEqual(before)
  })
})
