const CHECKLIST = /^-\s*\[([ xX])\]\s*(.+)$/

export type NoteCardChecklistPreview = {
  visible: { text: string; checked: boolean }[]
  hiddenOpenCount: number
  tickedLabel: string | null
}

export function buildNoteCardChecklistPreview(
  body: string,
  limit = 4,
): NoteCardChecklistPreview | null {
  const lines = body.split('\n')
  const checks = lines
    .map(line => line.match(CHECKLIST))
    .filter(Boolean) as RegExpMatchArray[]

  if (!checks.length) return null

  const open = checks.filter(m => m[1]?.toLowerCase() !== 'x')
  const tickedCount = checks.length - open.length
  const visible = open.slice(0, limit).map(m => ({ text: m[2]!.trim(), checked: false }))
  const hiddenOpenCount = Math.max(0, open.length - limit)
  const tickedLabel =
    tickedCount <= 0
      ? null
      : tickedCount === 1
        ? '+ 1 ticked item'
        : `+ ${tickedCount} ticked items`

  return { visible, hiddenOpenCount, tickedLabel }
}
