'use client'

import { useHasUpcomingReminder } from '@/lib/useHasUpcomingReminder'
import styles from './SaveCard.module.css'

const REMINDER_ACTIVE_COLOR = '#2a7a4f'

export default function ReminderActiveStatus({
  saveId,
  enabled = true,
}: {
  saveId: string
  enabled?: boolean
}) {
  const active = useHasUpcomingReminder(saveId, enabled)
  if (!active) return null
  return (
    <div className={styles.reminderActive} aria-label="Reminder active">
      <span className={styles.reminderDot} style={{ backgroundColor: REMINDER_ACTIVE_COLOR }} />
      <span style={{ color: REMINDER_ACTIVE_COLOR }}>Reminder active</span>
    </div>
  )
}
