import type { CollectionCoverSlot } from './types'

export const MAX_COVERS = 3

type CoverSave = {
  image_url?: string | null
  url?: string | null
  title?: string | null
  content?: string | null
  description?: string | null
  type?: string | null
}

function getUrlDomain(url?: string | null): string {
  if (!url?.trim()) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function notePreviewText(body?: string | null): string {
  const raw = body?.trim() ?? ''
  if (!raw) return ''
  return raw
    .replace(/^-\s*\[[ xX]\]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function slotFromSave(save: CoverSave): CollectionCoverSlot | null {
  const image = save.image_url?.trim()
  const domain = getUrlDomain(save.url)
  if (image) return { kind: 'image', url: image, domain: domain || undefined }
  if (domain) return { kind: 'brand', domain }

  const title = (save.title ?? '').trim()
  const preview = notePreviewText(save.content || save.description)
  if (!title && !preview) return null
  return {
    kind: 'note',
    title: title || preview,
    preview: title ? preview : '',
  }
}

export function collectCollectionCoverSlots(
  saves: readonly CoverSave[],
): CollectionCoverSlot[] {
  const slots: CollectionCoverSlot[] = []
  for (const save of saves) {
    const slot = slotFromSave(save)
    if (!slot) continue
    slots.push(slot)
    if (slots.length >= MAX_COVERS) break
  }
  return slots
}

export function mergeCollectionCoverSlots(
  customCoverUrl: string | null | undefined,
  slots: readonly CollectionCoverSlot[],
): CollectionCoverSlot[] {
  const url = customCoverUrl?.trim()
  if (!url) return slots.slice(0, MAX_COVERS)
  const rest = slots.filter(slot => !(slot.kind === 'image' && slot.url === url))
  return [{ kind: 'image' as const, url }, ...rest].slice(0, MAX_COVERS)
}

export function collectionCoverFields(
  customCoverUrl: string | null | undefined,
  saves: readonly CoverSave[],
): { cover_slots: CollectionCoverSlot[] } {
  return {
    cover_slots: mergeCollectionCoverSlots(
      customCoverUrl,
      collectCollectionCoverSlots(saves),
    ),
  }
}

export function coverPoolNeedsMore(pool: readonly CoverSave[]): boolean {
  return collectCollectionCoverSlots(pool).length < MAX_COVERS
}
