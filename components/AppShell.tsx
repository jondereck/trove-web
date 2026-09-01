'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
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
import QuickSaveFab from '@/components/QuickSaveFab'
import ReminderSync from '@/components/ReminderSync'
import TroveMark from '@/components/TroveMark'
import { BRAND } from '@/lib/branding'
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
  { label: 'Statistics', href: '/statistics', icon: <BarChart3 size={18} strokeWidth={1.75} /> },
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!profileMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/library') {
      return pathname === '/library' || pathname.startsWith('/library/') || pathname.startsWith('/tracker/')
    }
    if (href === '/collections') {
      return pathname === '/collections' || pathname.startsWith('/collections/')
    }
    return pathname === href || pathname.startsWith(`${href}/`)
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
      <ReminderSync mode={mode} />
      <div className={styles.desktopOnly}>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <Link href="/library" className={styles.brand}>
              <TroveMark size={32} className={styles.brandIcon} />
              <span className={`serif ${styles.wordmark}`}>{BRAND.name}</span>
              <span className={styles.beta}>{BRAND.beta}</span>
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
              <div className={styles.profileWrap} ref={profileMenuRef}>
                <button
                  type="button"
                  className={`${styles.profileBtn} ${profileMenuOpen ? styles.profileBtnOpen : ''}`}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileMenuOpen(open => !open)}
                >
                  <UserAvatar
                    imageUrl={profile.avatarUrl}
                    initials={profile.initials}
                  />
                  <span className={styles.profileName}>{profile.displayName}</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.profileChevron} ${profileMenuOpen ? styles.profileChevronOpen : ''}`}
                  />
                </button>

                {profileMenuOpen ? (
                  <div className={styles.profileMenu} role="menu">
                    {mode === 'cloud' ? (
                      <Link
                        href="/settings"
                        className={styles.profileMenuItem}
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        Settings
                      </Link>
                    ) : null}
                    {mode === 'import' ? (
                      <button
                        type="button"
                        className={styles.profileMenuItem}
                        role="menuitem"
                        onClick={async () => {
                          clearDemoMode()
                          await clearImportSession()
                          setProfileMenuOpen(false)
                          router.push('/')
                        }}
                      >
                        Clear import
                      </button>
                    ) : null}
                    {mode === 'demo' ? (
                      <Link
                        href="/"
                        className={styles.profileMenuItem}
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        Sign in
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      className={`${styles.profileMenuItem} ${styles.profileMenuDanger}`}
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        void signOut()
                      }}
                    >
                      {mode === 'cloud' ? 'Sign out' : 'Back to home'}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <div className={styles.mainWrap}>
            {children}
            <QuickSaveFab mode={mode} />
          </div>
        </div>
      </div>
    </>
  )
}
