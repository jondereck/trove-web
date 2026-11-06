'use client'

import { useEffect, useState } from 'react'

export function NeonGoogleFinish({
  authUrl,
  fromMobile,
}: {
  authUrl: string
  fromMobile: boolean
}) {
  const [message, setMessage] = useState('Signing in…')

  useEffect(() => {
    let cancelled = false
    async function finish() {
      try {
        const sessionResponse = await fetch(`${authUrl}/get-session`, { credentials: 'include' })
        const session = await sessionResponse.json() as { session?: { token?: string } }
        const neonToken = session.session?.token
        if (!neonToken) {
          if (!cancelled) setMessage('Google did not return a session. Use email, or try again.')
          return
        }
        const finishResponse = await fetch('/api/auth/google/finish', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: neonToken }),
        })
        const body = await finishResponse.json() as { token?: string; error?: string }
        if (!finishResponse.ok || !body.token) {
          if (!cancelled) setMessage(body.error ?? 'Could not finish Google sign-in.')
          return
        }
        if (fromMobile) {
          window.location.replace(`trove://auth?token=${encodeURIComponent(body.token)}`)
          return
        }
        window.location.replace('/')
      } catch {
        if (!cancelled) setMessage('Could not finish Google sign-in.')
      }
    }
    void finish()
    return () => {
      cancelled = true
    }
  }, [authUrl, fromMobile])

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center text-sm text-neutral-600">
      {message}
    </main>
  )
}
