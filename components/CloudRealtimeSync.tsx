'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { startCloudRealtime, stopCloudRealtime } from '@/lib/cloudRealtime'
import type { SessionMode } from '@/lib/sessionMode'

/** Keep one Realtime channel alive while signed into Trove Cloud. */
export default function CloudRealtimeSync({ mode }: { mode: SessionMode }) {
  useEffect(() => {
    if (mode !== 'cloud') return

    const supabase = createClient()
    let cancelled = false

    void supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id
      if (cancelled || !userId) return
      startCloudRealtime(supabase, userId)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id) startCloudRealtime(supabase, session.user.id)
      else stopCloudRealtime(supabase)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
      stopCloudRealtime(supabase)
    }
  }, [mode])

  return null
}
