'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Flame,
  MoreVertical,
  Sun,
} from 'lucide-react'
import AppShell from '@/components/AppShell'
import {
  addDays,
  completedOnDay,
  dateKey,
  formatTaskSubtitle,
  overdueTasks,
  progressSummary,
  tasksDueOnDay,
  type DailyTask,
} from '@/lib/dailyTasks'
import { overallStreak } from '@/lib/dailyTasksStats'
import { DAILY_STATUS_COPY, resolveDailyStatus } from '@/lib/dailyStatus'
import { formatReminderClock } from '@/lib/reminderDateTime'
import { getSessionMode } from '@/lib/sessionMode'
import { useDailyTasks } from '@/hooks/useDailyTasks'
import AddDailyTaskModal from './AddDailyTaskModal'
import RescheduleDateModal from './RescheduleDateModal'
import TodayAgendaModal from './TodayAgendaModal'
import TodayAgendaPanel from './TodayAgendaPanel'
import styles from './TodayPage.module.css'

function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TodayPage() {
  const mode = getSessionMode()
  const {
    state,
    ready,
    dayReminders,
    syncStatus,
    refreshCloud,
    setEnabled,
    add,
    complete,
    uncomplete,
    remove,
    update,
    reschedule,
    completeReminder,
    updateSettings,
  } = useDailyTasks()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<DailyTask | null>(null)
  const [doneOpen, setDoneOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuTaskId, setMenuTaskId] = useState<string | null>(null)
  const [agendaOpen, setAgendaOpen] = useState(false)
  const [rescheduleTask, setRescheduleTask] = useState<DailyTask | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuTaskId) return
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuTaskId(null)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [menuTaskId])

  const now = new Date()
  const streak = ready ? overallStreak(state, now) : 0
  const due = ready ? tasksDueOnDay(state, now) : []
  const late = ready ? overdueTasks(state, now) : []
  const doneToday = ready ? completedOnDay(state, now) : []
  const progress = ready ? progressSummary(state, now, dayReminders.length) : null
  const status = ready
    ? resolveDailyStatus({
        enabled: state.enabled,
        open: progress?.open ?? 0,
        doneToday: doneToday.length,
      })
    : null
  const allClear =
    ready &&
    state.enabled &&
    due.length === 0 &&
    late.length === 0 &&
    dayReminders.length === 0 &&
    doneToday.length > 0

  const tomorrowKey = dateKey(addDays(now, 1))

  return (
    <AppShell mode={mode}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.titles}>
            <h1>Today</h1>
            <div className={styles.dateRow}>
              <p className={styles.date}>{formatLongDate(now)}</p>
              {streak > 0 ? (
                <span className={styles.streak}>
                  <Flame size={14} strokeWidth={2} aria-hidden />
                  {streak} day streak
                </span>
              ) : null}
            </div>
          </div>
          <div className={styles.headerActions}>
            <Link href="/library" className={styles.back}>
              Back to Library
            </Link>
            <button
              type="button"
              className={styles.calBtn}
              aria-label="View agenda"
              onClick={() => setAgendaOpen(true)}
            >
              <Calendar size={18} strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className={styles.divider} />

        {!ready ? <p className={styles.empty}>Loading…</p> : null}

        {ready && !state.enabled ? (
          <section className={`${styles.card} ${styles.offCard}`}>
            <span className={styles.sun} aria-hidden>
              <Sun size={22} />
            </span>
            <p>
              {syncStatus === 'syncing'
                ? 'Syncing Daily Tasks from your phone…'
                : syncStatus === 'empty-cloud'
                  ? 'Cloud is empty. Open Today on Trove Mobile once (with Cloud on) so your tasks upload — then hit Refresh here.'
                  : 'Daily Tasks are off'}
            </p>
            <div className={styles.offActions}>
              {syncStatus === 'empty-cloud' || syncStatus === 'syncing' ? (
                <button
                  type="button"
                  className={styles.turnOnSecondary}
                  onClick={() => void refreshCloud()}
                  disabled={syncStatus === 'syncing'}
                >
                  {syncStatus === 'syncing' ? 'Syncing…' : 'Refresh sync'}
                </button>
              ) : null}
              <button type="button" className={styles.turnOn} onClick={() => void setEnabled(true)}>
                Turn on
              </button>
            </div>
          </section>
        ) : null}

        {ready && state.enabled ? (
          <div className={styles.desktopGrid}>
          <div>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.sun} aria-hidden>
                  <Sun size={20} strokeWidth={1.75} />
                </span>
                <div className={styles.cardTitles}>
                  <h2 className={styles.cardTitle}>Daily Tasks</h2>
                  <p className={styles.cardSub}>
                    {progress ? `${progress.done} done · ${progress.open} left` : null}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.overflow}
                  aria-label="Daily Tasks settings"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen(v => !v)}
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              {settingsOpen ? (
                <div className={styles.settings}>
                  <label>
                    <input
                      type="checkbox"
                      checked={state.enabled}
                      onChange={e => void updateSettings({ enabled: e.target.checked })}
                    />
                    Daily Tasks on
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={state.summaryEnabled}
                      onChange={e => void updateSettings({ summaryEnabled: e.target.checked })}
                    />
                    Daily summary (syncs to mobile)
                  </label>
                  {state.summaryEnabled ? (
                    <div className={styles.settingsTime}>
                      <span>Around</span>
                      <select
                        value={state.summaryHour}
                        aria-label="Summary hour"
                        onChange={e =>
                          void updateSettings({ summaryHour: Number(e.target.value) })
                        }
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                      <span>:</span>
                      <select
                        value={state.summaryMinute}
                        aria-label="Summary minute"
                        onChange={e =>
                          void updateSettings({ summaryMinute: Number(e.target.value) })
                        }
                      >
                        {[0, 15, 30, 45].map(m => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {progress && progress.total > 0 ? (
                <div className={styles.progressRow}>
                  <div className={styles.bar} aria-hidden>
                    <div className={styles.fill} style={{ width: `${progress.pct}%` }} />
                  </div>
                  <span className={styles.pct}>{progress.pct}%</span>
                </div>
              ) : null}

              {late.length > 0 ? (
                <>
                  <p className={styles.sectionLabel}>Unfinished</p>
                  {late.map(task => (
                    <div key={task.id} className={styles.overdue}>
                      <p className={styles.overdueTitle}>{task.title}</p>
                      <div className={styles.overdueActions}>
                        <button type="button" onClick={() => void reschedule(task.id, tomorrowKey)}>
                          Move to tomorrow
                        </button>
                        <button type="button" onClick={() => setRescheduleTask(task)}>
                          Choose date
                        </button>
                        <button type="button" onClick={() => void complete(task.id)}>
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              ) : null}

              {dayReminders.length > 0 ? (
                <>
                  <p className={styles.sectionLabel}>Reminders today</p>
                  <ul className={styles.list}>
                    {dayReminders.map(row => (
                      <li key={row.id} className={styles.row}>
                        <button
                          type="button"
                          className={styles.check}
                          aria-label={`Complete reminder ${row.displayTitle}`}
                          onClick={() => void completeReminder(row)}
                        >
                          <Circle size={16} strokeWidth={1.75} />
                        </button>
                        <div className={styles.rowBody}>
                          <p className={styles.rowTitle}>{row.displayTitle}</p>
                          <p className={styles.rowSub}>
                            {formatReminderClock(new Date(row.fireAt))}
                          </p>
                        </div>
                        <Bell size={14} strokeWidth={1.75} aria-hidden />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {due.length > 0 ? (
                <>
                  {late.length > 0 || dayReminders.length > 0 ? (
                    <p className={styles.sectionLabel}>Today</p>
                  ) : null}
                  <ul className={styles.list}>
                    {due.map(task => (
                      <li key={task.id} className={styles.row}>
                        <button
                          type="button"
                          className={styles.check}
                          aria-label={`Complete ${task.title}`}
                          onClick={() => void complete(task.id)}
                        >
                          <Circle size={16} strokeWidth={1.75} />
                        </button>
                        <div className={styles.rowBody}>
                          <p className={styles.rowTitle}>{task.title}</p>
                          <p className={styles.rowSub}>{formatTaskSubtitle(task)}</p>
                        </div>
                        <div className={styles.menuWrap} ref={menuTaskId === task.id ? menuRef : undefined}>
                          <button
                            type="button"
                            className={styles.rowMenu}
                            aria-label="Task menu"
                            aria-expanded={menuTaskId === task.id}
                            onClick={() =>
                              setMenuTaskId(id => (id === task.id ? null : task.id))
                            }
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuTaskId === task.id ? (
                            <div className={styles.menu} role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setEditing(task)
                                  setSheetOpen(true)
                                  setMenuTaskId(null)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setRescheduleTask(task)
                                  setMenuTaskId(null)
                                }}
                              >
                                Reschedule
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className={styles.menuDanger}
                                onClick={() => {
                                  void remove(task.id)
                                  setMenuTaskId(null)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {allClear ? (
                <div className={styles.celebration}>
                  <p className={styles.celebrationTitle}>All done for today</p>
                  <p className={styles.celebrationSub}>
                    Add tasks for tomorrow, or check the agenda.
                  </p>
                </div>
              ) : due.length === 0 && late.length === 0 && dayReminders.length === 0 ? (
                <p className={styles.empty}>No open tasks</p>
              ) : null}

              <button
                type="button"
                className={styles.addBtn}
                onClick={() => {
                  setEditing(null)
                  setSheetOpen(true)
                }}
              >
                + Add task
              </button>
            </section>
          </div>

          <aside className={styles.desktopSide}>
            {status ? (
              <div className={styles.banner}>
                <p className={styles.bannerTitle}>{DAILY_STATUS_COPY[status].title}</p>
                {DAILY_STATUS_COPY[status].sub ? (
                  <p className={styles.bannerSub}>{DAILY_STATUS_COPY[status].sub}</p>
                ) : null}
              </div>
            ) : null}

            {doneToday.length > 0 ? (
              <div>
                <button
                  type="button"
                  className={styles.doneToggle}
                  aria-expanded={doneOpen}
                  onClick={() => setDoneOpen(v => !v)}
                >
                  <span>DONE TODAY · {doneToday.length}</span>
                  {doneOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {doneOpen ? (
                  <ul className={styles.doneList}>
                    {doneToday.map(item => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={styles.doneRow}
                          onClick={() => {
                            if (item.source === 'reminder') return
                            void uncomplete(item.id)
                          }}
                          title={
                            item.source === 'reminder'
                              ? 'Reminder completions stay archived'
                              : 'Mark incomplete'
                          }
                        >
                          <Check size={14} aria-hidden />
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            <div className={styles.desktopAgenda}>
              <TodayAgendaPanel state={state} />
            </div>
          </aside>
          </div>
        ) : null}
      </div>

      <AddDailyTaskModal
        open={sheetOpen}
        editing={editing}
        onClose={() => {
          setSheetOpen(false)
          setEditing(null)
        }}
        onSave={input => add(input)}
        onUpdate={(id, input) => update(id, input)}
      />

      <RescheduleDateModal
        open={!!rescheduleTask}
        initialDate={rescheduleTask?.scheduledOn ?? tomorrowKey}
        title={rescheduleTask ? `Move “${rescheduleTask.title}”` : 'Choose date'}
        onClose={() => setRescheduleTask(null)}
        onConfirm={key => {
          if (rescheduleTask) void reschedule(rescheduleTask.id, key)
        }}
      />

      {ready ? (
        <TodayAgendaModal
          open={agendaOpen}
          state={state}
          onClose={() => setAgendaOpen(false)}
        />
      ) : null}
    </AppShell>
  )
}
