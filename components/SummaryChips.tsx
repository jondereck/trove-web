import styles from './SummaryChips.module.css'

type Props = {
  total: number
  notes: number
  links: number
}

export default function SummaryChips({ total, notes, links }: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.chip}>
        <span className={styles.label}>Saves</span>
        <strong>{total}</strong>
      </div>
      <div className={styles.chip}>
        <span className={styles.label}>Notes</span>
        <strong>{notes}</strong>
      </div>
      <div className={styles.chip}>
        <span className={styles.label}>Links</span>
        <strong>{links}</strong>
      </div>
    </div>
  )
}
