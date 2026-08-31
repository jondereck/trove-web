import Link from 'next/link'
import type { Save } from '@/lib/types'
import { formatSaveDate } from '@/lib/libraryCore'
import NoteBody from './NoteBody'
import styles from './SaveDetail.module.css'

type Props = {
  save: Save
}

export default function SaveDetail({ save }: Props) {
  return (
    <article className={styles.wrap}>
      <nav className={styles.crumb}>
        <Link href="/library">Library</Link>
        <span>→</span>
        <span>{save.title}</span>
      </nav>

      <header className={styles.header}>
        <span className={styles.type}>{save.type}</span>
        <h1 className="serif">{save.title}</h1>
        <time>{formatSaveDate(save.created_at)}</time>
      </header>

      {save.tags?.length ? (
        <div className={styles.tags}>
          {save.tags.map(tag => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      ) : null}

      {save.description ? <p className={styles.description}>{save.description}</p> : null}

      {save.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={save.image_url} alt="" className={styles.hero} />
      ) : null}

      {save.content ? (
        <section className={styles.body}>
          <NoteBody content={save.content} />
        </section>
      ) : null}

      {save.url ? (
        <a href={save.url} target="_blank" rel="noopener noreferrer" className={styles.linkBtn}>
          Open link
        </a>
      ) : null}
    </article>
  )
}
