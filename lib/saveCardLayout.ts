import type { Save } from './types'
import { buildNoteCardChecklistPreview } from './noteChecklistPreview'
import { formatTrackerSummary, readTracker, type TrackerSummary } from './tracker'
import type { TrackerStatus } from './tracker'

export function saveCardTrackerSummary(save: Pick<Save, 'type' | 'content' | 'tracker'>): TrackerSummary | null {
  if (save.type !== 'tracker') return null
  const data = readTracker(save)
  return data ? formatTrackerSummary(data) : null
}

export function noteCardShowsTitle(
  save: Pick<Save, 'title' | 'content' | 'description'>,
): boolean {
  const body = saveCardNoteBody(save)
  return !!(save.title && save.title !== body && save.title !== body.slice(0, 60))
}

export function saveCardSourceLabel(type: Save['type']): string {
  if (type === 'note') return 'Note'
  if (type === 'image') return 'Photo'
  if (type === 'video') return 'Video'
  if (type === 'tracker') return 'Tracker'
  return 'Link'
}

export function formatSaveCardDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function saveCardDomain(url?: string): string {
  if (!url?.trim()) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const CHIP_PALETTE = [
  { bg: '#fde8d8', text: '#b84f2a' },
  { bg: '#dff4e8', text: '#2a7a4f' },
  { bg: '#e8e8fc', text: '#4a4aaa' },
  { bg: '#fce8f3', text: '#a0307a' },
  { bg: '#e8f4fd', text: '#1a6090' },
  { bg: '#fdf5d8', text: '#806000' },
  { bg: '#f0eaf8', text: '#6040a0' },
  { bg: '#e8f8f0', text: '#1a7050' },
]

export function tagChipColor(tag: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff
  }
  return CHIP_PALETTE[Math.abs(hash) % CHIP_PALETTE.length]!
}

/** Plain preview for note cards — no raw markdown or checklist syntax. */
export function plainTextFromMarkdown(source: string): string {
  return source
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^-\s*\[[ xX]\]\s*/gm, '')
    .replace(/^[-*+]\s+(?!\[[ xX]\])/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function saveCardNoteBody(save: Pick<Save, 'content' | 'description'>): string {
  return (save.content || save.description || '').trim()
}

export function saveCardDescriptionBlurb(
  save: Pick<Save, 'type' | 'title' | 'content' | 'description'>,
): string | null {
  const title = save.title.trim()
  const body = saveCardNoteBody(save)
  if (!body) return null
  if (body === title) return null

  if (save.type === 'note') {
    if (buildNoteCardChecklistPreview(body)) return null
    return plainTextFromMarkdown(body) || null
  }

  if (save.type === 'link' || save.type === 'image' || save.type === 'video') {
    return body
  }

  return null
}

export function trackerStatusColor(
  status: TrackerStatus | null | undefined,
  accent = '#c0613c',
  muted = '#999999',
): string {
  if (status === 'overdue' || status === 'expired') return '#e53e3e'
  if (status === 'due_soon') return accent
  if (status === 'on_track' || status === 'active') return '#2a7a4f'
  return muted
}
