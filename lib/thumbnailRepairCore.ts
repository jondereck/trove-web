import type { Save } from './types'
import { isGenericSocialTitle } from './ogParse'

export type ThumbnailRepairPatch = {
  image_url?: string
  title?: string
  description?: string
  view_count?: number
  reaction_count?: number
}

/**
 * Pure patch rules for auto-repair + forced Refresh preview.
 * - Take a new image when meta has one (force replaces stale CDN URLs).
 * - Upgrade title only when the current title is generic (never clobber edits).
 * - Fill description when empty; on force, also refresh it when upgrading a generic title.
 */
export function buildThumbnailRepairPatch(
  save: Pick<Save, 'url' | 'title' | 'description' | 'image_url' | 'view_count' | 'reaction_count'>,
  meta: { title?: string; description?: string; image?: string; viewCount?: number; reactionCount?: number },
  opts: { force?: boolean } = {},
): ThumbnailRepairPatch | null {
  if (!save.url) return null
  const force = !!opts.force
  const patch: ThumbnailRepairPatch = {}

  if (meta.image && (force || !save.image_url || meta.image !== save.image_url)) {
    patch.image_url = meta.image
  }

  const metaTitleGood = !!(meta.title && !isGenericSocialTitle(meta.title, save.url))
  const saveTitleGeneric = isGenericSocialTitle(save.title, save.url)
  if (metaTitleGood && saveTitleGeneric) {
    patch.title = meta.title
  }

  if (meta.description) {
    if (!save.description) {
      patch.description = meta.description
    } else if (force && saveTitleGeneric) {
      patch.description = meta.description
    }
  }

  if (meta.viewCount && (force || !save.view_count)) {
    patch.view_count = meta.viewCount
  }
  if (meta.reactionCount && (force || !save.reaction_count)) {
    patch.reaction_count = meta.reactionCount
  }

  if (!Object.keys(patch).length) return null
  return patch
}
