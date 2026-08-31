'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TrackerRecord } from '@/lib/types'
import styles from './TrackerCalendar.module.css'

type Props = {
  records: TrackerRecord[]
  dueAt?: string
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function monthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export default function TrackerCalendar({ records, dueAt }: Props) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const recordDates = useMemo(
    () => new Set(records.map(record => dateKey(new Date(record.at)))),
    [records],
  )
  const dueDate = dueAt ? new Date(dueAt) : undefined
  const dueKey = dueDate && Number.isFinite(dueDate.getTime()) ? dateKey(dueDate) : undefined
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const days = new Date(year, monthIndex + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + days }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1,
  )

  return (
    <section className={styles.card} aria-label={`Calendar view for ${monthTitle(month)}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.label}>CALENDAR</span>
          <h3 className={styles.title}>{monthTitle(month)}</h3>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.monthBtn}
            onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={styles.monthBtn}
            onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((weekday, index) => (
          <span key={`${weekday}-${index}`} className={styles.weekday}>
            {weekday}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day == null) return <div key={`blank-${index}`} className={styles.day} />
          const key = dateKey(new Date(year, monthIndex, day))
          const hasRecord = recordDates.has(key)
          const isDue = dueKey === key
          return (
            <div key={key} className={styles.day}>
              <span className={`${styles.dayText} ${hasRecord ? styles.dayRecorded : ''}`}>{day}</span>
              {hasRecord || isDue ? (
                <div className={styles.markers}>
                  {hasRecord ? <span className={styles.recordDot} /> : null}
                  {isDue ? <span className={styles.dueDot} /> : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.recordDot} /> Record
        </span>
        {dueKey ? (
          <span className={styles.legendItem}>
            <span className={styles.dueDot} /> Due
          </span>
        ) : null}
      </div>
    </section>
  )
}
