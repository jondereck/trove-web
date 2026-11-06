'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './CookieNotice.module.css'

const STORAGE_KEY = 'trove.cookie-notice'

export default function CookieNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(window.localStorage.getItem(STORAGE_KEY) !== 'ok')
    } catch {
      setOpen(true)
    }
  }, [])

  if (!open) return null

  return (
    <div className={styles.bar} role="dialog" aria-label="Cookie notice">
      <p className={styles.copy}>
        Trove uses a sign-in cookie to keep you logged in. No ads.{' '}
        <Link href="/privacy">Privacy</Link>
      </p>
      <button
        type="button"
        className={styles.ok}
        onClick={() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, 'ok')
          } catch {
            /* ignore */
          }
          setOpen(false)
        }}
      >
        OK
      </button>
    </div>
  )
}
