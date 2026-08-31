'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ChevronDown,
  FolderOpen,
  Inbox,
  LayoutGrid,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  clearDemoMode,
  clearImportSession,
  type SessionMode,
} from '@/lib/sessionMode'
import { fetchSidebarProfile, type SidebarProfile } from '@/lib/profile'
import MobileDesktopGate from '@/components/MobileDesktopGate'
import TroveMark from '@/components/TroveMark'
import UserAvatar from '@/components/UserAvatar'
import styles from './AppShell.module.css'

type NavItem = {
  label: string
  href?: string
  icon: React.ReactNode
  soon?: boolean
}

const NAV: NavItem[] = [
  { label: 'Library', href: '/library', icon: <LayoutGrid size={18} strokeWidth={1.75} /> },
  { label: 'Collections', href: '/collections', icon: <FolderOpen size={18} strokeWidth={1.75} /> },
  { label: 'Search', href: '/search', icon: <Search size={18} strokeWidth={1.75} /> },
  { label: 'Unsorted', icon: <Inbox size={18} strokeWidth={1.75} />, soon: true },
]

type Props = {
  mode: SessionMode
  importFileName?: string
  children: React.ReactNode
}

const GUEST_PROFILE: SidebarProfile = { displayName: 'Guest', initials: 'G' }

export default function AppShell({ mode, importFileName, children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<SidebarProfile>(GUEST_PROFILE)

  useEffect(() => {
    if (mode !== 'cloud') {
      setProfile(GUEST_PROFILE)
      return
    }

    let cancelled = false
    const supabase = createClient()
    fetchSidebarProfile(supabase).then(next => {
      if (!cancelled) setProfile(next)
    })

    return () => {
      cancelled = true
    }
  }, [mode])

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

  return (
    <>
      <div className={styles.desktopOnly}>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <Link href="/library" className={styles.brand}>
              <TroveMark size={32} className={styles.brandIcon} />
              <span className={`serif ${styles.wordmark}`}>Trove</span>
            </Link>

            <nav className={styles.nav}>
              {NAV.map(item => (
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={isActive(item.href) ? styles.navActive : styles.navLink}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                ) : (
                  <span key={item.label} className={styles.navDisabled}>
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </span>
                )
              ))}
            </nav>

            <div className={styles.sidebarFoot}>
              {mode === 'import' && importFileName ? (
                <div className={styles.importChip}>
                  <span>{importFileName}</span>
                  <button type="button" onClick={async () => {
                    clearDemoMode()
                    await clearImportSession()
                    router.push('/')
                  }}>Clear</button>
                </div>
              ) : null}
              <button type="button" className={styles.profileBtn} onClick={signOut}>
                <UserAvatar
                  imageUrl={profile.avatarUrl}
                  initials={profile.initials}
                />
                <span className={styles.profileName}>{profile.displayName}</span>
                <ChevronDown size={16} className={styles.profileChevron} />
              </button>
            </div>
          </aside>

          <div className={styles.mainWrap}>
            {children}
          </div>
        </div>
      </div>
      <MobileDesktopGate />
    </>
  )
}
