import type { Save } from '@/lib/types'
import { buildNoteCardChecklistPreview } from '@/lib/noteChecklistPreview'
import {
  noteCardShowsTitle,
  plainTextFromMarkdown,
  saveCardDescriptionBlurb,
  saveCardNoteBody,
  saveCardTrackerSummary,
  trackerStatusColor,
} from '@/lib/saveCardLayout'
import styles from './SaveCard.module.css'

type Props = {
  save: Save
  compact?: boolean
}

export function TrackerSnippet({ save }: { save: Save }) {
  const summary = saveCardTrackerSummary(save)
  if (!summary) {
    const fallback = save.description?.trim()
    return fallback ? <p className={styles.desc}>{fallback}</p> : null
  }

  const dot = trackerStatusColor(summary.status)
  return (
    <div className={styles.trackerBlock}>
      {summary.statusLabel ? (
        <div className={styles.trackerStatus}>
          <span className={styles.trackerDot} style={{ backgroundColor: dot }} />
          <span style={{ color: dot }}>{summary.statusLabel}</span>
        </div>
      ) : null}
      {summary.nextLabel ? (
        <p className={styles.desc}>{summary.nextLabel}</p>
      ) : summary.cadenceLabel ? (
        <p className={styles.descMuted}>{summary.cadenceLabel}</p>
      ) : null}
      {summary.lastRecordLabel ? (
        <p className={styles.descMuted}>Last · {summary.lastRecordLabel}</p>
      ) : null}
    </div>
  )
}

export default function SaveCardSnippet({ save, compact = false }: Props) {
  const noteBody = save.type === 'note' ? saveCardNoteBody(save) : ''
  const checklistPreviewLimit = compact ? 3 : 4
  const checklist =
    save.type === 'note' && noteBody
      ? buildNoteCardChecklistPreview(noteBody, checklistPreviewLimit)
      : null
  const descriptionBlurb = saveCardDescriptionBlurb(save)
  const showNoteTitle = save.type === 'note' && noteCardShowsTitle(save)

  if (save.type === 'tracker') {
    return <TrackerSnippet save={save} />
  }

  if (checklist) {
    return (
      <div className={styles.checklistBlock}>
        <ul className={styles.checklist}>
          {checklist.visible.map(item => (
            <li key={item.text}>
              <span className={styles.checkBox} aria-hidden />
              <span>{item.text || 'List item'}</span>
            </li>
          ))}
        </ul>
        {checklist.hiddenOpenCount > 0 ? (
          <span className={styles.checklistMore}>...</span>
        ) : null}
        {checklist.tickedLabel ? (
          <span className={styles.checklistTicked}>{checklist.tickedLabel}</span>
        ) : null}
      </div>
    )
  }

  if (save.type === 'note' && noteBody) {
    return (
      <p className={`${styles.desc} ${styles.noteText} serif`}>
        {plainTextFromMarkdown(noteBody) || noteBody}
      </p>
    )
  }

  if (descriptionBlurb) {
    return <p className={styles.desc}>{descriptionBlurb}</p>
  }

  if (save.type === 'note' && !showNoteTitle) {
    return null
  }

  return null
}
