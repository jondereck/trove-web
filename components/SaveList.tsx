import type { Save } from '@/lib/types'
import SaveRow from './SaveRow'
import styles from './SaveList.module.css'

type Props = {
  saves: Save[]
}

export default function SaveList({ saves }: Props) {
  if (saves.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No saves in your library yet.</p>
        <span>Save items in Trove mobile, or try the demo on the sign-in page.</span>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h2>Library</h2>
        <span>{saves.length} items</span>
      </div>
      <div>
        {saves.map(save => (
          <SaveRow key={save.id} save={save} />
        ))}
      </div>
    </div>
  )
}
