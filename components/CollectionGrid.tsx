import { Pin } from 'lucide-react'
import type { CollectionWithCount } from '@/lib/collections'
import CollectionCard from './CollectionCard'
import styles from './CollectionGrid.module.css'

type Props = {
  collections: CollectionWithCount[]
  title?: string
  titleTone?: 'muted' | 'accent'
}

export default function CollectionGrid({ collections, title, titleTone = 'muted' }: Props) {
  if (collections.length === 0 && !title) return null

  return (
    <section className={styles.section}>
      {title ? (
        <div className={styles.sectionHead}>
          <h2
            className={
              titleTone === 'accent' ? styles.sectionTitleAccent : styles.sectionTitle
            }
          >
            {titleTone === 'accent' ? (
              <Pin size={12} strokeWidth={2.25} aria-hidden className={styles.sectionPin} />
            ) : null}
            {title}
          </h2>
        </div>
      ) : null}

      <div className={styles.scrollWrap}>
        <div className={styles.grid}>
          {collections.map(collection => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </section>
  )
}
