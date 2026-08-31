import Link from 'next/link'
import type { CollectionWithCount } from '@/lib/collections'
import CollectionCoverTile from './CollectionCoverTile'
import styles from './CollectionCard.module.css'

type Props = {
  collection: CollectionWithCount
}

export default function CollectionCard({ collection }: Props) {
  const color = collection.color ?? '#c0613c'
  const icon = collection.icon ?? 'folder-outline'
  const slots = collection.cover_slots ?? []
  const count = collection.save_count ?? 0

  return (
    <Link href={`/collections/${collection.id}`} className={styles.card}>
      <div className={styles.cover}>
        <CollectionCoverTile
          slot={slots[0]}
          color={color}
          icon={icon}
          alpha={0.55}
          radius={12}
          className={styles.coverBig}
        />
        <div className={styles.coverColumn}>
          <CollectionCoverTile
            slot={slots[1]}
            color={color}
            icon={icon}
            alpha={0.34}
            radius={8}
            compact
            className={styles.coverSmall}
          />
          <CollectionCoverTile
            slot={slots[2]}
            color={color}
            icon={icon}
            alpha={0.2}
            radius={8}
            compact
            className={styles.coverSmall}
          />
        </div>
      </div>
      <div className={styles.body}>
        <strong className={styles.name}>{collection.name}</strong>
        <span className={styles.meta}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>
    </Link>
  )
}
