import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isNeonDataBackend } from '@/lib/dataBackend'
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/env'
import { createNeonClient } from '@/lib/neon/client'
import { isNeonConfigured } from '@/lib/neon/env'

export async function createClient() {
  if (isNeonDataBackend()) {
    if (!isNeonConfigured()) {
      throw new Error(
        'Trove Web data backend is Neon (the default). DATABASE_URL is missing. Set DATABASE_URL, or set NEXT_PUBLIC_DATA_BACKEND=supabase to use the legacy project on purpose.',
      )
    }
    return await createNeonClient() as unknown as SupabaseClient
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_DATA_BACKEND=supabase but NEXT_PUBLIC_SUPABASE_URL / ANON_KEY are missing.',
    )
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll can fail in Server Components; middleware refreshes sessions.
          }
        },
      },
    },
  )
}
