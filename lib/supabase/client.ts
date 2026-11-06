import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'
import { createRemoteNeonClient } from '@/lib/neon/remote'

const TOKEN_KEY = 'trove.neon.session'

export function createClient() {
  if (process.env.NEXT_PUBLIC_DATA_BACKEND !== 'neon') {
    return createBrowserClient(supabaseUrl(), supabaseAnonKey())
  }
  return createRemoteNeonClient({
    apiUrl: '',
    getToken: async () => {
      if (typeof localStorage === 'undefined') return null
      const raw = localStorage.getItem(TOKEN_KEY)
      if (!raw) return null
      try {
        return (JSON.parse(raw) as { token?: string }).token ?? null
      } catch {
        return null
      }
    },
    setToken: async (token, user) => {
      if (typeof localStorage === 'undefined') return
      if (!token || !user) localStorage.removeItem(TOKEN_KEY)
      else localStorage.setItem(TOKEN_KEY, JSON.stringify({ token, user }))
    },
  }) as unknown as SupabaseClient
}
