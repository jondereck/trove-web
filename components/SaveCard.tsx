import Link from 'next/link'
import { Heart, FileText, ImageIcon, Link2, Timer, Play } from 'lucide-react'
import type { Save } from '@/lib/types'
import { buildNoteCardChecklistPreview } from '@/lib/noteChecklistPreview'
import {
  brandTileForDomain,
  brandTileForType,
  faviconUrl,
  saveCardDomain,
} from '@/lib/linkBrand'
import { formatSaveCardDate, tagChipColor } from '@/lib/saveCardLayout'
import styles from './SaveCard.module.css'

type Props = {
  save: Save
  compact?: boolean
}

function TypeIcon({ type }: { type: Save['type'] }) {
  const size = 28
  if (type === 'note') return <FileText size={size} strokeWidth={1.5} />
  if (type === 'image') return <ImageIcon size={size} strokeWidth={1.5} />
  if (type === 'video') return <Play size={size} strokeWidth={1.5} />
  if (type === 'tracker') return <Timer size={size} strokeWidth={1.5} />
  return <Link2 size={size} strokeWidth={1.5} />
}

export default function SaveCard({ save, compact = false }: Props) {
  const domain = saveCardDomain(save.url)
  const tile = domain ? brandTileForDomain(domain) : brandTileForType(save.type)
  const checklist = save.type === 'note' && save.content
    ? buildNoteCardChecklistPreview(save.content)
    : null
  const showPhoto = save.type === 'image' && save.image_url

  return (
    <Link href={`/library/${save.id}`} className={`${styles.card} ${compact ? styles.compact : ''}`}>
      <div className={styles.thumbWrap} style={{ backgroundColor: tile.bg }}>
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={save.image_url} alt="" className={styles.thumbPhoto} />
        ) : domain ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={faviconUrl(domain)} alt="" className={styles.thumbLogo} />
        ) : (
          <span className={styles.thumbIcon} style={{ color: tile.accent }}>
            <TypeIcon type={save.type} />
          </span>
        )}
        <span
          className={save.is_favorite ? styles.heartOn : styles.heartOff}
          aria-hidden
        >
          <Heart size={15} fill={save.is_favorite ? 'currentColor' : 'none'} />
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.domain}>
            {domain || (save.type === 'note' ? 'Note' : save.type)}
          </span>
          <time className={styles.date}>{formatSaveCardDate(save.created_at)}</time>
        </div>

        <h3 className={styles.title}>{save.title}</h3>

        {checklist ? (
          <ul className={styles.checklist}>
            {checklist.visible.slice(0, compact ? 2 : 3).map(item => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>
        ) : null}

        {save.tags?.length ? (
          <div className={styles.tagRow}>
            {save.tags.slice(0, compact ? 2 : 4).map(tag => {
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
