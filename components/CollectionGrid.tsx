import type { CollectionWithCount } from '@/lib/collections'
import CollectionCard from './CollectionCard'
import styles from './CollectionGrid.module.css'

type Props = {
  collections: CollectionWithCount[]
}

export default function CollectionGrid({ collections }: Props) {
  return (
    <div className={styles.grid}>
      <div className={styles.col}>
        {collections.filter((_, i) => i % 2 === 0).map(collection => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
      <div className={styles.col}>
        {collections.filter((_, i) => i % 2 === 1).map(collection => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  )
}
