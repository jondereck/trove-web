import type { SupabaseClient } from '@supabase/supabase-js'
import type { Save, SaveType } from './types'
import { parseSaveRow } from './saves'

export type QuickSaveMeta = {
  tags?: string[]
  collectionId?: string | null
  description?: string
  imageUrl?: string | null
  imageUrls?: string[]
}

export function defaultLinkTitle(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return 'Untitled link'
  try {
    return new URL(trimmed).hostname.replace(/^www\./, '')
  } catch {
    return trimmed
  }
}

/** Filed into a collection → not inbox; otherwise Unsorted/inbox. */
export function quickSaveInboxFlag(collectionId?: string | null): boolean {
  return !collectionId
}

function filingFields(meta: QuickSaveMeta) {
  const tags = meta.tags ?? []
  const collectionId = meta.collectionId ?? null
  return {
    tags,
    collection_id: collectionId,
    is_inbox: quickSaveInboxFlag(collectionId),
  }
}

export async function insertQuickSaveNote(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; content: string } & QuickSaveMeta,
): Promise<Save> {
  const title = input.title.trim() || 'Untitled note'
  const content = input.content.trim()
  const { data, error } = await supabase
    .from('saves')
    .insert({
      user_id: userId,
      title,
      type: 'note' satisfies SaveType,
      content,
      description: input.description?.trim() || undefined,
      image_url: input.imageUrl ?? undefined,
      image_urls: input.imageUrls,
      ...filingFields(input),
    })
    .select()
    .single()

  if (error) throw error
  return parseSaveRow(data as Save)
}

export async function insertQuickSaveLink(
  supabase: SupabaseClient,
  userId: string,
  input: { url: string; title?: string } & QuickSaveMeta,
): Promise<Save> {
  const url = input.url.trim()
  if (!url) throw new Error('URL is required.')
  const title = input.title?.trim() || defaultLinkTitle(url)

  const { data, error } = await supabase
    .from('saves')
    .insert({
      user_id: userId,
      title,
      url,
      type: 'link' satisfies SaveType,
      description: input.description?.trim() || undefined,
      image_url: input.imageUrl ?? undefined,
      image_urls: input.imageUrls,
      ...filingFields(input),
    })
    .select()
    .single()

  if (error) throw error
  return parseSaveRow(data as Save)
}

export async function insertQuickSaveImage(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; imageUrl: string } & QuickSaveMeta,
): Promise<Save> {
  const title = input.title.trim() || 'Photo'
  const imageUrl = input.imageUrl.trim()
  if (!imageUrl) throw new Error('Image is required.')
  const urls = input.imageUrls?.length ? input.imageUrls : [imageUrl]

  const { data, error } = await supabase
    .from('saves')
    .insert({
      user_id: userId,
      title,
      type: 'image' satisfies SaveType,
      description: input.description?.trim() || undefined,
      image_url: imageUrl,
      image_urls: urls,
      ...filingFields(input),
    })
    .select()
    .single()

  if (error) throw error
  return parseSaveRow(data as Save)
}

export async function insertQuickSaveVideo(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; videoUrl: string } & QuickSaveMeta,
): Promise<Save> {
  const title = input.title.trim() || 'Video'
  const videoUrl = input.videoUrl.trim()
  if (!videoUrl) throw new Error('Video is required.')

  const { data, error } = await supabase
    .from('saves')
    .insert({
      user_id: userId,
      title,
      url: videoUrl,
      type: 'video' satisfies SaveType,
      description: input.description?.trim() || undefined,
      image_url: input.imageUrl ?? undefined,
      ...filingFields(input),
    })
    .select()
    .single()

  if (error) throw error
  return parseSaveRow(data as Save)
}
