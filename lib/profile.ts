import type { SupabaseClient } from '@supabase/supabase-js'

export type SidebarProfile = {
  firstName?: string
  lastName?: string
  avatarUrl?: string
  displayName: string
  initials: string
}

export function namesFromUserMetadata(meta: Record<string, unknown> | null | undefined): {
  first: string
  last: string
} {
  const data = meta ?? {}
  const full = String(data.full_name ?? data.name ?? '').trim()
  const first = String(data.given_name ?? full.split(' ')[0] ?? '').trim()
  const last = String(data.family_name ?? full.split(' ').slice(1).join(' ') ?? '').trim()
  return { first, last }
}

export function profileDisplayName(firstName?: string, lastName?: string): string {
  const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ')
  return full || 'Guest'
}

export function profileInitials(firstName?: string, lastName?: string): string {
  const initials = (
    (firstName?.trim()?.[0] ?? '') + (lastName?.trim()?.[0] ?? '')
  ).toUpperCase()
  return initials || 'G'
}

export async function fetchSidebarProfile(supabase: SupabaseClient): Promise<SidebarProfile> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { displayName: 'Guest', initials: 'G' }
  }

  const meta = user.user_metadata ?? {}
  const metaNames = namesFromUserMetadata(meta as Record<string, unknown>)

  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .maybeSingle()

  const firstName = data?.first_name?.trim() || metaNames.first || undefined
  const lastName = data?.last_name?.trim() || metaNames.last || undefined
  const metaAvatar =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    undefined
  const avatarUrl = data?.avatar_url?.trim() || metaAvatar

  return {
    firstName,
    lastName,
    avatarUrl,
    displayName: profileDisplayName(firstName, lastName),
    initials: profileInitials(firstName, lastName),
  }
}
