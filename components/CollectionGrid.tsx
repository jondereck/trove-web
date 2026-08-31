import type { CollectionWithCount } from '@/lib/collections'
import CollectionCard from './CollectionCard'
import styles from './CollectionGrid.module.css'

type Props = {
  collections: CollectionWithCount[]
}

export default function CollectionGrid({ collections }: Props) {
  return (
    <div className={styles.scrollWrap}>
      <div className={styles.grid}>
        {collections.map(collection => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>
    </div>
  )
}
