import Link from 'next/link'
import styles from './DemoBanner.module.css'

export default function DemoBanner() {
  return (
    <div className={styles.banner}>
      <strong>Demo data</strong>
      <span>These saves are sample content, not your account.</span>
      <Link href="/">Sign in for your library</Link>
    </div>
  )
}
