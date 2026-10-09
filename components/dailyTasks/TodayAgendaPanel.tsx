'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react'
import {
  completedOnDay,
  dateKey,
  formatTaskSubtitle,
  parseDateKey,
  startOfDay,
  tasksScheduledOn,
  type DailyTasksState,
} from '@/lib/dailyTasks'
import { dayCompletion } from '@/lib/dailyTasksStats'
import { remindersOnCalendarDay } from '@/lib/dailyTasksReminders'
import { formatReminderClock } from '@/lib/reminderDateTime'
import {
  hydrateSaveReminderStore,
  reminderDisplayTitle,
  type StoredSaveReminder,
} from '@/lib/saveRemindersCore'
import { loadReminderStore } from '@/lib/reminderStore'
import styles from './TodayAgendaPanel.module.css'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

type Props = {
  state: DailyTasksState
  focusDateKey?: string
  /** Compact card for the Today desktop sidebar */
  variant?: 'panel' | 'sheet'
}

function monthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function fullDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function TodayAgendaPanel({
  state,
  focusDateKey,
  variant = 'panel',
}: Props) {
  const [month, setMonth] = useState(() => startOfDay(new Date()))
  const [selected, setSelected] = useState(() => startOfDay(new Date()))
  const [upcoming, setUpcoming] = useState<StoredSaveReminder[]>([])

  // Only re-focus when the parent asks (open / deep-link). Do NOT tie this to
  // state.updatedAt — cloud sync / task writes were snapping the calendar back
  // to today and hiding custom-dated tasks.
  useEffect(() => {
    const focus = focusDateKey ? parseDateKey(focusDateKey) : startOfDay(new Date())
    setSelected(startOfDay(focus))
    setMonth(new Date(focus.getFullYear(), focus.getMonth(), 1))
  }, [focusDateKey])

  useEffect(() => {
    const store = hydrateSaveReminderStore(loadReminderStore())
    setUpcoming(Object.values(store.upcoming).filter(row => !row.deletedAt && !row.firedAt))
  }, [state.updatedAt])

  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const todayKeyStr = dateKey(startOfDay(new Date()))
  const cells = Array.from(
    { length: firstWeekday + daysInMonth },
    (_, index) => (index < firstWeekday ? null : index - firstWeekday + 1),
  )

  const selectedCompleted = useMemo(() => completedOnDay(state, selected), [selected, state])
  const selectedOpen = useMemo(() => tasksScheduledOn(state, selected), [selected, state])
  const selectedReminders = useMemo(
    () => remindersOnCalendarDay(upcoming, selected),
    [upcoming, selected],
  )

  return (
    <div className={variant === 'sheet' ? styles.sheetBody : styles.panel}>
      {variant === 'panel' ? (
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Agenda</h2>
        </header>
      ) : null}

      <div className={styles.calCard}>
        <div className={styles.calHeader}>
          <p className={styles.monthTitle}>{monthTitle(month)}</p>
          <div className={styles.calActions}>
            <button
              type="button"
              className={styles.monthBtn}
              aria-label="Previous month"
              onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={styles.monthBtn}
              aria-label="Next month"
              onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {WEEKDAYS.map((label, i) => (
            <span key={`${label}-${i}`} className={styles.weekday}>
              {label}
            </span>
          ))}
          {cells.map((day, index) => {
            if (day == null) return <span key={`blank-${index}`} />
            const cellDate = new Date(year, monthIndex, day)
            const key = dateKey(cellDate)
            const completion = dayCompletion(state, cellDate)
            const isSelected = key === dateKey(selected)
            const isToday = key === todayKeyStr
            return (
              <button
                key={key}
                type="button"
                className={styles.day}
                aria-pressed={isSelected}
                aria-label={`${fullDate(cellDate)}, ${completion}`}
                onClick={() => setSelected(startOfDay(cellDate))}
              >
                <span
                  className={`${styles.dayInner} ${isSelected ? styles.daySelected : ''} ${isToday && !isSelected ? styles.dayToday : ''}`}
                >
                  {day}
                </span>
                {completion === 'complete' ? (
                  <span className={styles.dotComplete} />
                ) : completion === 'partial' ? (
                  <span className={styles.dotPartial} />
                ) : (
                  <span className={styles.dotSpacer} />
                )}
              </button>
            )
          })}
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.dotComplete} /> Cleared / done
          </span>
          <span className={styles.legendItem}>
            <span className={styles.dotPartial} /> Some done, still open
          </span>
        </div>
      </div>

      <h3 className={styles.dayHeading}>{fullDate(selected)}</h3>
      {selectedCompleted.length === 0 &&
      selectedOpen.length === 0 &&
      selectedReminders.length === 0 ? (
        <p className={styles.emptyDay}>Nothing scheduled for this day.</p>
      ) : (
        <ul className={styles.lines}>
          {selectedReminders.map(row => (
            <li key={`rem-${row.id}`}>
              <Link
                href={`/library/${row.saveId}`}
                className={`${styles.line} ${styles.lineLink}`}
                aria-label={`Open save ${reminderDisplayTitle(row)}`}
              >
                <Bell className={styles.lineIcon} size={18} strokeWidth={1.75} />
                <div className={styles.lineBody}>
                  <p className={styles.lineTitle}>{reminderDisplayTitle(row)}</p>
                  <p className={styles.lineSub}>{formatReminderClock(new Date(row.fireAt))}</p>
                </div>
              </Link>
            </li>
          ))}
          {selectedCompleted.map(entry => (
            <li key={entry.id} className={styles.line}>
              <CheckCircle2 className={styles.lineIcon} size={18} strokeWidth={1.75} />
              <p className={`${styles.lineTitle} ${styles.lineDone}`}>{entry.title}</p>
            </li>
          ))}
          {selectedOpen.map(task => (
            <li key={task.id} className={styles.line}>
              <Circle className={`${styles.lineIcon} ${styles.lineMuted}`} size={18} strokeWidth={1.75} />
              <div className={styles.lineBody}>
                <p className={styles.lineTitle}>{task.title}</p>
                <p className={styles.lineSub}>{formatTaskSubtitle(task)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
