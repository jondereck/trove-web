import Link from 'next/link'
import type { Save } from '@/lib/types'
import { formatSaveDate, saveSubtitle } from '@/lib/libraryCore'
import styles from './SaveRow.module.css'

const TYPE_ICON: Record<string, string> = {
  link: '🔗',
  note: '📝',
  image: '🖼',
  video: '▶',
  tracker: '📊',
}

type Props = {
  save: Save
}

export default function SaveRow({ save }: Props) {
  return (
    <Link href={`/library/${save.id}`} className={styles.row}>
      <div className={styles.lead}>
        {save.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={save.image_url} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.icon}>{TYPE_ICON[save.type] ?? '•'}</span>
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
