import { supabaseAnonKey, supabaseUrl } from './env'

const TOKEN_RE = /^[A-Za-z0-9_-]{22,128}$/

export function isSharedCollectionToken(token: string): boolean {
  return TOKEN_RE.test(token)
}

export function sharedCollectionPath(token: string): string {
  return `/c/${token}`
}

export function sharedCollectionAcceptPath(inviteToken: string): string {
  return `/c/accept?invite=${encodeURIComponent(inviteToken)}`
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
  if (!res.ok) return null
  try {
    return (await res.json()) as SharedCollectionPayload
  } catch {
    return null
  }
}

export async function postSharedCollectionAction(
  accessToken: string,
  body:
    | { action: 'attach_viewer'; token: string }
    | { action: 'accept_invite'; invite_token: string },
): Promise<{ ok: boolean; status: number; error?: string }> {
  const base = supabaseUrl()
  const anon = supabaseAnonKey()
  if (!base.trim() || !anon.trim()) {
    return { ok: false, status: 0, error: 'not_configured' }
  }
  const res = await fetch(`${base}/functions/v1/shared-collection`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anon,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let error = 'request_failed'
    try {
      const json = (await res.json()) as { error?: string }
      if (json.error) error = json.error
    } catch {
      // ignore
    }
    return { ok: false, status: res.status, error }
  }
  return { ok: true, status: res.status }
}
