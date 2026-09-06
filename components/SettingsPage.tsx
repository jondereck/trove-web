'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, LogOut, Settings2, Shield, User } from 'lucide-react'
import AppShell from '@/components/AppShell'
import TroveLoader from '@/components/TroveLoader'
import { createClient } from '@/lib/supabase/client'
import { signOutLocal } from '@/lib/auth/oauth'
import {
  clearDemoMode,
  clearImportSession,
  readSoundsEnabled,
  writeSoundsEnabled,
} from '@/lib/sessionMode'
import {
  ensureNotificationPermission,
  notificationPermission,
  notificationsSupported,
  rescheduleWebReminders,
} from '@/lib/webReminderNotifications'
import { hydrateSaveReminderStore } from '@/lib/saveRemindersCore'
import { loadReminderStore } from '@/lib/reminderStore'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [sounds, setSounds] = useState(true)
  const [notifyState, setNotifyState] = useState<'unsupported' | NotificationPermission>('default')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSounds(readSoundsEnabled())
    setNotifyState(notificationsSupported() ? notificationPermission() : 'unsupported')
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/')
        return
      }
      setEmail(user.email ?? null)
      setLoading(false)
    })
  }, [router])

  const signOut = async () => {
    clearDemoMode()
    await clearImportSession()
    await signOutLocal()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <AppShell mode="cloud">
        <TroveLoader label="Loading settings…" />
      </AppShell>
    )
  }

  return (
    <AppShell mode="cloud">
      <div className={styles.page}>
        <h1 className={`serif ${styles.title}`}>Settings</h1>
        <p className={styles.subtitle}>Customize your Trove Web experience.</p>

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <span className={styles.iconWrap} aria-hidden>
              <User size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={`serif ${styles.cardTitle}`}>Account</h2>
              <p className={styles.cardDesc}>Manage your account details</p>
            </div>
          </header>
          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Email</p>
              <p className={styles.rowHint}>{email ?? '—'}</p>
            </div>
            <button
              type="button"
              className={styles.outlineBtn}
              onClick={() =>
                window.alert('Change your email in Trove mobile or your Trove Cloud account.')
              }
            >
              Change
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <span className={styles.iconWrap} aria-hidden>
              <Settings2 size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={`serif ${styles.cardTitle}`}>Preferences</h2>
              <p className={styles.cardDesc}>Customize how Trove works for you</p>
            </div>
          </header>

          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Interaction sounds</p>
              <p className={styles.rowHint}>Subtle taps on navigation and sign-in</p>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={sounds}
                onChange={e => {
                  setSounds(e.target.checked)
                  writeSoundsEnabled(e.target.checked)
                }}
                aria-label="Interaction sounds"
              />
              <span className={styles.switchTrack} aria-hidden />
            </label>
          </div>

          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Browser reminders</p>
              <p className={styles.rowHint}>
                {notifyState === 'unsupported'
                  ? 'Not supported in this browser'
                  : notifyState === 'granted'
                    ? 'Notifications enabled on this device'
                    : notifyState === 'denied'
                      ? 'Blocked in browser settings'
                      : 'Get save reminders on this computer'}
              </p>
            </div>
            {notifyState === 'unsupported' ? null : notifyState === 'granted' ? (
              <span className={styles.statusMuted}>On</span>
            ) : (
              <button
                type="button"
                className={styles.neutralBtn}
                disabled={notifyState === 'denied'}
                onClick={() => {
                  void ensureNotificationPermission().then(granted => {
                    setNotifyState(notificationPermission())
                    if (granted) {
                      rescheduleWebReminders(hydrateSaveReminderStore(loadReminderStore()))
                    }
                  })
                }}
              >
                Enable
              </button>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <span className={styles.iconWrap} aria-hidden>
              <Info size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={`serif ${styles.cardTitle}`}>About</h2>
              <p className={styles.cardDesc}>App information and updates</p>
            </div>
          </header>
          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Version</p>
              <p className={styles.rowHint}>Trove Web (Beta)</p>
            </div>
            <span className={styles.statusMuted}>In development</span>
          </div>
        </section>

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <span className={styles.iconWrap} aria-hidden>
              <Shield size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={`serif ${styles.cardTitle}`}>Security</h2>
              <p className={styles.cardDesc}>Manage your session</p>
            </div>
          </header>
          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Sign out</p>
              <p className={styles.rowHint}>Sign out of your Trove account on this device</p>
            </div>
            <button type="button" className={styles.signOutBtn} onClick={signOut}>
              <LogOut size={15} strokeWidth={2} aria-hidden />
              Sign out
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
