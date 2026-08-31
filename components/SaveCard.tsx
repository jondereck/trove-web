'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Heart, ImageIcon, Link2, Play } from 'lucide-react'
import MediaLightbox from '@/components/MediaLightbox'
import type { Save } from '@/lib/types'
import { buildNoteCardChecklistPreview } from '@/lib/noteChecklistPreview'
import {
  brandTileForDomain,
  brandTileForType,
  faviconUrl,
  saveCardDomain,
} from '@/lib/linkBrand'
import { saveDetailHref } from '@/lib/saveDetailCore'
import { getSaveImageUrls } from '@/lib/saveImages'
import { formatSaveCardDate, saveCardDescriptionBlurb, saveCardNoteBody, saveCardSourceLabel, tagChipColor, trackerStatusColor } from '@/lib/saveCardLayout'
import { formatTrackerSummary, readTracker } from '@/lib/tracker'
import { createClient } from '@/lib/supabase/client'
import { updateSave } from '@/lib/saves'
import { patchCachedSave } from '@/lib/libraryCache'
import { repairThumbnail } from '@/lib/thumbnailRepair'
import styles from './SaveCard.module.css'

type Props = {
  save: Save
  compact?: boolean
  canEdit?: boolean
}

function TypeIcon({ type }: { type: Save['type'] }) {
  const size = 28
  if (type === 'image') return <ImageIcon size={size} strokeWidth={1.5} />
  if (type === 'video') return <Play size={size} strokeWidth={1.5} />
  return <Link2 size={size} strokeWidth={1.5} />
}

function scheduleIdle(fn: () => void): number {
  if (typeof window === 'undefined') return 0
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void) => number
  }
  if (w.requestIdleCallback) return w.requestIdleCallback(fn)
  return window.setTimeout(fn, 1)
}

function cancelIdle(id: number): void {
  if (typeof window === 'undefined' || id === 0) return
  const w = window as Window & {
    cancelIdleCallback?: (handle: number) => void
  }
  if (w.cancelIdleCallback) {
    w.cancelIdleCallback(id)
    return
  }
  window.clearTimeout(id)
}

export default function SaveCard({ save, compact = false, canEdit = false }: Props) {
  const router = useRouter()
  const [isFav, setIsFav] = useState(!!save.is_favorite)
  const [lightbox, setLightbox] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)
  const [imgError, setImgError] = useState(false)
  const [imageUrl, setImageUrl] = useState(save.image_url)

  useEffect(() => {
    setIsFav(!!save.is_favorite)
  }, [save.is_favorite])

  useEffect(() => {
    setImageUrl(save.image_url)
    setImgError(false)
  }, [save.id, save.image_url])

  useEffect(() => {
    if (save.type !== 'link' || save.is_vault) return
    if (imageUrl && !imgError) return

    let alive = true
    const idleId = scheduleIdle(() => {
      if (!alive) return
      void repairThumbnail(save).then(async result => {
        if (!alive || !result?.imageUrl) return
        setImageUrl(result.imageUrl)
        setImgError(false)
        if (canEdit && Object.keys(result.patch).length > 0) {
          const supabase = createClient()
          await updateSave(supabase, save.id, result.patch, { bump: false })
        }
      })
    })

    return () => {
      alive = false
      cancelIdle(idleId)
    }
    // Depend on id + image flags only — a new `save` object on viewed patches must not re-trigger repair.
  }, [canEdit, imgError, imageUrl, save.id])

  const domain = saveCardDomain(save.url)
  const tile = domain ? brandTileForDomain(domain) : brandTileForType(save.type)
  const noteBody = save.type === 'note' ? saveCardNoteBody(save) : ''
  const checklist =
    save.type === 'note' && noteBody ? buildNoteCardChecklistPreview(noteBody) : null
  const descriptionBlurb = saveCardDescriptionBlurb(save)
  const trackerData = save.type === 'tracker' ? readTracker(save) : null
  const trackerSummary = trackerData ? formatTrackerSummary(trackerData) : null
  const trackerDot = trackerSummary ? trackerStatusColor(trackerSummary.status) : null
  const showHero =
    !!imageUrl &&
    !imgError &&
    (save.type === 'image' || save.type === 'link' || save.type === 'video')
  const hasThumb = save.type === 'link' || save.type === 'image' || save.type === 'video'
  const previewUrl = getSaveImageUrls({ ...save, image_url: imageUrl ?? save.image_url })[0]

  const handleFavorite = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const next = !isFav
    setIsFav(next)
    if (!canEdit) return
    const supabase = createClient()
    const ok = await updateSave(supabase, save.id, { is_favorite: next })
    if (ok) patchCachedSave(save.id, { is_favorite: next })
    if (!ok) setIsFav(!next)
  }

  const handleQuickView = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (previewUrl) {
      setLightbox({
        url: previewUrl,
        kind: save.type === 'video' ? 'video' : 'image',
      })
      return
    }
    router.push(saveDetailHref(save))
  }

  return (
    <article className={`${styles.cardWrap} ${compact ? styles.compact : ''}`}>
      <Link
        href={saveDetailHref(save)}
        className={`${styles.card} ${!hasThumb ? styles.cardNoThumb : ''}`}
      >
        {hasThumb ? (
          <div className={styles.thumbWrap} style={{ backgroundColor: tile.bg }}>
            {showHero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl!}
                alt=""
                className={styles.thumbPhoto}
                onError={() => setImgError(true)}
              />
            ) : domain ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={faviconUrl(domain)} alt="" className={styles.thumbLogo} />
            ) : (
              <span className={styles.thumbIcon} style={{ color: tile.accent }}>
                <TypeIcon type={save.type} />
              </span>
            )}
          </div>
        ) : null}

        <div className={styles.body}>
          <div className={styles.metaRow}>
            <span className={styles.domain}>
              {domain || saveCardSourceLabel(save.type)}
            </span>
            <time className={styles.date}>{formatSaveCardDate(save.created_at)}</time>
          </div>

          <h3 className={styles.title}>{save.title}</h3>

          <div className={styles.snippetSlot}>
            {checklist ? (
              <div className={styles.checklistBlock}>
                <ul className={styles.checklist}>
                  {checklist.visible.slice(0, compact ? 2 : 3).map(item => (
                    <li key={item.text}>
                      <span className={styles.checkBox} aria-hidden />
                      <span>{item.text || 'List item'}</span>
                    </li>
                  ))}
                </ul>
                {checklist.hiddenOpenCount > 0 ? (
                  <span className={styles.checklistMore}>...</span>
                ) : null}
                {checklist.tickedLabel ? (
                  <span className={styles.checklistTicked}>{checklist.tickedLabel}</span>
                ) : null}
              </div>
            ) : null}

            {descriptionBlurb ? (
              <p className={styles.desc}>{descriptionBlurb}</p>
            ) : null}

            {trackerSummary ? (
              <div className={styles.trackerBlock}>
                {trackerSummary.statusLabel ? (
                  <div className={styles.trackerStatus}>
                    <span className={styles.trackerDot} style={{ backgroundColor: trackerDot! }} />
                    <span style={{ color: trackerDot! }}>{trackerSummary.statusLabel}</span>
                  </div>
                ) : null}
                {trackerSummary.nextLabel ? (
                  <p className={styles.desc}>{trackerSummary.nextLabel}</p>
                ) : trackerSummary.cadenceLabel ? (
                  <p className={styles.descMuted}>{trackerSummary.cadenceLabel}</p>
                ) : null}
                {trackerSummary.lastRecordLabel ? (
                  <p className={styles.descMuted}>Last · {trackerSummary.lastRecordLabel}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {save.tags?.length ? (
            <div className={styles.tagRow}>
              {save.tags.slice(0, compact ? 2 : 4).map(tag => {
                const c = tagChipColor(tag)
                return (
                  <span
                    key={tag}
                    className={styles.tag}
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    {tag}
                  </span>
                )
              })}
            </div>
          ) : null}
        </div>
      </Link>

      <div className={styles.actionBtns}>
        <button
          type="button"
          className={styles.actionBtn}
          aria-label="Quick view"
          onClick={handleQuickView}
        >
          <Eye size={16} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          className={`${styles.actionBtn} ${isFav ? styles.actionBtnFav : ''}`}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFav}
          onClick={handleFavorite}
        >
          <Heart size={16} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>

      <MediaLightbox
        url={lightbox?.url ?? null}
        kind={lightbox?.kind}
        onClose={() => setLightbox(null)}
      />
    </article>
  )
}
