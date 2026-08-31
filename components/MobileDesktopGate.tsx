import { Monitor } from 'lucide-react'
import styles from './MobileDesktopGate.module.css'

const DOCS_URL = 'https://github.com/jondereck/trove'
const FEEDBACK_MAILTO = 'mailto:feedback@gettrove.app?subject=Trove%20Web%20feedback'

export default function MobileDesktopGate() {
  return (
    <div className={styles.gate} role="region" aria-label="Desktop recommended">
      <div className={styles.card}>
        <div className={styles.iconWrap} aria-hidden>
          <Monitor size={28} strokeWidth={1.75} />
        </div>

        <h1 className={styles.headline}>Best on desktop</h1>
        <p className={styles.body}>
          Trove Web is designed for large screens. For the best experience, open this viewer on
          desktop or laptop.
        </p>

        <div className={styles.links}>
          <a className={styles.link} href={DOCS_URL} target="_blank" rel="noopener noreferrer">
            Read the docs
          </a>
          <span className={styles.linkSep} aria-hidden>
            |
          </span>
          <a className={styles.link} href={FEEDBACK_MAILTO} aria-label="Share feedback by email">
            Share feedback
          </a>
        </div>

        <div className={styles.storeRow}>
          <a
            href="#"
            className={styles.storeBadge}
            aria-label="Download Trove on the App Store (coming soon)"
          >
            <svg
              className={styles.storeIcon}
              width="20"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M18.7 19.5c-.4.9-1 1.8-1.8 2.5-.8.7-1.7 1.1-2.6 1.1-.7 0-1.2-.2-1.8-.5-.6-.3-1.1-.5-1.7-.5s-1.1.2-1.8.5c-.7.3-1.2.5-1.8.5-.9 0-1.8-.4-2.6-1.1-.8-.7-1.4-1.6-1.8-2.5C2.7 17.2 2 14.9 2 12.5c0-2.7 1.4-4.9 3.5-6.3-.8-.9-1.3-2.1-1.2-3.4.1-1.1.5-2.1 1.2-2.9.7-.8 1.6-1.3 2.6-1.4.6 0 1.2.2 1.8.5.6.3 1.1.5 1.7.5s1.1-.2 1.7-.5c.6-.3 1.2-.5 1.8-.5 1 .1 1.9.6 2.6 1.4.5.6.9 1.3 1.1 2.1-2 .9-3.3 2.8-3.3 5.1 0 2.4 1.2 4.5 3.1 5.8zM15.5 3.8c.5-.6.8-1.4.7-2.2-.7.1-1.5.4-2 1-.5.5-.9 1.3-.8 2.1.8.1 1.5-.4 2.1-1z" />
            </svg>
            <span>
              <small>Download on the</small>
              <strong>App Store</strong>
            </span>
          </a>
          <a
            href="#"
            className={styles.storeBadge}
            aria-label="Get Trove on Google Play (coming soon)"
          >
            <svg
              className={styles.storeIcon}
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M3.6 1.8L13.2 12 3.6 22.2A1.8 1.8 0 0 1 2.4 21V3a1.8 1.8 0 0 1 1.2-1.2z" />
              <path d="M13.2 12l4.2 4.2 7.2-4.2a1.2 1.2 0 0 0 0-2.1l-7.2-4.2L13.2 12z" />
              <path d="M17.4 16.2L13.2 12l4.2-4.2 2.4 1.4a1.8 1.8 0 0 1 0 3.1l-2.4 1.5z" />
              <path d="M17.4 7.8L13.2 12l9.6 10.2A1.8 1.8 0 0 0 22.8 21V3a1.8 1.8 0 0 0-1.2-1.8L13.2 12l4.2-4.2z" />
            </svg>
            <span>
              <small>GET IT ON</small>
              <strong>Google Play</strong>
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}
