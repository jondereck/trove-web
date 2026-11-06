'use client'

import { useEffect, useState } from 'react'

export function NeonGoogleFinish({
  authUrl,
  fromMobile,
  nonce,
  errorCode,
}: {
  authUrl: string
  fromMobile: boolean
  nonce: string
  errorCode: string
}) {
  const [message, setMessage] = useState('Signing in…')

  useEffect(() => {
    let cancelled = false
    async function finish() {
      try {
        if (errorCode === 'account_not_linked') {
          const blocked = await fetch('/api/auth/google/finish', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'account_not_linked' }),
          })
          const blockedBody = await blocked.json() as { error?: string }
          if (!cancelled) {
            setMessage(blockedBody.error ?? 'Tap Google again. It will connect to your library.')
          }
          return
        }
        const sessionResponse = await fetch(`${authUrl}/get-session`, { credentials: 'include' })
        const session = await sessionResponse.json() as { session?: { token?: string } } | null
        const neonToken = session?.session?.token
        const finishResponse = await fetch('/api/auth/google/finish', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(neonToken ? { token: neonToken } : { nonce }),
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
  }, [authUrl, errorCode, fromMobile, nonce])

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center text-sm text-neutral-600">
      {message}
    </main>
  )
}
