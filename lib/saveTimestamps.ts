import type { SaveUpdate } from './types'

const UPDATED_AT_BUMP_KEYS = new Set([
  'title',
  'description',
  'content',
  'url',
  'type',
  'collection_id',
  'is_inbox',
  'tags',
  'image_url',
  'image_urls',
  'editor_style',
  'is_pinned',
  'is_favorite',
])

export function shouldBumpUpdatedAt(
  updates: Record<string, unknown>,
  opts?: { bump?: boolean },
): boolean {
  if (opts?.bump === false) return false
  return Object.keys(updates).some(
    key => key !== 'updated_at' && UPDATED_AT_BUMP_KEYS.has(key),
  )
}
