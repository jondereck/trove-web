import Link from 'next/link'
import type { Save } from '@/lib/types'
import { buildNoteCardChecklistPreview } from '@/lib/noteChecklistPreview'
import {
  formatSaveCardDate,
  saveCardDomain,
  saveCardSourceLabel,
  tagChipColor,
} from '@/lib/saveCardLayout'
import styles from './SaveCard.module.css'

type Props = {
  save: Save
}

export default function SaveCard({ save }: Props) {
  const domain = saveCardDomain(save.url)
  const checklist = save.type === 'note' && save.content
    ? buildNoteCardChecklistPreview(save.content)
    : null
  const imageCount = save.image_urls?.length ?? (save.image_url ? 1 : 0)

  return (
    <Link href={`/library/${save.id}`} className={styles.card}>
      {(save.image_url || save.type === 'video') && (
        <div className={styles.heroWrap}>
          {save.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={save.image_url} alt="" className={styles.hero} />
          ) : (
            <div className={styles.heroFallback}>▶</div>
          )}
          {save.type === 'video' ? <span className={styles.playBadge}>▶</span> : null}
          {imageCount > 1 ? <span className={styles.galleryBadge}>{imageCount}</span> : null}
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.metaLeft}>
            {domain ? (
              <span className={styles.domain}>{domain}</span>
            ) : (
              <span className={styles.source}>{saveCardSourceLabel(save.type)}</span>
            )}
          </span>
          <time className={styles.date}>{formatSaveCardDate(save.created_at)}</time>
        </div>

        <h3 className={styles.title}>{save.title}</h3>

        {checklist ? (
          <ul className={styles.checklist}>
            {checklist.visible.map(item => (
              <li key={item.text}>
                <span className={styles.tick}>○</span>
                {item.text}
              </li>
            ))}
            {checklist.hiddenOpenCount > 0 ? (
              <li className={styles.checklistMore}>+ {checklist.hiddenOpenCount} more</li>
            ) : null}
            {checklist.tickedLabel ? (
              <li className={styles.checklistDone}>{checklist.tickedLabel}</li>
            ) : null}
          </ul>
        ) : save.description ? (
          <p className={styles.description}>{save.description}</p>
        ) : null}

        {save.tags?.length ? (
          <div className={styles.tagRow}>
            {save.tags.map(tag => {
              const c = tagChipColor(tag)
              return (
                <span
                  key={tag}
                  className={styles.tag}
                  style={{ backgroundColor: c.bg, color: c.text }}
                >
                  {tag}
                </span>
              )
            })}
          </div>
        ) : null}
      </div>
    </Link>
  )
}
