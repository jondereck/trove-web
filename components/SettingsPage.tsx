'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Archive, FileText, Info, LogOut, Settings2, Shield, User } from 'lucide-react'
import { applyLocalImport, downloadCurrentBackup } from '@/lib/backup/downloadBackup'
import AgentsMcpSection from '@/components/AgentsMcpSection'
import ConnectedAppsSection from '@/components/ConnectedAppsSection'
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
  const [backupBusy, setBackupBusy] = useState<'download' | 'import' | null>(null)
  const [backupMessage, setBackupMessage] = useState('')
  const [backupError, setBackupError] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

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

  const handleDownloadBackup = async () => {
    setBackupMessage('')
    setBackupError('')
    setBackupBusy('download')
    try {
      const result = await downloadCurrentBackup()
      setBackupMessage(
        `Downloaded ${result.filename} (${result.saves} save${result.saves === 1 ? '' : 's'} · ${result.collections} collection${result.collections === 1 ? '' : 's'}).`,
      )
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Could not download a backup.')
    } finally {
      setBackupBusy(null)
    }
  }

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBackupMessage('')
    setBackupError('')
    setBackupBusy('import')
    try {
      const result = await applyLocalImport(file)
      setBackupMessage(
        `Imported ${result.saves} save${result.saves === 1 ? '' : 's'} and ${result.collections} collection${result.collections === 1 ? '' : 's'} on this device.`,
      )
      router.push('/library')
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Could not read that file.')
    } finally {
      setBackupBusy(null)
      event.target.value = ''
    }
  }

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
              <p className={styles.cardDesc}>
                Trove Web uses your Cloud library. A free phone account does not sync here.
              </p>
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
              <Archive size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={`serif ${styles.cardTitle}`}>Backup</h2>
              <p className={styles.cardDesc}>
                Download a Trove zip of this library, or load a backup on this device
              </p>
            </div>
          </header>
          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Download backup</p>
              <p className={styles.rowHint}>
                Zip of saves and collections, including Inbox. Vault is not included. Stays on
                this computer.
              </p>
            </div>
            <button
              type="button"
              className={styles.outlineBtn}
              disabled={backupBusy !== null}
              onClick={() => void handleDownloadBackup()}
            >
              {backupBusy === 'download' ? 'Preparing…' : 'Download'}
            </button>
          </div>
          <div className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Import backup</p>
              <p className={styles.rowHint}>
                Trove JSON or zip, or Raindrop CSV. Opens locally — does not upload to Cloud.
              </p>
            </div>
            <button
              type="button"
              className={styles.neutralBtn}
              disabled={backupBusy !== null}
              onClick={() => importInputRef.current?.click()}
            >
              {backupBusy === 'import' ? 'Reading…' : 'Choose file'}
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.zip,.csv"
            className={styles.hiddenFile}
            onChange={handleImportBackup}
          />
          {backupError ? <p className={styles.tokenError}>{backupError}</p> : null}
          {backupMessage ? <p className={styles.tokenOnce}>{backupMessage}</p> : null}
        </section>

        <AgentsMcpSection />

        <ConnectedAppsSection />

        <section className={styles.card}>
          <header className={styles.cardHead}>
            <span className={styles.iconWrap} aria-hidden>
              <FileText size={18} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className={`serif ${styles.cardTitle}`}>Legal</h2>
              <p className={styles.cardDesc}>Privacy and terms for Trove Web and the phone app</p>
            </div>
          </header>
          <Link href="/privacy" className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Privacy policy</p>
              <p className={styles.rowHint}>What we store, cookies, and Cloud sync</p>
            </div>
            <span className={styles.statusMuted}>Open</span>
          </Link>
          <Link href="/terms" className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Terms of use</p>
              <p className={styles.rowHint}>How the app and website may be used</p>
            </div>
            <span className={styles.statusMuted}>Open</span>
          </Link>
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
          <Link href="/guide" className={styles.row}>
            <div className={styles.rowCopy}>
              <p className={styles.rowLabel}>Guide</p>
              <p className={styles.rowHint}>Short lessons, including how to connect an agent</p>
            </div>
            <span className={styles.statusMuted}>Open</span>
          </Link>
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
