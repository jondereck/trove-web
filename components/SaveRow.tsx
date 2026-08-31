import Link from 'next/link'
import { FileText, ImageIcon, Link2, Play, Timer } from 'lucide-react'
import type { Save } from '@/lib/types'
import { saveDetailHref } from '@/lib/saveDetailCore'
import { formatSaveDate, saveSubtitle } from '@/lib/libraryCore'
import styles from './SaveRow.module.css'

function TypeIcon({ type }: { type: Save['type'] }) {
  const size = 20
  const stroke = 1.75
  if (type === 'note') return <FileText size={size} strokeWidth={stroke} />
  if (type === 'image') return <ImageIcon size={size} strokeWidth={stroke} />
  if (type === 'video') return <Play size={size} strokeWidth={stroke} />
  if (type === 'tracker') return <Timer size={size} strokeWidth={stroke} />
  return <Link2 size={size} strokeWidth={stroke} />
}

type Props = {
  save: Save
}

export default function SaveRow({ save }: Props) {
  return (
    <Link href={saveDetailHref(save)} className={styles.row}>
      <div className={styles.lead}>
        {save.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={save.image_url} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.icon}>
            <TypeIcon type={save.type} />
          </span>
        )}
      </div>
      <div className={styles.body}>
        <strong>{save.title}</strong>
        <span>{saveSubtitle(save)}</span>
      </div>
      <time className={styles.date}>{formatSaveDate(save.created_at)}</time>
    </Link>
  )
}
