/** Markdown checklist helpers for note bodies (`- [ ]` / `- [x]`). */

const CHECK_RE = /^(\s*)([-*]|\d+\.)\s+\[([ xX])\]\s*(.*)$/

export type ChecklistLine = {
  index: number
  indent: string
  bullet: string
  checked: boolean
  text: string
}

export function parseChecklistLines(body: string): ChecklistLine[] {
  const lines = body.split('\n')
  const out: ChecklistLine[] = []
  lines.forEach((line, index) => {
    const m = line.match(CHECK_RE)
    if (!m) return
    out.push({
      index,
      indent: m[1],
      bullet: m[2],
      checked: m[3].toLowerCase() === 'x',
      text: m[4],
    })
  })
  return out
}

export function sinkCheckedItems(body: string): string {
  const lines = body.split('\n')
  const before: string[] = []
  const unchecked: string[] = []
  const checked: string[] = []
  const after: string[] = []
  let seenCheck = false
  for (const line of lines) {
    const m = line.match(CHECK_RE)
    if (m) {
      seenCheck = true
      if (m[3].toLowerCase() === 'x') checked.push(line)
      else unchecked.push(line)
    } else if (!seenCheck) {
      before.push(line)
    } else {
      after.push(line)
    }
  }
  if (!unchecked.length && !checked.length) return body
  return [...before, ...unchecked, ...checked, ...after].join('\n')
}

export function toggleChecklistAt(body: string, lineIndex: number): string {
  const lines = body.split('\n')
  const line = lines[lineIndex]
  if (line == null) return body
  const m = line.match(CHECK_RE)
  if (!m) return body
  const nextChecked = m[3].toLowerCase() !== 'x'
  lines[lineIndex] = `${m[1]}${m[2]} [${nextChecked ? 'x' : ' '}] ${m[4]}`
  return sinkCheckedItems(lines.join('\n'))
}

export function insertChecklistItem(body: string, text = ''): string {
  const item = `- [ ] ${text}`.trimEnd()
  const trimmed = body.replace(/\s+$/, '')
  if (!trimmed) return item
  return sinkCheckedItems(`${trimmed}\n${item}`)
}

export function setChecklistTextAt(body: string, lineIndex: number, text: string): string {
  const lines = body.split('\n')
  const m = lines[lineIndex]?.match(CHECK_RE)
  if (!m) return body
  const parts = text.split(/\r?\n/)
  const first = parts[0] ?? ''
  const extras = parts
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `${m[1]}- [ ] ${line}`)
  lines[lineIndex] = `${m[1]}${m[2]} [${m[3]}] ${first}`
  if (extras.length) lines.splice(lineIndex + 1, 0, ...extras)
  return sinkCheckedItems(lines.join('\n'))
}

export function removeChecklistAt(body: string, lineIndex: number): string {
  const lines = body.split('\n')
  if (!lines[lineIndex]?.match(CHECK_RE)) return body
  lines.splice(lineIndex, 1)
  return sinkCheckedItems(lines.join('\n'))
}

export function bodyHasChecklist(body: string): boolean {
  return parseChecklistLines(body).length > 0
}

function toTickLine(line: string): string {
  if (CHECK_RE.test(line)) return line
  const text = line.trim()
  return text ? `- [ ] ${text}` : '- [ ]'
}

function expandToLineBounds(body: string, start: number, end: number): { start: number; end: number } {
  let s = Math.max(0, Math.min(start, body.length))
  let e = Math.max(s, Math.min(end, body.length))
  while (s > 0 && body[s - 1] !== '\n') s--
  while (e < body.length && body[e] !== '\n') e++
  return { start: s, end: e }
}

/** Turn existing note lines into Keep-style tick boxes. Selected lines only, if a range is passed. */
export function convertToChecklist(
  body: string,
  selection?: { start: number; end: number },
): string {
  if (!body.trim()) return '- [ ]'

  const hasRange = !!selection && selection.end > selection.start
  if (hasRange && selection) {
    const bounds = expandToLineBounds(body, selection.start, selection.end)
    const before = body.slice(0, bounds.start)
    const mid = body.slice(bounds.start, bounds.end)
    const after = body.slice(bounds.end)
    const converted = mid
      .split('\n')
      .filter(line => line.trim().length > 0 || CHECK_RE.test(line))
      .map(toTickLine)
      .join('\n')
    const parts = [before.replace(/\s+$/, ''), converted, after.replace(/^\s+/, '')].filter(Boolean)
    return sinkCheckedItems(parts.join('\n'))
  }

  const next = body
    .split('\n')
    .filter(line => line.trim().length > 0 || CHECK_RE.test(line))
    .map(toTickLine)
  return sinkCheckedItems(next.join('\n') || '- [ ]')
}

/** Readable checklist for copy/select — unicode ticks, never markdown `- [ ]`. */
export function formatChecklistForCopy(body: string): string {
  return body
    .split('\n')
    .map(line => {
      const m = line.match(CHECK_RE)
      if (!m) return line
      return `${m[3].toLowerCase() === 'x' ? '☑' : '☐'} ${m[4]}`
    })
    .join('\n')
}

export function formatNoteForCopy(title: string, body: string): string {
  const formatted = formatChecklistForCopy(body)
  const heading = title.trim()
  if (!heading) return formatted
  if (!formatted.trim()) return heading
  return `${heading}\n\n${formatted}`
}

/** Strip tick boxes and keep the item text as a normal note. */
export function convertFromChecklist(body: string): string {
  return body
    .split('\n')
    .map(line => {
      const m = line.match(CHECK_RE)
      return m ? m[4].trim() : line
    })
    .filter(line => line.trim().length > 0)
    .join('\n')
}

export const NOTE_CARD_CHECKLIST_LIMIT = 4

export type NoteCardChecklistPreview = {
  visible: { text: string; checked: boolean }[]
  hiddenOpenCount: number
  tickedCount: number
  tickedLabel: string | null
}

/** Library-card summary: up to `limit` open ticks, then ellipsis + ticked footer. */
export function buildNoteCardChecklistPreview(
  body: string,
  limit = NOTE_CARD_CHECKLIST_LIMIT,
): NoteCardChecklistPreview | null {
  const checks = parseChecklistLines(body)
  if (!checks.length) return null
  const open = checks.filter(c => !c.checked)
  const tickedCount = checks.length - open.length
  const visible = open.slice(0, limit).map(c => ({ text: c.text, checked: false }))
  const hiddenOpenCount = Math.max(0, open.length - limit)
  const tickedLabel =
    tickedCount <= 0
      ? null
      : tickedCount === 1
        ? '+ 1 ticked item'
        : `+ ${tickedCount} ticked items`
  return { visible, hiddenOpenCount, tickedCount, tickedLabel }
}
