/**
 * GroundswellRoom — Durable Object
 *
 * Single global instance that:
 * - Owns all submission state
 * - Manages WebSocket connections (fan-out to all clients)
 * - Triggers AI narrator every 30s or every 10 submissions
 */
export class GroundswellRoom {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.sessions = new Set()       // active WebSocket connections
    this.submissions = []           // last 200 submissions
    this.submissionCount = 0
    this.lastNarration = null
    this.lastNarratedAt = 0
  }

  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      // Upgrade to WebSocket
      const { 0: client, 1: server } = new WebSocketPair()
      this.handleSession(server)
      return new Response(null, { status: 101, webSocket: client })
    }

    if (url.pathname === '/ingest' && request.method === 'POST') {
      const submission = await request.json()
      this.submissions = [submission, ...this.submissions].slice(0, 200)
      this.submissionCount++

      // Fan out to all connected clients
      this.broadcast({ type: 'submission', data: submission })

      // Trigger narrator every 10 submissions or every 30s
      const now = Date.now()
      if (this.submissionCount % 10 === 0 || now - this.lastNarratedAt > 30_000) {
        this.generateNarration()
      }

      return new Response('ok')
    }

    return new Response('not found', { status: 404 })
  }

  handleSession(ws) {
    ws.accept()
    this.sessions.add(ws)

    // Send current state on connect
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        submissions: this.submissions.slice(0, 50),
        topic: this.env.TOPIC,
        narration: this.lastNarration,
      }
    }))

    ws.addEventListener('close', () => this.sessions.delete(ws))
    ws.addEventListener('error', () => this.sessions.delete(ws))
  }

  broadcast(msg) {
    const payload = JSON.stringify(msg)
    for (const ws of this.sessions) {
      try { ws.send(payload) } catch { this.sessions.delete(ws) }
    }
  }

  async generateNarration() {
    this.lastNarratedAt = Date.now()
    if (this.submissions.length < 3) return

    const topic = this.env.TOPIC
    const sample = this.submissions.slice(0, 20)
    const avgSentiment = sample.reduce((a, s) => a + s.sentiment, 0) / sample.length
    const countries = [...new Set(sample.map(s => s.country))].join(', ')
    const themes = sample.map(s => s.theme).join(', ')

    const prompt = `You are a live global sentiment narrator for a real-time opinion map about "${topic}".
Current data snapshot:
- Average sentiment: ${avgSentiment.toFixed(2)} (-1=negative, 1=positive)
- Active countries: ${countries}
- Key themes: ${themes}

Write ONE punchy, insightful sentence (max 25 words) narrating what's happening globally right now. Be specific and vivid.`

    try {
      const response = await this.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
      })
      this.lastNarration = response.response.trim().replace(/^"|"$/g, '')
      this.broadcast({ type: 'narration', data: this.lastNarration })
    } catch (e) {
      console.error('Narration failed:', e)
    }
  }
}
