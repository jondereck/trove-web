import styles from './LoadMoreFooter.module.css'

type Props = {
  loaded: number
  total: number
  loading: boolean
  onLoadMore: () => void
}

export default function LoadMoreFooter({ loaded, total, loading, onLoadMore }: Props) {
  if (loaded >= total) {
    return (
      <p className={styles.meta}>
        Showing all {total} {total === 1 ? 'save' : 'saves'}
      </p>
    )
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.meta}>
        Showing {loaded} of {total}
      </p>
      <button type="button" className={styles.button} disabled={loading} onClick={onLoadMore}>
        {loading ? 'Loading…' : 'Load more'}
      </button>
    </div>
  )
}
