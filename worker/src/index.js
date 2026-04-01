import { scoreSentiment } from './sentiment.js'
export { GroundswellRoom } from './GroundswellRoom.js'

function cors(request, env) {
  const origin = env.ALLOWED_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const headers = cors(request, env)

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    // WebSocket upgrade → route to Durable Object
    if (url.pathname === '/ws') {
      const id = env.GROUNDSWELL_ROOM.idFromName('global')
      const room = env.GROUNDSWELL_ROOM.get(id)
      return room.fetch(request)
    }

    // POST /submit — main ingestion route
    if (url.pathname === '/submit' && request.method === 'POST') {
      const body = await request.json()
      const { text, topic } = body

      if (!text || text.length > 160) {
        return new Response('Invalid input', { status: 400, headers })
      }

      // Read Cloudflare edge metadata — this is the magic
      const country = request.cf?.country || 'XX'
      const colo = request.cf?.colo || 'UNK'

      // Score sentiment with Workers AI
      const { score, theme } = await scoreSentiment(text, topic || env.TOPIC, env.AI)

      const submission = {
        id: crypto.randomUUID(),
        text,
        topic: topic || env.TOPIC,
        country,
        colo,
        sentiment: score,
        theme,
        ts: Date.now(),
      }

      // Report to Durable Object
      const id_ = env.GROUNDSWELL_ROOM.idFromName('global')
      const room = env.GROUNDSWELL_ROOM.get(id_)
      await room.fetch(new Request('https://internal/ingest', {
        method: 'POST',
        body: JSON.stringify(submission),
        headers: { 'Content-Type': 'application/json' },
      }))

      // Cache regional summary in KV (fire and forget)
      env.KV_SENTIMENT.put(
        `country:${country}:latest`,
        JSON.stringify({ sentiment: score, theme, ts: Date.now() }),
        { expirationTtl: 60 }
      ).catch(() => {})

      return new Response(JSON.stringify(submission), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      })
    }

    return new Response('Not found', { status: 404, headers })
  }
}
