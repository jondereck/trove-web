import type { Collection, Save } from '../types'

const REQUIRED_HEADERS = ['url', 'title', 'folder', 'created'] as const
const UNSORTED = 'unsorted'

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
      if (ch === '\r') i++
      row.push(field)
      field = ''
      if (row.some(c => c.length > 0) || row.length > 1) rows.push(row)
      row = []
    } else if (ch === '\r') {
      row.push(field)
      field = ''
      if (row.some(c => c.length > 0) || row.length > 1) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }

  row.push(field)
  if (row.some(c => c.length > 0) || row.length > 1) rows.push(row)
  return rows
}

export function isRaindropCsv(text: string): boolean {
  const trimmed = text.replace(/^\uFEFF/, '').trimStart()
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return false
  const firstLineEnd = (() => {
    let inQuotes = false
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i]
      if (ch === '"') inQuotes = !inQuotes
      else if (!inQuotes && (ch === '\n' || ch === '\r')) return i
    }
    return trimmed.length
  })()
  const headerLine = trimmed.slice(0, firstLineEnd).toLowerCase()
  const cols = new Set(headerLine.split(',').map(c => c.trim().replace(/^"|"$/g, '')))
  return REQUIRED_HEADERS.every(h => cols.has(h))
}

function titleFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || 'Untitled'
  } catch {
    return 'Untitled'
  }
}

function parseTags(raw: string, folder?: string): string[] {
  const tags = raw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
  if (folder && folder.toLowerCase() !== UNSORTED && !tags.includes(folder)) {
    tags.unshift(folder)
  }
  return tags
}

export function previewRaindropCsv(text: string): { saves: Save[]; collections: Collection[] } {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) {
    throw new Error('No bookmarks found in that Raindrop CSV.')
  }

  const headers = rows[0].map(h => h.trim().toLowerCase())
  const idx = (name: string) => headers.indexOf(name)
  const iUrl = idx('url')
  const iTitle = idx('title')
  const iNote = idx('note')
  const iExcerpt = idx('excerpt')
  const iFolder = idx('folder')
  const iTags = idx('tags')
  const iCreated = idx('created')
  const iCover = idx('cover')

  if (iUrl < 0 || iTitle < 0 || iFolder < 0 || iCreated < 0) {
    throw new Error('That CSV is missing required Raindrop columns.')
  }

  const get = (row: string[], i: number) => (i >= 0 && i < row.length ? row[i].trim() : '')

  const saves: Save[] = []
  const collectionNames = new Set<string>()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const url = get(row, iUrl)
    if (!url) continue

    const folder = get(row, iFolder)
    const unsorted = !folder || folder.toLowerCase() === UNSORTED
    if (!unsorted) collectionNames.add(folder)

    const created = get(row, iCreated) || new Date().toISOString()
    saves.push({
      id: `raindrop-${r}`,
      user_id: 'import',
      url,
      title: get(row, iTitle) || titleFromUrl(url),
      description: get(row, iExcerpt) || undefined,
      type: 'link',
      content: get(row, iNote) || undefined,
      image_url: get(row, iCover) || undefined,
      tags: parseTags(get(row, iTags), unsorted ? undefined : folder),
      is_inbox: unsorted,
      created_at: created,
    })
  }

  if (saves.length === 0) {
    throw new Error('No bookmarks found in that Raindrop CSV.')
  }

  const collections: Collection[] = [...collectionNames].map((name, index) => ({
    id: `raindrop-col-${index}`,
    user_id: 'import',
    name,
    created_at: new Date().toISOString(),
  }))

  return { saves, collections }
}
