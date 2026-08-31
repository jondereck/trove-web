const CHECKLIST = /^-\s*\[([ xX])\]\s*(.+)$/

export default function NoteBody({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div style={{ display: 'grid', gap: 10, lineHeight: 1.6 }}>
      {lines.map((line, index) => {
        const match = line.match(CHECKLIST)
        if (match) {
          const checked = match[1]?.toLowerCase() === 'x'
          return (
            <label key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={checked} readOnly />
              <span style={{ textDecoration: checked ? 'line-through' : 'none', color: checked ? 'var(--trove-muted)' : 'inherit' }}>
                {match[2]}
              </span>
            </label>
          )
        }
        if (!line.trim()) return <div key={index} style={{ height: 8 }} />
        return <p key={index}>{line}</p>
      })}
    </div>
  )
}
