import { BookOpen, MessageCircle, Monitor } from 'lucide-react'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import styles from './MobileDesktopGate.module.css'

const DOCS_URL = 'https://github.com/jondereck/trove'
const FEEDBACK_MAILTO = 'mailto:feedback@gettrove.app?subject=Trove%20Web%20feedback'

export default function MobileDesktopGate() {
  return (
    <div className={styles.gate} role="region" aria-label="Desktop recommended">
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden>
          <Monitor size={26} strokeWidth={1.75} />
        </div>

        <h1 className={`serif ${styles.headline}`}>
          Best on <span className={styles.headlineAccent}>desktop</span>
        </h1>

        <div className={styles.divider} aria-hidden>
          <span className={styles.dividerLine} />
          <span className={styles.dividerDot} />
          <span className={styles.dividerLine} />
        </div>

        <p className={styles.body}>
          Trove Web is designed for large screens. For the best experience, open this viewer on
          desktop or laptop.
        </p>

        <div className={styles.links}>
          <a className={styles.link} href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            <BookOpen size={15} strokeWidth={2} aria-hidden />
            Read the docs
          </a>
          <span className={styles.linkSep} aria-hidden />
          <a className={styles.link} href={FEEDBACK_MAILTO} aria-label="Share feedback by email">
            <MessageCircle size={15} strokeWidth={2} aria-hidden />
            Share feedback
          </a>
        </div>

        <StoreBadgeLinks layout="row" className={styles.storeRow} />
      </div>
    </div>
  )
}
