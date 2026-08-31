import type { Save } from '@/lib/types'
import SaveCard from './SaveCard'
import styles from './SaveGrid.module.css'

type Props = {
  saves: Save[]
  emptyTitle?: string
  emptyHint?: string
}

export default function SaveGrid({
  saves,
  emptyTitle = 'No saves in your library yet.',
  emptyHint = 'Save items in Trove mobile, or try the demo on the sign-in page.',
}: Props) {
  if (saves.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{emptyTitle}</p>
        <span>{emptyHint}</span>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {saves.map(save => (
        <div key={save.id} className={styles.item}>
          <SaveCard save={save} />
        </div>
      ))}
    </div>
  )
}
