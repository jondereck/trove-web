import type { Collection } from './types'

export const WEB_UNSORTED_LABEL = 'Unsorted'

export type QuickSaveCollChip = {
  /** '' = Unsorted; otherwise collection name (matches mobile picker ids). */
  id: string
  label: string
  collectionId?: string
  recommended?: boolean
  isNew?: boolean
}

/** Mirror mobile Quick Save collection chips: Unsorted + AI suggestion + existing folders. */
export function buildQuickSaveCollectionChips(input: {
  collections: Pick<Collection, 'id' | 'name'>[]
  suggestedCollection?: string | null
  unsortedLabel?: string
}): QuickSaveCollChip[] {
  const unsortedLabel = input.unsortedLabel ?? WEB_UNSORTED_LABEL
  const existing = new Set(input.collections.map(c => c.name.toLowerCase()))
  const sugg = input.suggestedCollection?.trim() || ''
  const suggIsNew =
    !!sugg &&
    sugg.toLowerCase() !== 'read later' &&
    !existing.has(sugg.toLowerCase())

  const opts: QuickSaveCollChip[] = [{ id: '', label: unsortedLabel }]
  if (suggIsNew) {
    opts.push({ id: sugg, label: sugg, isNew: true, recommended: true })
  }
  for (const c of input.collections) {
    opts.push({
      id: c.name,
      label: c.name,
      collectionId: c.id,
      recommended: !!sugg && sugg.toLowerCase() === c.name.toLowerCase(),
    })
  }
  return opts
}

/** Auto-organize picks the suggested folder unless it's the inert Read Later default. */
export function autoSelectCollectionId(
  suggestedCollection: string | null | undefined,
): string {
  const sugg = suggestedCollection?.trim() || ''
  if (!sugg || sugg.toLowerCase() === 'read later') return ''
  return sugg
}
