import type { OgPreview } from './boundedPreview'
import { decodeOgText } from './decodeEntities'
import { rehostOgImageForUser, stripUnusableOgImage } from './rehostThumb'

export async function finalizeOgPreview(
  preview: OgPreview,
  userId: string | null,
): Promise<OgPreview> {
  const title = decodeOgText(preview.title) ?? preview.title
  const description = decodeOgText(preview.description)
  let image = stripUnusableOgImage(preview.image)
  if (image && userId) {
    const hosted = await rehostOgImageForUser(userId, preview.image ?? image)
    if (hosted) image = hosted
  }
  return {
    ...preview,
    title,
    description,
    image,
  }
}