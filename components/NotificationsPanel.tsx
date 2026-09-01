'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Inbox,
  Loader2,
  X,
  XCircle,
} from 'lucide-react'
import { setLibraryFilterIntent } from '@/lib/libraryFilterIntent'
import { findSaveById } from '@/lib/libraryCore'
import {
  clearNotificationLog,
  markAllNotificationsRead,
  syncPresentedNotifications,
} from '@/lib/notificationLog'
import type { NotificationLogEntry } from '@/lib/notificationLogCore'
import { groupUpcomingReminders } from '@/lib/reminderBuckets'
import { promptCancelReminder } from '@/lib/reminderCancel'
import { createClient } from '@/lib/supabase/client'
import {
  clearSaveReminderHistory,
  listSaveReminders,
} from '@/lib/saveReminders'
import {
  formatHistorySubtitle,
  formatUpcomingReminderSubtitle,
  isCancelledReminder,
  reminderDisplayTitle,
  type StoredSaveReminder,
} from '@/lib/saveRemindersCore'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './NotificationsPanel.module.css'

type Tab = 'reminders' | 'inbox'

type Props = {
  open: boolean
  onClose: () => void
}

function formatDate(value: string): string {
  const date = new Date(value)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function formatEntryMeta(entry: NotificationLogEntry): string {
  const date = new Date(entry.date)
  const cadenceLabel = entry.cadence === 'daily'
    ? 'Daily'
    : entry.cadence === 'weekly'
      ? 'Weekly'
      : 'Update'
  const datePart = date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${cadenceLabel} · ${datePart}, ${timePart}`
}

export default function NotificationsPanel({ open, onClose }: Props) {
  const router = useRouter()
  const { saves, mode } = useLibrarySaves()
  const [tab, setTab] = useState<Tab>('reminders')
  const [entries, setEntries] = useState<NotificationLogEntry[]>([])
  const [upcoming, setUpcoming] = useState<StoredSaveReminder[]>([])
  const [history, setHistory] = useState<StoredSaveReminder[]>([])
  const [completedOpen, setCompletedOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const upcomingBuckets = useMemo(() => groupUpcomingReminders(upcoming), [upcoming])

  const saveTitle = useCallback(
    (saveId: string) => findSaveById(saves, saveId)?.title,
    [saves],
  )

  const load = useCallback(() => {
    let active = true
    setLoading(true)

    const run = async () => {
      const supabase = mode === 'cloud' ? createClient() : null
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (active) setUserId(user?.id ?? null)
      }

      const [nextEntries, reminders] = await Promise.all([
        syncPresentedNotifications(),
        listSaveReminders(supabase),
      ])

      if (!active) return
      setEntries(nextEntries)
      setUpcoming(reminders.upcoming)
      setHistory(reminders.history)
      setLoading(false)

      if (nextEntries.some(entry => !entry.read)) {
        setEntries(markAllNotificationsRead())
      }
    }

    void run()
    return () => {
      active = false
    }
  }, [mode])

  useEffect(() => {
    if (!open) return
    return load()
  }, [open, load])

  const navigate = (href: string) => {
    onClose()
    router.push(href)
  }

  const openEntry = (entry: NotificationLogEntry) => {
    if (entry.screen === 'library-unread') {
      setLibraryFilterIntent('unread')
      navigate('/library')
    }
  }

  const handleClearAll = () => {
    if (tab === 'inbox') {
      setEntries(clearNotificationLog())
      return
    }
    const reminders = clearSaveReminderHistory()
    setUpcoming(reminders.upcoming)
    setHistory(reminders.history)
  }

  const handleCancelReminder = (row: StoredSaveReminder) => {
    const supabase = mode === 'cloud' ? createClient() : null
    promptCancelReminder(row, () => {
      void listSaveReminders(supabase).then(reminders => {
        setUpcoming(reminders.upcoming)
        setHistory(reminders.history)
      })
    }, { supabase, userId, row })
  }

  const showClear = tab === 'inbox' && entries.length > 0
  const reminderEmpty = upcoming.length === 0 && history.length === 0

  if (!open) return null

  return (
    <div className={styles.panel} role="dialog" aria-label="Notifications">
      <header className={styles.header}>
        <h2 className={styles.title}>Notifications</h2>
        <div className={styles.headerActions}>
          {showClear ? (
            <button type="button" className={styles.clearBtn} onClick={handleClearAll}>
              Clear all
            </button>
          ) : null}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
      </header>

      <div className={styles.tabs} role="tablist">
        {([
          { id: 'reminders' as const, label: 'Reminders' },
          { id: 'inbox' as const, label: 'Inbox' },
        ]).map(option => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            className={`${styles.tab} ${tab === option.id ? styles.tabActive : ''}`}
            onClick={() => setTab(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={20} className={styles.spinner} aria-hidden />
            <span>Loading…</span>
          </div>
        ) : tab === 'reminders' ? (
          reminderEmpty ? (
            <div className={styles.empty}>
              <Bell size={22} />
              <p>No reminders yet</p>
              <span>Set one from any save.</span>
            </div>
          ) : (
            <>
              <p className={styles.sectionLabel}>Upcoming</p>
              {upcomingBuckets.length === 0 ? (
                <p className={styles.sectionEmpty}>Nothing upcoming</p>
              ) : (
                upcomingBuckets.map(bucket => (
                  <div key={bucket.id} className={styles.bucketBlock}>
                    <span className={styles.bucketChip}>{bucket.label}</span>
                    <ul className={styles.list}>
                      {bucket.items.map(row => {
                        const title = reminderDisplayTitle(row, saveTitle(row.saveId))
                        const subtitle = formatUpcomingReminderSubtitle(row)
                        return (
                          <li key={row.id}>
                            <div className={styles.rowWrap}>
                              <button
                                type="button"
                                className={styles.row}
                                onClick={() => navigate(`/library/${row.saveId}`)}
                              >
                                <span className={styles.rowIcon}>
                                  <Clock3 size={16} />
                                </span>
                                <span className={styles.rowText}>
                                  <span className={styles.rowTitle}>{title}</span>
                                  {subtitle ? <span className={styles.rowSub}>{subtitle}</span> : null}
                                </span>
                              </button>
                              <button
                                type="button"
                                className={styles.rowAction}
                                aria-label="Cancel reminder"
                                onClick={() => handleCancelReminder(row)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}

              {history.length > 0 ? (
                <>
                  <div className={styles.sectionHeader}>
                    <button
                      type="button"
                      className={styles.completedToggle}
                      aria-expanded={completedOpen}
                      onClick={() => setCompletedOpen(open => !open)}
                    >
                      <span className={styles.sectionLabelInline}>Completed</span>
                      <span className={styles.countBadge}>{history.length}</span>
                      {completedOpen
                        ? <ChevronUp size={14} aria-hidden />
                        : <ChevronDown size={14} aria-hidden />}
                    </button>
                    {completedOpen ? (
                      <button type="button" className={styles.clearBtn} onClick={handleClearAll}>
                        Clear
                      </button>
                    ) : null}
                  </div>
                  {completedOpen ? (
                    <ul className={styles.list}>
                      {history.map((row, index) => {
                        const title = reminderDisplayTitle(row, saveTitle(row.saveId))
                        const cancelled = isCancelledReminder(row)
                        return (
                          <li key={`${row.id}:${row.firedAt ?? row.fireAt}:${index}`}>
                            <button
                              type="button"
                              className={styles.row}
                              onClick={() => navigate(`/library/${row.saveId}`)}
                            >
                              <span className={styles.rowIcon}>
                                {cancelled ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                              </span>
                              <span className={styles.rowText}>
                                <span className={styles.rowTitle}>{title}</span>
                                <span className={styles.rowSub}>{formatHistorySubtitle(row)}</span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </>
          )
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <Inbox size={22} />
            <p>All caught up</p>
            <span>Inbox digests will show up here.</span>
          </div>
        ) : (
          <ul className={styles.list}>
            {entries.map(entry => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`${styles.row} ${!entry.read ? styles.rowUnread : ''}`}
                  onClick={() => openEntry(entry)}
                  disabled={!entry.screen}
                >
                  <span className={`${styles.rowIcon} ${!entry.read ? styles.rowIconUnread : ''}`}>
                    {entry.screen === 'library-unread' ? <Eye size={16} /> : <Inbox size={16} />}
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowMeta}>{formatEntryMeta(entry)}</span>
                    <span className={styles.rowTitleRow}>
                      <span className={`${styles.rowTitle} ${!entry.read ? styles.rowTitleUnread : ''}`}>
                        {entry.title}
                      </span>
                      <span className={styles.rowDate}>{formatDate(entry.date)}</span>
                    </span>
                    {entry.body ? <span className={styles.rowSub}>{entry.body}</span> : null}
                  </span>
                  {!entry.read ? <span className={styles.unreadDot} aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
