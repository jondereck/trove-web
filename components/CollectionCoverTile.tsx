'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import type { CollectionCoverSlot } from '@/lib/types'
import { brandTileForDomain, faviconUrl } from '@/lib/linkBrand'
import styles from './CollectionCoverTile.module.css'

function tint(hex: string, alpha: number): string {
  const raw = hex.replace('#', '')
  const n = parseInt(raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

type Props = {
  slot?: CollectionCoverSlot | null
  color: string
  icon?: string
  alpha?: number
  radius?: number
  compact?: boolean
  className?: string
}

function BrandTile({
  domain,
  radius,
  className,
}: {
  domain: string
  radius: number
  className?: string
}) {
  const tile = brandTileForDomain(domain)
  return (
    <div
      className={`${styles.tile} ${styles.brand} ${className ?? ''}`}
      style={{ borderRadius: radius, backgroundColor: tile.bg, color: tile.accent }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={faviconUrl(domain)} alt="" className={styles.brandIcon} />
    </div>
  )
}

function GlyphTile({
  color,
  icon,
  alpha,
  radius,
  className,
}: {
  color: string
  icon: string
  alpha: number
  radius: number
  className?: string
}) {
  return (
    <div
      className={`${styles.tile} ${styles.glyph} ${className ?? ''}`}
      style={{
        borderRadius: radius,
        background: `linear-gradient(135deg, ${tint(color, alpha + 0.15)}, ${tint(color, alpha)})`,
      }}
    >
      <span aria-hidden>{icon.includes('book') ? '📖' : '📁'}</span>
    </div>
  )
}

export default function CollectionCoverTile({
  slot,
  color,
  icon = 'folder-outline',
  alpha = 0.34,
  radius = 8,
  compact = false,
  className,
}: Props) {
  const [imgError, setImgError] = useState(false)

  if (slot?.kind === 'image' && !imgError) {
    return (
      <div
        className={`${styles.tile} ${className ?? ''}`}
        style={{ borderRadius: radius }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slot.url}
          alt=""
          className={styles.image}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  if (slot?.kind === 'image' && imgError && slot.domain) {
    return <BrandTile domain={slot.domain} radius={radius} className={className} />
  }

  if (slot?.kind === 'brand') {
    return <BrandTile domain={slot.domain} radius={radius} className={className} />
  }

  if (slot?.kind === 'note') {
    return (
      <div
        className={`${styles.tile} ${styles.note} ${compact ? styles.noteCompact : ''} ${className ?? ''}`}
        style={{ borderRadius: radius }}
      >
        {slot.title ? <strong>{slot.title}</strong> : null}
        {slot.preview ? <span>{slot.preview}</span> : null}
      </div>
    )
  }

  if (slot?.kind === 'image' && imgError) {
    return (
      <div
        className={`${styles.tile} ${styles.brand} ${className ?? ''}`}
        style={{ borderRadius: radius, backgroundColor: 'var(--trove-accent-soft)' }}
      >
        <Link2 size={compact ? 14 : 18} strokeWidth={1.75} />
      </div>
    )
  }

  return (
    <GlyphTile
      color={color}
      icon={icon}
      alpha={alpha}
      radius={radius}
      className={className}
    />
  )
}
