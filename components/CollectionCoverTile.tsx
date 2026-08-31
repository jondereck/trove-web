import type { CollectionCoverSlot } from '@/lib/types'
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

export default function CollectionCoverTile({
  slot,
  color,
  icon = 'folder-outline',
  alpha = 0.34,
  radius = 8,
  compact = false,
  className,
}: Props) {
  const style = {
    borderRadius: radius,
    background: `linear-gradient(135deg, ${tint(color, alpha + 0.15)}, ${tint(color, alpha)})`,
  }

  if (slot?.kind === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={slot.url}
        alt=""
        className={`${styles.image} ${className ?? ''}`}
        style={{ borderRadius: radius }}
      />
    )
  }

  if (slot?.kind === 'brand') {
    return (
      <div className={`${styles.brand} ${className ?? ''}`} style={{ borderRadius: radius }}>
        <span>{slot.domain.slice(0, 1).toUpperCase()}</span>
      </div>
    )
  }

  if (slot?.kind === 'note') {
    return (
      <div className={`${styles.note} ${className ?? ''}`} style={{ borderRadius: radius }}>
        {slot.title ? <strong>{slot.title}</strong> : null}
        {slot.preview ? <span>{slot.preview}</span> : null}
      </div>
    )
  }

  return (
    <div className={`${styles.glyph} ${className ?? ''}`} style={style}>
      <span aria-hidden>{icon.includes('book') ? '📖' : '📁'}</span>
    </div>
  )
}
