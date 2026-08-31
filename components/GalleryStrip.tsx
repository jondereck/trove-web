'use client'

import { Plus } from 'lucide-react'
import styles from './GalleryStrip.module.css'

type Props = {
  urls: string[]
  onSelect: (index: number) => void
  onAdd?: () => void
  maxVisible?: number
  addDisabled?: boolean
}

export default function GalleryStrip({
  urls,
  onSelect,
  onAdd,
  maxVisible = 4,
  addDisabled = false,
}: Props) {
  if (!urls.length && !onAdd) return null

  const visible = urls.slice(0, maxVisible)
  const hiddenCount = Math.max(0, urls.length - maxVisible)
  const lastIndex = visible.length - 1

  return (
    <div className={styles.strip}>
      {visible.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          className={styles.thumbWrap}
          onClick={() => onSelect(index)}
          aria-label={`View image ${index + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className={styles.thumb} />
          {index === lastIndex && hiddenCount > 0 ? (
            <span className={styles.overlay}>+{hiddenCount}</span>
          ) : null}
        </button>
      ))}
      {onAdd ? (
        <button
          type="button"
          className={styles.addBtn}
          onClick={onAdd}
          disabled={addDisabled}
          aria-label="Add photo"
        >
          <Plus size={22} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  )
}
