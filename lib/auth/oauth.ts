import { createClient } from '@/lib/supabase/client'
import { siteUrl } from '@/lib/env'

export type OAuthProvider = 'google' | 'apple'

/** Keep other devices signed in — JS default is `global` (all sessions). */
export const SIGN_OUT_SCOPE = 'local' as const

export function oauthCallbackUrl(origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : siteUrl())
  return `${base.replace(/\/$/, '')}/auth/callback`
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthCallbackUrl(),
    },
  })
  return { error: error?.message ?? null }
}

export async function signOutLocal(): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut({ scope: SIGN_OUT_SCOPE })
  return { error: error?.message ?? null }
}
