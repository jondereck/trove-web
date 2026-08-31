import type { Save } from './types'

export function filterLibrarySaves(saves: Save[]): Save[] {
  return saves.filter(s => !s.is_inbox && !s.is_vault)
}

export function countsByType(saves: Save[]) {
  const lib = filterLibrarySaves(saves)
  return {
    total: lib.length,
    notes: lib.filter(s => s.type === 'note').length,
    links: lib.filter(s => s.type === 'link').length,
  }
}

export function findSaveById(saves: Save[], id: string): Save | undefined {
  return saves.find(s => s.id === id)
}

export function formatSaveDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function saveSubtitle(save: Save): string {
  if (save.description?.trim()) return save.description.trim()
  if (save.url) {
    try {
      return new URL(save.url).hostname.replace(/^www\./, '')
    } catch {
      return save.url
    }
  }
  if (save.content?.trim()) return save.content.trim().slice(0, 120)
  return save.type
}
