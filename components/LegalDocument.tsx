import Link from 'next/link'
import type { LegalSection } from '@/lib/legalCopy'
import { LEGAL_UPDATED } from '@/lib/legalCopy'
import SiteFooter from '@/components/SiteFooter'
import styles from './LegalDocument.module.css'

export default function LegalDocument({
  title,
  intro,
  sections,
}: {
  title: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.kicker}>
          <Link href="/">Trove</Link>
        </p>
        <h1 className={`serif ${styles.title}`}>{title}</h1>
        <p className={styles.updated}>Updated {LEGAL_UPDATED}</p>
        <p className={styles.intro}>{intro}</p>
        {sections.map(section => (
          <section key={section.heading} className={styles.section}>
            <h2 className={styles.heading}>{section.heading}</h2>
            {section.paragraphs.map(paragraph => (
              <p key={paragraph.slice(0, 48)} className={styles.body}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
      <div className={styles.footerWrap}>
        <SiteFooter />
      </div>
    </main>
  )
}
