'use client'

import type { LucideIcon } from 'lucide-react'
import styles from './SelectionMoreMenu.module.css'

export type MoreMenuItem = {
  id: string
  label: string
  icon: LucideIcon
  onPress: () => void
  destructive?: boolean
}

type Props = {
  visible: boolean
  items: MoreMenuItem[]
  onClose: () => void
}

export default function SelectionMoreMenu({ visible, items, onClose }: Props) {
  if (!visible) return null
  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.menu}
        role="menu"
        aria-label="More selection actions"
        onClick={e => e.stopPropagation()}
      >
        {items.map(item => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={styles.item}
              data-destructive={item.destructive ? 'true' : undefined}
              onClick={() => {
                onClose()
                item.onPress()
              }}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
