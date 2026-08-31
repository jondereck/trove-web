import type { Save, SaveType } from './types'
import { filterLibrarySaves } from './libraryCore'

export type TypeCount = {
  type: SaveType
  label: string
  count: number
}

export type MonthActivity = {
  key: string
  label: string
  count: number
}

export type TagCount = {
  tag: string
  count: number
}

const TYPE_LABELS: Record<SaveType, string> = {
  link: 'Links',
  note: 'Notes',
  image: 'Images',
  video: 'Videos',
  tracker: 'Trackers',
}

const TYPE_ORDER: SaveType[] = ['link', 'note', 'image', 'video', 'tracker']

export function savesByType(saves: Save[]): TypeCount[] {
  const lib = filterLibrarySaves(saves)
  const counts = new Map<SaveType, number>()
  for (const type of TYPE_ORDER) counts.set(type, 0)
  for (const save of lib) {
    counts.set(save.type, (counts.get(save.type) ?? 0) + 1)
  }
  return TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    count: counts.get(type) ?? 0,
  })).filter(row => row.count > 0)
}

export function activityByMonth(saves: Save[], months = 6, now = new Date()): MonthActivity[] {
  const lib = filterLibrarySaves(saves)
  const buckets: MonthActivity[] = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString(undefined, { month: 'short' })
    buckets.push({ key, label, count: 0 })
  }

  for (const save of lib) {
    const created = new Date(save.created_at)
    if (Number.isNaN(created.getTime())) continue
    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.find(row => row.key === key)
    if (bucket) bucket.count += 1
  }

  return buckets
}

export function topTags(saves: Save[], limit = 8): TagCount[] {
  const lib = filterLibrarySaves(saves)
  const counts = new Map<string, number>()
  for (const save of lib) {
    for (const tag of save.tags ?? []) {
      const normalized = tag.trim().toLowerCase()
      if (!normalized) continue
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit)
}

export function hasEnoughStats(saves: Save[]): boolean {
  return filterLibrarySaves(saves).length >= 5
}
