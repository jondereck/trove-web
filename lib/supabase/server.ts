import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { supabaseAnonKey, supabaseUrl } from '@/lib/env'
import { createNeonClient } from '@/lib/neon/client'
import { isNeonConfigured } from '@/lib/neon/env'

export async function createClient() {
  if (isNeonConfigured() && process.env.NEXT_PUBLIC_DATA_BACKEND === 'neon') {
    return await createNeonClient() as unknown as SupabaseClient
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
