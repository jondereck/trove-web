import type { SupabaseClient } from '@supabase/supabase-js'
import type { Save } from './types'
import { parseSaveRow } from './saves'

export function defaultLinkTitle(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return 'Untitled link'
  try {
    return new URL(trimmed).hostname.replace(/^www\./, '')
  } catch {
    return trimmed
  }
}

export async function insertQuickSaveNote(
  supabase: SupabaseClient,
  userId: string,
  input: { title: string; content: string },
): Promise<Save> {
  const title = input.title.trim() || 'Untitled note'
  const content = input.content.trim()
  const { data, error } = await supabase
    .from('saves')
    .insert({
      user_id: userId,
      title,
      type: 'note',
      content,
      tags: [],
      is_inbox: true,
    })
    .select()
    .single()

  if (error) throw error
  return parseSaveRow(data as Save)
}

export async function insertQuickSaveLink(
  supabase: SupabaseClient,
  userId: string,
  input: { url: string; title?: string },
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
      type: 'link',
      tags: [],
      is_inbox: true,
    })
    .select()
    .single()

  if (error) throw error
  return parseSaveRow(data as Save)
}
