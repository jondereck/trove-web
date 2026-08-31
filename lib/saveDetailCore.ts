import type { Save, SaveType, SaveUpdate } from './types'
import { readTracker } from './tracker'

export function applySavePatch(save: Save, patch: SaveUpdate): Save {
  const merged = { ...save, ...patch } as Save
  if ('image_url' in patch && patch.image_url === null) merged.image_url = undefined
  if ('image_urls' in patch && patch.image_urls === null) merged.image_urls = undefined
  return hydrateSave(merged)
}

export const TYPE_COLORS: Record<SaveType, string> = {
  link: '#3b82f6',
  note: '#8b5cf6',
  image: '#10b981',
  video: '#f59e0b',
  tracker: '#c0613c',
}

export const TYPE_LABELS: Record<SaveType, string> = {
  link: 'LINK',
  note: 'NOTE',
  image: 'IMAGE',
  video: 'VIDEO',
  tracker: 'TRACKER',
}

export function readSaveBody(save: Pick<Save, 'type' | 'content' | 'description'>): string {
  if (save.type === 'note') return save.content || save.description || ''
  return save.description || save.content || ''
}

export function bodyFieldForType(type: SaveType): 'content' | 'description' {
  return type === 'note' ? 'content' : 'description'
}

export function hydrateSave(save: Save): Save {
  if (save.type !== 'tracker') return save
  const tracker = readTracker(save)
  return tracker ? { ...save, tracker } : save
}

export function saveDetailHref(save: Pick<Save, 'id' | 'type'>): string {
  return save.type === 'tracker' ? `/tracker/${save.id}` : `/library/${save.id}`
}

export function formatSavedTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const datePart = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const timePart = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${datePart} · ${timePart}`
}
