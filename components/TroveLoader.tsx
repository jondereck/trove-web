import styles from './TroveLoader.module.css'

type Props = {
  label?: string
  compact?: boolean
}

export default function TroveLoader({ label, compact = false }: Props) {
  return (
    <div
      className={`${styles.wrap} ${compact ? styles.compact : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={styles.spinner} aria-hidden />
      {label ? <span className={styles.label}>{label}</span> : null}
    </div>
  )
}
