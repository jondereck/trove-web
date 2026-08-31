export function getSaveImageUrls(save: {
  image_url?: string | null
  image_urls?: string[] | null
}): string[] {
  if (Array.isArray(save.image_urls)) {
    return save.image_urls
      .map(u => (typeof u === 'string' ? u.trim() : ''))
      .filter(Boolean)
  }
  const cover = save.image_url?.trim()
  return cover ? [cover] : []
}

export function syncCoverFromGallery(imageUrls: string[]): {
  image_url: string | null
  image_urls: string[]
} {
  const cleaned = imageUrls.map(u => u.trim()).filter(Boolean)
  return {
    image_url: cleaned[0] ?? null,
    image_urls: cleaned,
  }
}
