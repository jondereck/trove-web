import Link from 'next/link'
import type { CollectionWithCount } from '@/lib/collections'
import styles from './CollectionCard.module.css'

type Props = {
  collection: CollectionWithCount
}

export default function CollectionCard({ collection }: Props) {
  const color = collection.color ?? 'var(--trove-accent)'

  return (
    <Link href={`/collections/${collection.id}`} className={styles.card}>
      <div className={styles.iconWrap} style={{ background: `${color}22`, color }}>
        <span aria-hidden>📁</span>
      </div>
      <div className={styles.body}>
        <strong>{collection.name}</strong>
        {collection.description ? <span>{collection.description}</span> : null}
      </div>
      <span className={styles.count}>
        {collection.save_count} {collection.save_count === 1 ? 'save' : 'saves'}
      </span>
    </Link>
  )
}
