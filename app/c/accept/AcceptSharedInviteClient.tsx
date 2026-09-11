'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { postSharedCollectionAction } from '@/lib/sharedCollection'
import TroveMark from '@/components/TroveMark'
import styles from '@/components/SharedCollectionPage.module.css'

type Status = 'loading' | 'need_sign_in' | 'ok' | 'error'

export default function AcceptSharedInviteClient() {
  const params = useSearchParams()
  const invite = params.get('invite')?.trim() ?? ''
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!invite) {
      setStatus('error')
      setError('missing_invite')
      return
    }

    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const accessToken = data.session?.access_token
      if (!accessToken) {
        if (!cancelled) setStatus('need_sign_in')
        return
      }
      const result = await postSharedCollectionAction(accessToken, {
        action: 'accept_invite',
        invite_token: invite,
      })
      if (cancelled) return
      if (!result.ok) {
        setStatus('error')
        setError(result.error ?? 'failed')
        return
      }
      setStatus('ok')
    })()

    return () => {
      cancelled = true
    }
  }, [invite])

  const signInHref = `/?next=${encodeURIComponent(`/c/accept?invite=${encodeURIComponent(invite)}`)}`

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label="Trove home">
          <TroveMark size={28} />
          <span className={`serif ${styles.brandWord}`}>Trove</span>
        </Link>
      </header>
      <main className={styles.unavailable}>
        {status === 'loading' ? (
          <p className={styles.unavailableBody}>Accepting invite…</p>
        ) : null}
        {status === 'need_sign_in' ? (
          <>
            <h1 className={`serif ${styles.unavailableTitle}`}>Sign in to accept</h1>
            <p className={styles.unavailableBody}>
              Use the same email this invite was sent to, then we will add the collection under Shared with me.
            </p>
            <Link href={signInHref} className={styles.homeLink}>
              Sign in
            </Link>
          </>
        ) : null}
        {status === 'ok' ? (
          <>
            <h1 className={`serif ${styles.unavailableTitle}`}>You are in</h1>
            <p className={styles.unavailableBody}>
              Open Trove on your phone — this collection will appear under Shared with me.
            </p>
            <Link href="/library" className={styles.homeLink}>
              Open library
            </Link>
          </>
        ) : null}
        {status === 'error' ? (
          <>
            <h1 className={`serif ${styles.unavailableTitle}`}>Invite unavailable</h1>
            <p className={styles.unavailableBody}>
              {error === 'email_mismatch'
                ? 'Sign in with the invited email address and try again.'
                : 'This invite link is invalid or no longer available.'}
            </p>
            <Link href="/" className={styles.homeLink}>
              Go to Trove
            </Link>
          </>
        ) : null}
      </main>
    </div>
  )
}
