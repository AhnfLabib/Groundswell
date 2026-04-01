export default function Narrator({ narration, topic }) {
  if (!narration) return null

  return (
    <div style={{
      background: 'rgba(17,24,39,0.85)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--color-border)',
      borderRadius: '0.75rem',
      padding: '1rem',
    }}>
      <div style={{
        fontSize: '0.65rem',
        letterSpacing: '0.12em',
        color: 'var(--color-accent)',
        marginBottom: '0.5rem',
      }}>
        ▸ AI NARRATOR
      </div>
      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '0.95rem',
        lineHeight: '1.5',
        color: 'var(--color-text)',
      }}>
        {narration}
      </p>
    </div>
  )
}
