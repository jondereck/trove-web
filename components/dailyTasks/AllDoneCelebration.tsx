'use client'

import { Calendar, Cloud, Sparkles, Sun } from 'lucide-react'
import styles from './AllDoneCelebration.module.css'

const CONFETTI = [
  { left: '8%', color: '#7cb342', delay: '0s', size: 7 },
  { left: '18%', color: '#c0613c', delay: '0.12s', size: 6 },
  { left: '28%', color: '#e8a838', delay: '0.04s', size: 8 },
  { left: '40%', color: '#c0613c', delay: '0.24s', size: 5 },
  { left: '58%', color: '#7cb342', delay: '0.1s', size: 6 },
  { left: '72%', color: '#7cb342', delay: '0.2s', size: 6 },
  { left: '82%', color: '#d4785a', delay: '0.08s', size: 7 },
  { left: '90%', color: '#e8a838', delay: '0.16s', size: 5 },
]

type Props = {
  onAddTask: () => void
  onViewAgenda: () => void
  primaryLabel?: string
  secondaryLabel?: string
}

export default function AllDoneCelebration({
  onAddTask,
  onViewAgenda,
  primaryLabel = 'Add tasks for tomorrow',
  secondaryLabel = 'View agenda',
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.hero} aria-hidden>
        {CONFETTI.map((piece, index) => (
          <span
            key={index}
            className={styles.confetti}
            style={{
              left: piece.left,
              width: piece.size,
              height: piece.size,
              background: piece.color,
              animationDelay: piece.delay,
            }}
          />
        ))}
        <span className={styles.cloudLeft}>
          <Cloud size={28} strokeWidth={1.5} />
        </span>
        <span className={styles.cloudRight}>
          <Cloud size={34} strokeWidth={1.5} />
        </span>
        <span className={styles.sunWrap}>
          <Sun size={72} strokeWidth={1.5} fill="currentColor" />
        </span>
      </div>

      <p className={styles.title}>All done for today!</p>
      <p className={styles.sub}>Great job! You&apos;ve completed all your tasks.</p>

      <div className={styles.actions}>
        <button type="button" className={styles.primaryBtn} onClick={onAddTask}>
          <Sparkles size={16} strokeWidth={2} aria-hidden />
          {primaryLabel}
        </button>
        <button type="button" className={styles.secondaryBtn} onClick={onViewAgenda}>
          <Calendar size={16} strokeWidth={2} aria-hidden />
          {secondaryLabel}
        </button>
      </div>
    </div>
  )
}
