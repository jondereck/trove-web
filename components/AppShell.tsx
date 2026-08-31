'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  clearDemoMode,
  clearImportSession,
  readSoundsEnabled,
  writeSoundsEnabled,
  type SessionMode,
} from '@/lib/sessionMode'
import FabStub from './FabStub'
import styles from './AppShell.module.css'

type NavItem = {
  label: string
  href?: string
  soon?: boolean
}

const NAV: NavItem[] = [
  { label: 'Library', href: '/library' },
  { label: 'Collections', href: '/collections' },
  { label: 'Search', href: '/search' },
  { label: 'Inbox', soon: true },
  { label: 'Statistics', soon: true },
  { label: 'Settings', href: '/settings' },
]

type Props = {
  mode: SessionMode
  importFileName?: string
  children: React.ReactNode
}

export default function AppShell({ mode, importFileName, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [sounds, setSounds] = useState(readSoundsEnabled)

  const isActive = (href: string) => {
    if (href === '/library') return pathname === '/library' || pathname.startsWith('/library/')
    if (href === '/collections') {
      return pathname === '/collections' || pathname.startsWith('/collections/')
    }
    return pathname === href
  }

  const signOut = async () => {
    clearDemoMode()
    await clearImportSession()
    if (mode === 'cloud') {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push('/')
    router.refresh()
  }

  const clearLocalSession = async () => {
    clearDemoMode()
    await clearImportSession()
    router.push('/')
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.logoMark}>T</div>
          <div>
            <div className={styles.titleRow}>
              <span className={`serif ${styles.wordmark}`}>Trove Web</span>
              <span className={styles.beta}>BETA</span>
            </div>
            <span className={styles.subBrand}>Save what matters</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV.map(item => (
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className={isActive(item.href) ? styles.navActive : styles.navLink}
              >
                {item.label}
              </Link>
            ) : (
              <span key={item.label} className={styles.navDisabled}>
                {item.label} <em>Soon</em>
              </span>
            )
          ))}
        </nav>

        <div className={styles.sidebarFoot}>
          <p className={styles.quickHint}>Quick entry · Ctrl+K</p>
          <label className={styles.toggleRow}>
            <span>Interaction sounds</span>
            <input
              type="checkbox"
              checked={sounds}
              onChange={e => {
                setSounds(e.target.checked)
                writeSoundsEnabled(e.target.checked)
              }}
            />
          </label>
          {mode === 'import' && importFileName ? (
            <div className={styles.importChip}>
              <span>{importFileName}</span>
              <button type="button" onClick={clearLocalSession}>Clear</button>
            </div>
          ) : null}
          <button type="button" className={styles.signOut} onClick={signOut}>
            {mode === 'cloud' ? 'Sign out' : 'Back to sign in'}
          </button>
        </div>
      </aside>

      <div className={styles.mainWrap}>
        {children}
      </div>

      <FabStub />
    </div>
  )
}
