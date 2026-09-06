'use client'

import type { LucideIcon } from 'lucide-react'
import styles from './SelectionActionBar.module.css'

export type SelectionBarAction = {
  id: string
  label: string
  icon: LucideIcon
  onPress: () => void
  destructive?: boolean
  disabled?: boolean
}

type Props = {
  actions: SelectionBarAction[]
  inactive?: boolean
  selectedCount?: number
}

export default function SelectionActionBar({
  actions,
  inactive,
  selectedCount = 0,
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.pill} role="toolbar" aria-label="Selection actions">
        <span className={styles.count}>{selectedCount} selected</span>
        <div className={styles.actions}>
          {actions.map(action => {
            const Icon = action.icon
            const touchDisabled = action.disabled === true || (inactive && action.id !== 'more')
            const muted = inactive && action.id !== 'more' && !action.disabled
            return (
              <button
                key={action.id}
                type="button"
                className={styles.action}
                disabled={touchDisabled}
                onClick={action.onPress}
                data-destructive={action.destructive ? 'true' : undefined}
                data-muted={muted ? 'true' : undefined}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{action.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
