import type { Save } from './types'

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
