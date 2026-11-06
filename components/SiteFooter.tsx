import Link from 'next/link'
import styles from './SiteFooter.module.css'

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.copy}>© 2026 Trove</p>
      <nav className={styles.links} aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">Terms</Link>
      </nav>
    </footer>
  )
}
