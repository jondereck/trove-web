import { Icon } from '@iconify/react'
import { SiApple } from 'react-icons/si'
import styles from './StoreBadgeLinks.module.css'

type StoreBadgeLinksProps = {
  layout?: 'stacked' | 'row'
  className?: string
}

export default function StoreBadgeLinks({ layout = 'stacked', className }: StoreBadgeLinksProps) {
  const rowClass = [styles.row, layout === 'row' ? styles.rowHorizontal : styles.rowStacked, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rowClass}>
      <a
        href="#"
        className={styles.badge}
        aria-label="Download Trove on the App Store (coming soon)"
      >
        <SiApple className={styles.appleIcon} aria-hidden />
        <span className={styles.copy}>
          <small>Download on the</small>
          <strong>App Store</strong>
        </span>
      </a>
      <a
        href="#"
        className={styles.badge}
        aria-label="Get Trove on Google Play (coming soon)"
      >
        <Icon icon="logos:google-play-icon" className={styles.playIcon} aria-hidden />
        <span className={`${styles.copy} ${styles.playCopy}`}>
          <small>GET IT ON</small>
          <strong>Google Play</strong>
        </span>
      </a>
    </div>
  )
}
