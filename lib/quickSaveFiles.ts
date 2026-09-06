export const MAX_QUICK_SAVE_TEXT_BYTES = 512 * 1024

/** Document picker filter — Trove save types only (note text, PDF, image, video). */
export const QUICK_SAVE_DOCUMENT_ACCEPT =
  '.md,.markdown,.txt,.text,.pdf,image/*,video/*,text/plain,text/markdown,application/pdf'

const NOTE_EXTENSIONS = ['.md', '.markdown', '.txt', '.text']

export type QuickSaveFileKind = 'note' | 'image' | 'video' | 'pdf'

export function classifyQuickSaveFile(
  name: string,
  mimeType?: string | null,
): QuickSaveFileKind | null {
  const lower = name.toLowerCase()
  const mime = (mimeType ?? '').toLowerCase()

  if (mime === 'text/csv' || lower.endsWith('.csv')) return null
  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'

  if (mime.startsWith('text/') || NOTE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'note'

  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(lower)) return 'image'
  if (/\.(mp4|mov|webm|m4v|mkv|3gp)$/i.test(lower)) return 'video'
  if (NOTE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'note'

  return null
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '')
  return base.trim() || 'Note'
}

export function quickSaveFileUnsupportedMessage(): string {
  return 'That file type is not supported. Try .md, .txt, .pdf, photos, or videos.'
}
