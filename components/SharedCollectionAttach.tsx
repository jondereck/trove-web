'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { postSharedCollectionAction } from '@/lib/sharedCollection'

/** When signed in on a public share link, attach as accepted Viewer (idempotent). */
export default function SharedCollectionAttach({ token }: { token: string }) {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    void (async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (!accessToken) return
      await postSharedCollectionAction(accessToken, {
        action: 'attach_viewer',
        token,
      })
    })()
  }, [token])

  return null
}
