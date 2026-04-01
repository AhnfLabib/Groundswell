import { useState } from 'react'

export default function SubmitBar({ onSubmit, topic }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim() || loading) return
    setLoading(true)
    await onSubmit(text.trim())
    setText('')
    setLoading(false)
  }

  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-border)',
      borderRadius: '0.75rem',
      padding: '0.75rem 1rem',
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'center',
    }}>
      <span style={{ color: 'var(--color-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
        ON {topic.toUpperCase()}
      </span>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="Share your take in one line..."
        maxLength={160}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        style={{
          background: loading ? 'var(--color-border)' : 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '0.5rem',
          padding: '0.4rem 1rem',
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '0.05em',
          transition: 'background 0.2s',
        }}
      >
        {loading ? '...' : 'SEND'}
      </button>
    </div>
  )
}
