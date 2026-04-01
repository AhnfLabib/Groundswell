const FLAG_BASE = 'https://flagcdn.com/20x15'

function sentimentLabel(score) {
  if (score > 0.2) return { label: '▲', color: '#22c55e' }
  if (score < -0.2) return { label: '▼', color: '#ef4444' }
  return { label: '●', color: '#eab308' }
}

export default function LiveFeed({ submissions }) {
  return (
    <div style={{
      height: '100%',
      background: 'rgba(10,15,26,0.7)',
      backdropFilter: 'blur(8px)',
      borderLeft: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '4rem 0 5rem 0',
    }}>
      <div style={{
        padding: '0 1rem 0.75rem',
        fontSize: '0.65rem',
        letterSpacing: '0.12em',
        color: 'var(--color-muted)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        LIVE FEED · {submissions.length} OPINIONS
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {submissions.map((s, i) => {
          const { label, color } = sentimentLabel(s.sentiment)
          return (
            <div
              key={s.id || i}
              style={{
                padding: '0.65rem 1rem',
                borderBottom: '1px solid rgba(31,41,55,0.5)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
                opacity: i === 0 ? 1 : Math.max(0.4, 1 - i * 0.03),
              }}
            >
              <img
                src={`${FLAG_BASE}/${s.country?.toLowerCase()}.png`}
                alt={s.country}
                style={{ width: 20, height: 15, marginTop: 2, flexShrink: 0, borderRadius: 2 }}
                onError={e => e.target.style.display = 'none'}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text)',
                  lineHeight: '1.4',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {s.text}
                </p>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>
                  {s.colo && `via ${s.colo} · `}{s.theme}
                </span>
              </div>
              <span style={{ color, fontSize: '0.75rem', flexShrink: 0 }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
