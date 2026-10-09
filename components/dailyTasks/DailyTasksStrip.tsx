'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, Circle, Flame, Sun } from 'lucide-react'
import {
  formatTaskSubtitle,
  overdueTasks,
  progressSummary,
  tasksDueOnDay,
} from '@/lib/dailyTasks'
import { overallStreak } from '@/lib/dailyTasksStats'
import { useDailyTasks } from '@/hooks/useDailyTasks'
import { formatReminderClock } from '@/lib/reminderDateTime'
import AddDailyTaskModal from './AddDailyTaskModal'
import styles from './DailyTasksStrip.module.css'

const STRIP_LIMIT = 5

type Props = {
  hidden?: boolean
}

export default function DailyTasksStrip({ hidden }: Props) {
  const {
    state,
    ready,
    dayReminders,
    syncStatus,
    refreshCloud,
    setEnabled,
    complete,
    completeReminder,
    add,
  } = useDailyTasks()
  const [addOpen, setAddOpen] = useState(false)

  if (hidden || !ready) return null

  const now = new Date()
  const streak = overallStreak(state, now)
  const due = tasksDueOnDay(state, now)
  const late = overdueTasks(state, now)
  const openTasks = [...late, ...due]
  const progress = progressSummary(state, now, dayReminders.length)
  const waitingForPhone = syncStatus === 'empty-cloud' || syncStatus === 'syncing'

  if (!state.enabled) {
    return (
      <section className={styles.strip} aria-label="Daily Tasks">
        <div className={styles.off}>
          <div className={`${styles.header} ${styles.headerFlush}`}>
            <span className={styles.sun} aria-hidden>
              <Sun size={18} strokeWidth={1.75} />
            </span>
            <div className={styles.titles}>
              <h2 className={styles.title}>Daily Tasks</h2>
              <p className={styles.sub}>
                {waitingForPhone
                  ? syncStatus === 'syncing'
                    ? 'Syncing from your phone…'
                    : 'No cloud tasks yet — open Today on your phone once to upload them.'
                  : 'Daily Tasks are off'}
              </p>
            </div>
          </div>
          <div className={styles.offActions}>
            {waitingForPhone ? (
              <button
                type="button"
                className={styles.link}
                onClick={() => void refreshCloud()}
                disabled={syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? 'Syncing…' : 'Refresh sync'}
              </button>
            ) : null}
            <button type="button" className={styles.link} onClick={() => void setEnabled(true)}>
              Turn on
            </button>
          </div>
        </div>
      </section>
    )
  }

  type StripItem =
    | { kind: 'task'; id: string; title: string; sub: string }
    | { kind: 'reminder'; id: string; title: string; sub: string; row: (typeof dayReminders)[0] }

  // Reminders always lead the strip (match mobile Today).
  const items: StripItem[] = [
    ...dayReminders.map(row => ({
      kind: 'reminder' as const,
      id: `rem:${row.id}`,
      title: row.displayTitle,
      sub: formatReminderClock(new Date(row.fireAt)),
      row,
    })),
    ...openTasks.map(task => ({
      kind: 'task' as const,
      id: task.id,
      title: task.title,
      sub: formatTaskSubtitle(task),
    })),
  ].slice(0, STRIP_LIMIT)

  const leftover = openTasks.length + dayReminders.length - items.length

  return (
    <>
      <section className={styles.strip} aria-label="Daily Tasks">
        <div className={styles.header}>
          <span className={styles.sun} aria-hidden>
            <Sun size={18} strokeWidth={1.75} />
          </span>
          <div className={styles.titles}>
            <h2 className={styles.title}>Daily Tasks</h2>
            <p className={styles.sub}>
              {progress.done} done · {progress.open} left
            </p>
          </div>
          {streak > 0 ? (
            <span className={styles.streak}>
              <Flame size={14} strokeWidth={2} aria-hidden />
              {streak} day streak
            </span>
          ) : null}
        </div>

        {progress.total > 0 ? (
          <div className={styles.progressRow}>
            <div className={styles.bar} aria-hidden>
              <div className={styles.fill} style={{ width: `${progress.pct}%` }} />
            </div>
            <span className={styles.pct}>{progress.pct}%</span>
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className={styles.empty}>No open tasks — add one to start your day.</p>
        ) : (
          <ul className={styles.list}>
            {items.map(item => (
              <li key={item.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.checkBtn}
                  aria-label={
                    item.kind === 'task'
                      ? `Complete ${item.title}`
                      : `Complete reminder ${item.title}`
                  }
                  onClick={() => {
                    if (item.kind === 'task') void complete(item.id)
                    else void completeReminder(item.row)
                  }}
                >
                  <span className={styles.check} aria-hidden>
                    <Circle size={14} strokeWidth={1.75} />
                  </span>
                </button>
                {item.kind === 'reminder' ? (
                  <Link
                    href={`/library/${item.row.saveId}`}
                    className={styles.rowMain}
                    aria-label={`Open save ${item.title}`}
                  >
                    <span className={styles.rowText}>
                      <p className={styles.rowTitle}>{item.title}</p>
                      <p className={styles.rowSub}>{item.sub}</p>
                    </span>
                    <Bell className={styles.bell} size={14} strokeWidth={1.75} aria-hidden />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.rowMain}
                    onClick={() => void complete(item.id)}
                  >
                    <span className={styles.rowText}>
                      <p className={styles.rowTitle}>{item.title}</p>
                      <p className={styles.rowSub}>{item.sub}</p>
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {leftover > 0 ? (
          <p className={styles.more}>
            +{leftover} more on{' '}
            <Link href="/today" className={styles.inlineLink}>
              Today
            </Link>
          </p>
        ) : null}

        <div className={styles.footer}>
          <button type="button" className={styles.link} onClick={() => setAddOpen(true)}>
            + Add task
          </button>
          <Link href="/today" className={styles.link}>
            Open Today →
          </Link>
        </div>
      </section>

      <AddDailyTaskModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={input => add(input)}
      />
    </>
  )
}
