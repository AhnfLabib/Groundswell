import { useState, useEffect, useRef, useCallback } from 'react'

const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'
const WS_URL = WORKER_URL.replace(/^http/, 'ws') + '/ws'

export function useGroundswell() {
  const [submissions, setSubmissions] = useState([])
  const [narration, setNarration] = useState(null)
  const [connected, setConnected] = useState(false)
  const [topic, setTopic] = useState('the future of AI')
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'submission') {
        setSubmissions(prev => [msg.data, ...prev].slice(0, 200))
      }

      if (msg.type === 'narration') {
        setNarration(msg.data)
      }

      if (msg.type === 'init') {
        setSubmissions(msg.data.submissions || [])
        setTopic(msg.data.topic || topic)
        if (msg.data.narration) setNarration(msg.data.narration)
      }
    }

    return () => ws.close()
  }, [])

  const submit = useCallback(async (text) => {
    const res = await fetch(`${WORKER_URL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, topic }),
    })
    return res.ok
  }, [topic])

  return { submissions, narration, submit, connected, topic }
}
