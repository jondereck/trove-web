import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'media'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_VIDEO_BYTES = 10 * 1024 * 1024
export const MAX_PDF_BYTES = 15 * 1024 * 1024

export function mediaExtForFile(file: File): string {
  const dot = file.name.lastIndexOf('.')
  if (dot > 0) {
    const fromName = file.name.slice(dot + 1).toLowerCase()
    if (/^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) return fromName
  }
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  if (file.type === 'image/gif') return 'gif'
  if (file.type === 'video/mp4') return 'mp4'
  if (file.type === 'video/webm') return 'webm'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type.startsWith('video/')) return 'mp4'
  return 'jpg'
}

export async function uploadMediaFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  kind: 'image' | 'video' | 'pdf' = 'image',
): Promise<string> {
  if (kind === 'image' && !file.type.startsWith('image/') && !/\.(jpe?g|png|gif|webp)$/i.test(file.name)) {
    throw new Error('That file is not an image.')
  }
  if (kind === 'video' && !file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
    throw new Error('That file is not a video.')
  }
  if (kind === 'pdf' && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    throw new Error('That file is not a PDF.')
  }

  const max =
    kind === 'video' ? MAX_VIDEO_BYTES : kind === 'pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
  if (file.size > max) {
    const actual = (file.size / (1024 * 1024)).toFixed(1)
    const label = kind === 'video' ? 'Videos' : kind === 'pdf' ? 'PDF files' : 'Photos'
    const limit = Math.round(max / (1024 * 1024))
    throw new Error(`${label} up to ${limit} MB can be saved (this one is ${actual} MB).`)
  }

  const ext = mediaExtForFile(file)
  const path = `${userId}/${Date.now()}.${ext}`
  const contentType =
    file.type ||
    (kind === 'pdf' ? 'application/pdf' : kind === 'video' ? 'video/mp4' : 'image/jpeg')
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false })
  if (error) throw new Error(error.message || 'Could not upload file.')

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
