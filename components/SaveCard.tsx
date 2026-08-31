'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Heart, ImageIcon, Link2, Play, Timer } from 'lucide-react'
import MediaLightbox from '@/components/MediaLightbox'
import DomainBrand from '@/components/DomainBrand'
import ReminderActiveStatus from '@/components/ReminderActiveStatus'
import SaveCardSnippet from '@/components/SaveCardSnippet'
import type { Save } from '@/lib/types'
import {
  brandTileForDomain,
  brandTileForType,
  faviconUrl,
  saveCardDomain,
} from '@/lib/linkBrand'
import { classifyLinkSource } from '@/lib/linkSource'
import { saveDetailHref } from '@/lib/saveDetailCore'
import { getSaveImageUrls } from '@/lib/saveImages'
import {
  formatSaveCardDate,
  noteCardShowsTitle,
  saveCardSourceLabel,
  tagChipColor,
} from '@/lib/saveCardLayout'
import { openSaveLink } from '@/lib/openLink'
import { createClient } from '@/lib/supabase/client'
import { updateSave } from '@/lib/saves'
import { patchCachedSave } from '@/lib/libraryCache'
import { repairThumbnail } from '@/lib/thumbnailRepair'
import styles from './SaveCard.module.css'

type Props = {
  save: Save
  compact?: boolean
  canEdit?: boolean
  layout?: 'grid' | 'list'
}

function TypeIcon({ type, size = 28 }: { type: Save['type']; size?: number }) {
  if (type === 'image') return <ImageIcon size={size} strokeWidth={1.5} />
  if (type === 'video') return <Play size={size} strokeWidth={1.5} />
  if (type === 'tracker') return <Timer size={size} strokeWidth={1.5} />
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

function CardMetaRow({
  save,
  isUnread,
  onOpenLink,
}: {
  save: Save
  isUnread: boolean
  onOpenLink?: () => void
}) {
  const domain = saveCardDomain(save.url)
  const date = <time className={styles.date}>{formatSaveCardDate(save.created_at)}</time>

  if (save.type === 'note') {
    return (
      <div className={styles.metaRow}>
        <div className={styles.metaLeft}>
          {isUnread ? <span className={styles.unreadDot} aria-hidden /> : null}
          {date}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.metaRow}>
      <div className={styles.metaLeft}>
        {isUnread ? <span className={styles.unreadDot} aria-hidden /> : null}
        {domain ? (
          <>
            <DomainBrand
              url={save.url}
              domain={domain}
              onClick={save.url && onOpenLink ? () => onOpenLink() : undefined}
            />
            {classifyLinkSource(save.url) === 'docs' ? (
              <span className={styles.sourceBadge}>Docs</span>
            ) : null}
          </>
        ) : (
          <span className={styles.sourceLabel}>
            <TypeIcon type={save.type} size={12} />
            <span>{saveCardSourceLabel(save.type)}</span>
          </span>
        )}
      </div>
      {date}
    </div>
  )
}

export default function SaveCard({
  save,
  compact = false,
  canEdit = false,
  layout = 'grid',
}: Props) {
  const router = useRouter()
  const [isFav, setIsFav] = useState(!!save.is_favorite)
  const [isUnread, setIsUnread] = useState(save.is_viewed === false)
  const [lightbox, setLightbox] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)
  const [imgError, setImgError] = useState(false)
  const [imageUrl, setImageUrl] = useState(save.image_url)

  useEffect(() => {
    setIsFav(!!save.is_favorite)
  }, [save.is_favorite])

  useEffect(() => {
    setIsUnread(save.is_viewed === false)
  }, [save.id, save.is_viewed])

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
  }, [canEdit, imgError, imageUrl, save.id])

  const domain = saveCardDomain(save.url)
  const tile = domain ? brandTileForDomain(domain) : brandTileForType(save.type)
  const showHero =
    !!imageUrl &&
    !imgError &&
    (save.type === 'image' || save.type === 'link' || save.type === 'video')
  const hasThumb = save.type === 'link' || save.type === 'image' || save.type === 'video'
  const noThumb = save.type === 'note' || save.type === 'tracker'
  const imageCount = getSaveImageUrls({ ...save, image_url: imageUrl ?? save.image_url }).length
  const previewUrl = getSaveImageUrls({ ...save, image_url: imageUrl ?? save.image_url })[0]
  const showNoteTitle = save.type === 'note' && noteCardShowsTitle(save)
  const showTitle = save.type !== 'note' || showNoteTitle
  const paperColor = save.editor_style?.paperColor

  const markViewed = async () => {
    if (!isUnread || !canEdit) return
    const supabase = createClient()
    const ok = await updateSave(supabase, save.id, { is_viewed: true }, { bump: false })
    if (ok) {
      patchCachedSave(save.id, { is_viewed: true })
      setIsUnread(false)
    }
  }

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

  const handleOpenLink = () => {
    if (!save.url) return
    void markViewed()
    openSaveLink(save.url)
  }

  const handleNavigate = () => {
    void markViewed()
  }

  const cardClass = [
    styles.card,
    layout === 'list' ? styles.cardList : '',
    noThumb ? styles.cardNoThumb : '',
    isUnread ? styles.cardUnread : '',
    save.type === 'note' && !isUnread ? styles.cardNote : '',
  ]
    .filter(Boolean)
    .join(' ')

  const thumb = (
    <div className={layout === 'list' ? styles.listThumbWrap : styles.thumbWrap} style={{ backgroundColor: tile.bg }}>
      {showHero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl!}
          alt=""
          className={layout === 'list' ? styles.listThumb : styles.thumbPhoto}
          onError={() => setImgError(true)}
        />
      ) : domain ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl(domain)}
          alt=""
          className={layout === 'list' ? styles.listThumbLogo : styles.thumbLogo}
        />
      ) : (
        <span className={styles.thumbIcon} style={{ color: tile.accent }}>
          <TypeIcon type={save.type} size={layout === 'list' ? 24 : 28} />
        </span>
      )}
      {save.type === 'video' && showHero ? (
        <span className={styles.playOverlay} aria-hidden>
          <Play size={22} fill="currentColor" strokeWidth={0} />
        </span>
      ) : null}
      {imageCount > 1 ? (
        <span className={styles.galleryBadge}>
          <ImageIcon size={11} strokeWidth={2} />
          {imageCount}
        </span>
      ) : null}
    </div>
  )

  const body = (
    <div className={styles.body}>
      <CardMetaRow save={save} isUnread={isUnread} onOpenLink={handleOpenLink} />

      {showTitle ? (
        <h3 className={`${styles.title} ${isUnread ? styles.titleUnread : ''}`}>{save.title}</h3>
      ) : null}

      {save.type !== 'tracker' ? <ReminderActiveStatus saveId={save.id} /> : null}

      <div className={styles.snippetSlot}>
        <SaveCardSnippet save={save} compact={compact || layout === 'list'} />
      </div>

      {save.tags?.length ? (
        <div className={styles.tagRow}>
          {save.tags.slice(0, compact || layout === 'list' ? 2 : 4).map(tag => {
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
  )

  return (
    <article
      className={`${styles.cardWrap} ${compact ? styles.compact : ''} ${layout === 'list' ? styles.listWrap : ''}`}
      style={paperColor ? { ['--card-paper' as string]: paperColor } : undefined}
    >
      <Link href={saveDetailHref(save)} className={cardClass} onClick={handleNavigate}>
        {isUnread ? <span className={styles.unreadStripe} aria-hidden /> : null}
        {isUnread ? <span className={styles.newBadge}>NEW</span> : null}

        {layout === 'list' ? (
          <div className={styles.listRow}>
            {hasThumb ? thumb : (
              <div className={`${styles.listThumbWrap} ${styles.listThumbFallback}`}>
                <TypeIcon type={save.type} size={24} />
              </div>
            )}
            {body}
          </div>
        ) : (
          <>
            {hasThumb ? thumb : null}
            {body}
          </>
        )}
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
