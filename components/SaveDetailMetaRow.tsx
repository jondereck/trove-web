'use client'

import { Bell } from 'lucide-react'
import type { Save } from '@/lib/types'
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/saveDetailCore'
import { saveCardDomain } from '@/lib/linkBrand'
import DomainBrand from '@/components/DomainBrand'
import styles from './SaveDetailMetaRow.module.css'

type Props = {
  save: Save
  remindersCount: number
  refreshingPreview: boolean
  canEdit: boolean
  onOpenLink?: () => void
  onRefreshPreview?: () => void
  onReminderClick?: () => void
}

export default function SaveDetailMetaRow({
  save,
  remindersCount,
  refreshingPreview,
  canEdit,
  onOpenLink,
  onRefreshPreview,
  onReminderClick,
}: Props) {
  const typeColor = TYPE_COLORS[save.type]
  const domain = saveCardDomain(save.url)

  return (
    <div className={styles.row}>
      <span
        className={styles.badge}
        style={{ backgroundColor: `${typeColor}22`, color: typeColor }}
      >
        {TYPE_LABELS[save.type]}
      </span>

      {remindersCount > 0 ? (
        <button type="button" className={styles.reminderPill} onClick={onReminderClick}>
          <Bell size={13} strokeWidth={2} />
          Reminder Active
        </button>
      ) : null}

      {save.type === 'link' && save.url && canEdit && onRefreshPreview ? (
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={onRefreshPreview}
          disabled={refreshingPreview}
        >
          {refreshingPreview ? <span className={styles.spinner} aria-hidden /> : null}
          Refresh preview
        </button>
      ) : null}

      {domain ? (
        <div className={styles.domainWrap}>
          <DomainBrand url={save.url} domain={domain} onClick={onOpenLink} />
        </div>
      ) : null}
    </div>
  )
}
