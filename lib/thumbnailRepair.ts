import type { Save } from './types'
import { fetchOGMetadata } from './ogFetch'
import { buildThumbnailRepairPatch, type ThumbnailRepairPatch } from './thumbnailRepairCore'

export { buildThumbnailRepairPatch, type ThumbnailRepairPatch } from './thumbnailRepairCore'

const ATTEMPTS_KEY = 'trove-web.thumbRepair.attempts'
const ATTEMPT_TTL = 24 * 60 * 60 * 1000

function loadAttempts(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    if (!raw) return {}
    const stored = JSON.parse(raw) as Record<string, number>
    const now = Date.now()
    for (const id of Object.keys(stored)) {
      if (now - stored[id] > ATTEMPT_TTL) delete stored[id]
    }
    return stored
  } catch {
    return {}
  }
}

function recordAttempt(id: string): void {
  if (typeof window === 'undefined') return
  const attempts = loadAttempts()
  attempts[id] = Date.now()
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts))
}

export type ThumbnailRepairResult = {
  patch: ThumbnailRepairPatch
}

export async function repairThumbnail(
  save: Pick<Save, 'id' | 'type' | 'url' | 'title' | 'description' | 'image_url' | 'view_count' | 'reaction_count'>,
  opts: { force?: boolean } = {},
): Promise<ThumbnailRepairResult | null> {
  if (save.type !== 'link' || !save.url) return null
  if (!opts.force) {
    const attempts = loadAttempts()
    if (attempts[save.id]) return null
  }

  recordAttempt(save.id)
  const meta = await fetchOGMetadata(save.url)
  const patch = buildThumbnailRepairPatch(save, meta, opts)
  if (!patch) return null
  return { patch }
}
