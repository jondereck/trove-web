export function openSaveLink(url: string): void {
  const trimmed = url.trim()
  if (!trimmed) return
  window.open(trimmed, '_blank', 'noopener,noreferrer')
}

export async function shareSave(title: string, url?: string): Promise<boolean> {
  const text = title.trim() || 'Trove save'
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: text, url: url?.trim() || undefined })
      return true
    } catch {
      return false
    }
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(url?.trim() ? `${text}\n${url}` : text)
    return true
  }
  return false
}
