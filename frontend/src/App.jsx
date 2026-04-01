import { useState } from 'react'
import { useGroundswell } from './hooks/useGroundswell'
import Globe from './components/Globe'
import SubmitBar from './components/SubmitBar'
import Narrator from './components/Narrator'
import LiveFeed from './components/LiveFeed'
import TestPanel from './components/TestPanel'

export default function App() {
  const { submissions, narration, submit, connected, topic } = useGroundswell()
  const [showTests, setShowTests] = useState(false)

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <header className="absolute top-0 left-0 z-20 p-4 flex items-center gap-3">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-accent)' }}>
          Groundswell
        </span>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
          THE WORLD'S PULSE, LIVE
        </span>
        <span
          className="ml-2 w-2 h-2 rounded-full"
          style={{ background: connected ? 'var(--color-positive)' : 'var(--color-negative)' }}
        />
        <button
          onClick={() => setShowTests(true)}
          style={{
            marginLeft: '0.75rem',
            padding: '0.2rem 0.6rem',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '0.35rem',
            color: '#818cf8',
            fontSize: '0.65rem',
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          ◈ TESTS
        </button>
      </header>

      {showTests && <TestPanel onClose={() => setShowTests(false)} />}

      {/* Map — full canvas */}
      <div className="absolute inset-0 z-0">
        <Globe submissions={submissions} />
      </div>

      {/* Live Feed — right sidebar */}
      <div className="absolute right-0 top-0 h-full z-10 w-72">
        <LiveFeed submissions={submissions} />
      </div>

      {/* Narrator — bottom left */}
      <div className="absolute bottom-20 left-4 z-10 w-80">
        <Narrator narration={narration} topic={topic} />
      </div>

      {/* Submit Bar — bottom center */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-4">
        <SubmitBar onSubmit={submit} topic={topic} />
      </div>

    </div>
  )
}
