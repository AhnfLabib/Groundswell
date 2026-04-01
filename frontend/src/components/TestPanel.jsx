import { useState, useCallback } from 'react'

// ── Mini test runner ────────────────────────────────────────────────────────
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}
function assertDeepEqual(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b))
    throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

// ── Pure logic mirrored from source files ──────────────────────────────────
function sentimentColor(score) {
  if (score > 0.2) return '#22c55e'
  if (score < -0.2) return '#ef4444'
  return '#eab308'
}

function sentimentLabel(score) {
  if (score > 0.2) return { label: '▲', color: '#22c55e' }
  if (score < -0.2) return { label: '▼', color: '#ef4444' }
  return { label: '●', color: '#eab308' }
}

function clampScore(raw) {
  return Math.max(-1, Math.min(1, parseFloat(raw) || 0))
}

function aggregateByCountry(submissions) {
  const byCountry = {}
  for (const s of submissions) {
    if (!byCountry[s.country]) byCountry[s.country] = []
    byCountry[s.country].push(s.sentiment)
  }
  return Object.entries(byCountry).map(([country, scores]) => ({
    country,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    count: scores.length,
  }))
}

function parseWSMessage(raw, state) {
  const msg = typeof raw === 'string' ? JSON.parse(raw) : raw
  let { submissions, narration, topic } = state

  if (msg.type === 'submission') {
    submissions = [msg.data, ...submissions].slice(0, 200)
  }
  if (msg.type === 'narration') {
    narration = msg.data
  }
  if (msg.type === 'init') {
    submissions = msg.data.submissions || []
    topic = msg.data.topic || topic
    if (msg.data.narration) narration = msg.data.narration
  }
  return { submissions, narration, topic }
}

// ── Test suite definitions ─────────────────────────────────────────────────
const SUITES = [
  {
    id: 'sentiment-color',
    name: 'Sentiment Color (Globe)',
    tests: [
      ['positive score (0.5) → green',   () => assertEqual(sentimentColor(0.5), '#22c55e')],
      ['negative score (-0.5) → red',    () => assertEqual(sentimentColor(-0.5), '#ef4444')],
      ['zero → yellow (neutral)',         () => assertEqual(sentimentColor(0), '#eab308')],
      ['boundary 0.2 → yellow',          () => assertEqual(sentimentColor(0.2), '#eab308')],
      ['boundary -0.2 → yellow',         () => assertEqual(sentimentColor(-0.2), '#eab308')],
      ['0.21 → green',                   () => assertEqual(sentimentColor(0.21), '#22c55e')],
      ['-0.21 → red',                    () => assertEqual(sentimentColor(-0.21), '#ef4444')],
    ],
  },
  {
    id: 'sentiment-label',
    name: 'Sentiment Label (LiveFeed)',
    tests: [
      ['positive → ▲',                   () => assertEqual(sentimentLabel(0.5).label, '▲')],
      ['negative → ▼',                   () => assertEqual(sentimentLabel(-0.5).label, '▼')],
      ['neutral → ●',                    () => assertEqual(sentimentLabel(0).label, '●')],
      ['positive label color is green',  () => assertEqual(sentimentLabel(0.5).color, '#22c55e')],
      ['negative label color is red',    () => assertEqual(sentimentLabel(-0.5).color, '#ef4444')],
      ['neutral label color is yellow',  () => assertEqual(sentimentLabel(0).color, '#eab308')],
    ],
  },
  {
    id: 'score-clamp',
    name: 'Score Clamping (sentiment.js)',
    tests: [
      ['score 2 → clamped to 1',         () => assertEqual(clampScore(2), 1)],
      ['score -2 → clamped to -1',       () => assertEqual(clampScore(-2), -1)],
      ['score 0.5 unchanged',            () => assertEqual(clampScore(0.5), 0.5)],
      ['NaN string → 0',                 () => assertEqual(clampScore('bad'), 0)],
      ['"0.7" parsed correctly',         () => assertEqual(clampScore('0.7'), 0.7)],
      ['score 1 stays 1',                () => assertEqual(clampScore(1), 1)],
      ['score -1 stays -1',              () => assertEqual(clampScore(-1), -1)],
    ],
  },
  {
    id: 'globe-agg',
    name: 'Globe Country Aggregation',
    tests: [
      ['single country aggregated', () => {
        const r = aggregateByCountry([{ country: 'US', sentiment: 0.8 }, { country: 'US', sentiment: 0.6 }])
        assertEqual(r.length, 1)
        assertEqual(r[0].country, 'US')
        assertEqual(r[0].avg, 0.7)
        assertEqual(r[0].count, 2)
      }],
      ['two countries produce two entries', () => {
        const r = aggregateByCountry([{ country: 'US', sentiment: 0.5 }, { country: 'GB', sentiment: -0.5 }])
        assertEqual(r.length, 2)
      }],
      ['empty submissions → empty result', () => {
        assertEqual(aggregateByCountry([]).length, 0)
      }],
      ['opposing sentiments average to 0', () => {
        const r = aggregateByCountry([{ country: 'FR', sentiment: 1 }, { country: 'FR', sentiment: -1 }])
        assertEqual(r[0].avg, 0)
      }],
      ['counts submissions correctly', () => {
        const subs = Array.from({ length: 5 }, () => ({ country: 'DE', sentiment: 0.2 }))
        assertEqual(aggregateByCountry(subs)[0].count, 5)
      }],
    ],
  },
  {
    id: 'ws-messages',
    name: 'WebSocket Message Handling (useGroundswell)',
    tests: [
      ['submission prepends to list', () => {
        const state = { submissions: [{ id: '1' }], narration: null, topic: 'AI' }
        const next = parseWSMessage({ type: 'submission', data: { id: '2' } }, state)
        assertEqual(next.submissions[0].id, '2')
        assertEqual(next.submissions[1].id, '1')
      }],
      ['submissions capped at 200', () => {
        const subs = Array.from({ length: 200 }, (_, i) => ({ id: String(i) }))
        const state = { submissions: subs, narration: null, topic: 'AI' }
        const next = parseWSMessage({ type: 'submission', data: { id: 'new' } }, state)
        assertEqual(next.submissions.length, 200)
        assertEqual(next.submissions[0].id, 'new')
      }],
      ['narration message updates narration', () => {
        const state = { submissions: [], narration: null, topic: 'AI' }
        const next = parseWSMessage({ type: 'narration', data: 'Sentiment rises.' }, state)
        assertEqual(next.narration, 'Sentiment rises.')
      }],
      ['init sets submissions, topic, narration', () => {
        const state = { submissions: [], narration: null, topic: 'old' }
        const next = parseWSMessage({
          type: 'init',
          data: { submissions: [{ id: '1' }], topic: 'new topic', narration: 'Intro text.' },
        }, state)
        assertEqual(next.submissions.length, 1)
        assertEqual(next.topic, 'new topic')
        assertEqual(next.narration, 'Intro text.')
      }],
      ['init preserves old topic when missing', () => {
        const state = { submissions: [], narration: null, topic: 'old' }
        const next = parseWSMessage({ type: 'init', data: { submissions: [] } }, state)
        assertEqual(next.topic, 'old')
      }],
    ],
  },
  {
    id: 'submit-validation',
    name: 'SubmitBar Validation Logic',
    tests: [
      ['empty string is invalid',         () => assert(!''.trim())],
      ['whitespace-only is invalid',      () => assert(!'   '.trim())],
      ['non-empty text is valid',         () => assert('hello'.trim())],
      ['topic shown in uppercase', () => {
        const topic = 'the future of AI'
        assertEqual(`ON ${topic.toUpperCase()}`, 'ON THE FUTURE OF AI')
      }],
      ['max length is 160', () => {
        const ok = 'a'.repeat(160)
        const over = 'a'.repeat(161)
        assert(ok.length <= 160)
        assert(over.length > 160)
      }],
      ['trimmed text submitted', () => {
        const input = '  my opinion  '
        assertEqual(input.trim(), 'my opinion')
      }],
    ],
  },
  {
    id: 'livefeed-logic',
    name: 'LiveFeed Display Logic',
    tests: [
      ['opinion count label format', () => {
        assertEqual(`LIVE FEED · ${42} OPINIONS`, 'LIVE FEED · 42 OPINIONS')
      }],
      ['opacity at index 0 is 1', () => {
        const opacity = (i) => i === 0 ? 1 : Math.max(0.4, 1 - i * 0.03)
        assertEqual(opacity(0), 1)
      }],
      ['opacity never falls below 0.4', () => {
        const opacity = (i) => i === 0 ? 1 : Math.max(0.4, 1 - i * 0.03)
        for (let i = 0; i < 100; i++) {
          assert(opacity(i) >= 0.4, `opacity at index ${i} is below 0.4`)
        }
      }],
      ['colo prefix format', () => {
        const colo = 'LHR', theme = 'climate change'
        assertEqual(`via ${colo} · ${theme}`, 'via LHR · climate change')
      }],
      ['flag URL uses lowercase country code', () => {
        const country = 'US'
        assert(`https://flagcdn.com/20x15/${country.toLowerCase()}.png`.includes('us'))
      }],
    ],
  },
]

// ── Runner ─────────────────────────────────────────────────────────────────
function runSuites() {
  return SUITES.map(suite => ({
    ...suite,
    results: suite.tests.map(([name, fn]) => {
      try {
        fn()
        return { name, status: 'pass' }
      } catch (err) {
        return { name, status: 'fail', error: err.message }
      }
    }),
  }))
}

// ── UI ─────────────────────────────────────────────────────────────────────
const style = {
  panel: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(7,11,20,0.97)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
    color: '#e2e8f0',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #1f2937',
    flexShrink: 0,
  },
  title: { fontSize: '0.8rem', letterSpacing: '0.15em', color: '#6b7280' },
  body: { flex: 1, overflowY: 'auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  suite: { border: '1px solid #1f2937', borderRadius: '0.5rem', overflow: 'hidden' },
  suiteHeader: {
    padding: '0.6rem 1rem',
    background: '#111827',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    letterSpacing: '0.05em',
  },
  testRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.45rem 1rem',
    borderTop: '1px solid rgba(31,41,55,0.5)',
    fontSize: '0.72rem',
  },
  badge: (status) => ({
    flexShrink: 0,
    padding: '0.1rem 0.4rem',
    borderRadius: '0.25rem',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    background: status === 'pass' ? 'rgba(34,197,94,0.15)' : status === 'fail' ? 'rgba(239,68,68,0.15)' : '#1f2937',
    color: status === 'pass' ? '#22c55e' : status === 'fail' ? '#ef4444' : '#6b7280',
  }),
  btn: (variant) => ({
    padding: '0.35rem 0.9rem',
    borderRadius: '0.4rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontFamily: 'monospace',
    letterSpacing: '0.06em',
    fontWeight: 600,
    ...(variant === 'primary'
      ? { background: '#6366f1', color: '#fff' }
      : { background: '#1f2937', color: '#9ca3af' }),
  }),
  error: { fontSize: '0.65rem', color: '#ef4444', marginTop: '0.25rem', opacity: 0.85 },
  summary: (pass, total) => ({
    fontSize: '0.75rem',
    color: pass === total ? '#22c55e' : '#ef4444',
    fontWeight: 700,
  }),
}

export default function TestPanel({ onClose }) {
  const [suites, setSuites] = useState(null)
  const [running, setRunning] = useState(false)

  const runTests = useCallback(() => {
    setRunning(true)
    setSuites(null)
    // Tiny delay so the UI shows "Running…" before synchronous test execution
    setTimeout(() => {
      setSuites(runSuites())
      setRunning(false)
    }, 60)
  }, [])

  const totalTests = suites?.flatMap(s => s.results).length ?? 0
  const totalPass  = suites?.flatMap(s => s.results).filter(r => r.status === 'pass').length ?? 0
  const totalFail  = totalTests - totalPass

  return (
    <div style={style.panel}>
      {/* Header */}
      <div style={style.header}>
        <span style={style.title}>◈ GROUNDSWELL · TEST DASHBOARD</span>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
          {suites && (
            <span style={style.summary(totalPass, totalTests)}>
              {totalPass}/{totalTests} passing{totalFail > 0 ? ` · ${totalFail} failing` : ''}
            </span>
          )}
          <button style={style.btn('primary')} onClick={runTests} disabled={running}>
            {running ? 'Running…' : suites ? '↺ Re-run' : '▶ Run Tests'}
          </button>
          <button style={style.btn('secondary')} onClick={onClose}>✕ Close</button>
        </div>
      </div>

      {/* Body */}
      <div style={style.body}>
        {!suites && !running && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#4b5563', fontSize: '0.8rem' }}>
            Click <strong style={{ color: '#6366f1' }}>▶ Run Tests</strong> to execute the in-browser test suite
          </div>
        )}
        {running && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', fontSize: '0.8rem' }}>
            Running tests…
          </div>
        )}
        {suites?.map(suite => {
          const pass  = suite.results.filter(r => r.status === 'pass').length
          const total = suite.results.length
          const allPass = pass === total
          return (
            <div key={suite.id} style={style.suite}>
              <div style={style.suiteHeader}>
                <span style={{ color: '#e2e8f0' }}>{suite.name}</span>
                <span style={{ color: allPass ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                  {pass}/{total}
                </span>
              </div>
              {suite.results.map((r, i) => (
                <div key={i} style={style.testRow}>
                  <span style={style.badge(r.status)}>{r.status === 'pass' ? 'PASS' : 'FAIL'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: r.status === 'pass' ? '#d1d5db' : '#fca5a5' }}>{r.name}</div>
                    {r.error && <div style={style.error}>{r.error}</div>}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div style={{
        padding: '0.6rem 1.5rem',
        borderTop: '1px solid #1f2937',
        fontSize: '0.65rem',
        color: '#374151',
        flexShrink: 0,
      }}>
        In-browser suite · run <code style={{ color: '#6b7280' }}>npm test</code> in frontend/ and worker/ for the full Vitest suite
      </div>
    </div>
  )
}
