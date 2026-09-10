import { supabaseAnonKey, supabaseUrl } from './env'

const TOKEN_RE = /^[A-Za-z0-9_-]{22,128}$/

export function isSharedCollectionToken(token: string): boolean {
  return TOKEN_RE.test(token)
}

export function sharedCollectionPath(token: string): string {
  return `/c/${token}`
}

export type SharedCollectionPayload = {
  collection: {
    id: string
    name: string
    description?: string | null
    icon: string
    color: string
    cover_image_url?: string | null
  }
  saves: Array<{
    id: string
    title: string
    description?: string | null
    type: string
    url?: string | null
    image_url?: string | null
    tags?: string[]
    created_at: string
  }>
  owner: { display_name: string; avatar_url?: string | null }
}

export async function fetchSharedCollection(
  token: string,
): Promise<SharedCollectionPayload | null> {
  if (!isSharedCollectionToken(token)) return null
  const base = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!base.trim() || !anon.trim()) return null

  const res = await fetch(
    `${base}/functions/v1/shared-collection?token=${encodeURIComponent(token)}`,
    {
      headers: { Authorization: `Bearer ${anon}`, apikey: anon },
      next: { revalidate: 30 },
    },
  )
  if (res.status === 404) return null
  if (!res.ok) return null
  return (await res.json()) as SharedCollectionPayload
}
