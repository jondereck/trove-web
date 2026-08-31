'use client'

import { ExternalLink } from 'lucide-react'
import type { Save } from '@/lib/types'
import { formatSavedTimestamp } from '@/lib/saveDetailCore'
import { getSaveImageUrls } from '@/lib/saveImages'
import { saveCardDomain } from '@/lib/linkBrand'
import SaveVideoPlayer from '@/components/SaveVideoPlayer'
import styles from './SaveDetailPreviewCard.module.css'

type Props = {
  save: Save
  selectedIndex?: number
  onSelectIndex?: (index: number) => void
  onOpenLink?: () => void
  onHeroClick?: () => void
}

export default function SaveDetailPreviewCard({
  save,
  selectedIndex = 0,
  onSelectIndex,
  onOpenLink,
  onHeroClick,
}: Props) {
  const urls = getSaveImageUrls(save)
  const heroUrl = urls[selectedIndex] ?? urls[0] ?? save.image_url
  const domain = saveCardDomain(save.url)
  const isVideo = save.type === 'video'
  const showThumbs = urls.length > 1

  return (
    <aside className={styles.card}>
      <span className={styles.label}>Preview</span>

      <div className={styles.heroRow}>
        <div className={styles.heroMain}>
          {isVideo && save.url ? (
            <SaveVideoPlayer src={save.url} poster={save.image_url} />
          ) : heroUrl ? (
            <button type="button" className={styles.heroButton} onClick={onHeroClick}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroUrl} alt="" className={styles.heroImage} />
            </button>
          ) : (
            <div className={styles.emptyHero}>No preview image</div>
          )}
        </div>

        {showThumbs ? (
          <div className={styles.thumbStrip}>
            {urls.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={`${styles.thumbBtn} ${index === selectedIndex ? styles.thumbActive : ''}`}
                onClick={() => onSelectIndex?.(index)}
                aria-label={`Preview image ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className={styles.thumb} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {save.description ? <p className={styles.description}>{save.description}</p> : null}

      <div className={styles.meta}>
        {domain ? (
          <span>
            Source: <strong>{domain}</strong>
          </span>
        ) : null}
        <span>
          Saved: <strong>{formatSavedTimestamp(save.created_at)}</strong>
        </span>
      </div>

      {save.url ? (
        <button type="button" className={styles.openBtn} onClick={onOpenLink}>
          Open in new tab
          <ExternalLink size={16} strokeWidth={2} />
        </button>
      ) : null}
    </aside>
  )
}
