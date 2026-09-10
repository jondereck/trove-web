import Link from 'next/link'
import SaveGrid from '@/components/SaveGrid'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import UserAvatar from '@/components/UserAvatar'
import TroveMark from '@/components/TroveMark'
import type { SharedCollectionPayload } from '@/lib/sharedCollection'
import { sharedCollectionPath } from '@/lib/sharedCollection'
import type { Save, SaveType } from '@/lib/types'
import styles from './SharedCollectionPage.module.css'

type Props =
  | { unavailable: true; data?: undefined; token?: undefined }
  | { unavailable?: false; data: SharedCollectionPayload; token: string }

const SAVE_TYPES: ReadonlySet<string> = new Set(['link', 'image', 'video', 'note', 'tracker'])

function ownerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
}

function toLibrarySave(row: SharedCollectionPayload['saves'][number]): Save {
  const type = (SAVE_TYPES.has(row.type) ? row.type : 'link') as SaveType
  return {
    id: row.id,
    user_id: '',
    title: row.title,
    description: row.description ?? undefined,
    type,
    url: row.url ?? undefined,
    image_url: row.image_url ?? undefined,
    tags: row.tags ?? [],
    is_inbox: false,
    created_at: row.created_at,
  }
}

export default function SharedCollectionPage(props: Props) {
  if (props.unavailable || !props.data) {
    return (
      <div className={styles.page}>
        <header className={styles.topBar}>
          <Link href="/" className={styles.brand} aria-label="Trove home">
            <TroveMark size={28} />
            <span className={`serif ${styles.brandWord}`}>Trove</span>
          </Link>
        </header>
        <main className={styles.unavailable}>
          <h1 className={`serif ${styles.unavailableTitle}`}>Link unavailable</h1>
          <p className={styles.unavailableBody}>
            This shared collection link is invalid or no longer available.
          </p>
          <Link href="/" className={styles.homeLink}>
            Go to Trove
          </Link>
        </main>
      </div>
    )
  }

  const { data, token } = props
  const saves = data.saves.map(toLibrarySave)
  const countLabel = saves.length === 1 ? '1 item' : `${saves.length} items`
  const signInHref = `/?next=${encodeURIComponent(sharedCollectionPath(token))}`

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label="Trove home">
          <TroveMark size={28} />
          <span className={`serif ${styles.brandWord}`}>Trove</span>
        </Link>
      </header>

      <main className={styles.main}>
        <header className={styles.header}>
          {data.collection.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.collection.cover_image_url}
              alt=""
              className={styles.cover}
            />
          ) : null}

          <div
            className={styles.ownerChip}
            style={{ borderColor: data.collection.color || undefined }}
          >
            <UserAvatar
              imageUrl={data.owner.avatar_url}
              initials={ownerInitials(data.owner.display_name)}
              size={28}
            />
            <span className={styles.ownerName}>{data.owner.display_name}</span>
          </div>

          <p className={styles.kicker}>{countLabel}</p>
          <h1 className={`serif ${styles.title}`}>{data.collection.name}</h1>
          {data.collection.description ? (
            <p className={styles.description}>{data.collection.description}</p>
          ) : null}
        </header>

        <div className={styles.ctaRow}>
          <StoreBadgeLinks layout="row" className={styles.badges} />
          <Link href={signInHref} className={styles.signIn}>
            Sign in
          </Link>
        </div>

        <SaveGrid
          saves={saves}
          canEdit={false}
          emptyTitle="No items in this collection yet."
          emptyHint="Check back later, or open Trove on your phone."
        />
      </main>
    </div>
  )
}
