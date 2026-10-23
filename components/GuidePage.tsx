'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import TroveMark from '@/components/TroveMark'
import { BRAND } from '@/lib/branding'
import {
  GUIDE_GROUPS,
  GUIDE_LESSONS,
  GUIDE_PROGRESS_KEY,
  groupDoneCount,
  groupLessons,
  guideProgress,
  lessonById,
  lessonNumber,
  nextLessonId,
  readDoneIds,
  type GuideBlock,
} from '@/lib/guide/lessons'
import styles from './GuidePage.module.css'

function Block({ block }: { block: GuideBlock }) {
  const [copied, setCopied] = useState(false)

  if (block.type === 'p') return <p className={styles.prose}>{block.text}</p>

  if (block.type === 'note') {
    return <p className={styles.note}>{block.text}</p>
  }

  if (block.type === 'steps') {
    return (
      <ol className={styles.steps}>
        {block.items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    )
  }

  return (
    <figure className={styles.codeBlock}>
      <figcaption>
        <span>{block.label}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(block.text).then(() => {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            })
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </figcaption>
      <pre>
        <code>{block.text}</code>
      </pre>
    </figure>
  )
}

export default function GuidePage() {
  const router = useRouter()
  const params = useSearchParams()
  const requested = params.get('lesson')
  const lesson = lessonById(requested)
  const [done, setDone] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDone(readDoneIds(localStorage.getItem(GUIDE_PROGRESS_KEY)))
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify(done))
  }, [done, ready])

  const progress = guideProgress(done)
  const finished = new Set(done)
  const upcoming = nextLessonId(lesson.id)
  const group = GUIDE_GROUPS.find(item => item.id === lesson.group)

  const openLesson = (id: string, scroll: boolean) => {
    const next = new URLSearchParams(params.toString())
    next.set('lesson', id)
    router.replace(`/guide?${next.toString()}`, { scroll: false })
    if (!scroll) return
    window.requestAnimationFrame(() => {
      if (window.matchMedia('(max-width: 860px)').matches) {
        document.getElementById('guide-lesson')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }

  const toggle = (id: string) => {
    setDone(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]))
  }

  const reset = () => {
    if (!window.confirm('Reset your guide progress in this browser?')) return
    setDone([])
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand}>
          <TroveMark size={32} />
          <span className="serif">{BRAND.name}</span>
        </Link>
        <Link href="/" className={styles.home}>
          Home
        </Link>
      </header>

      <div className={styles.hero}>
        <h1 className="serif">Learn Trove, one short guide at a time.</h1>
        <p>
          Twelve short lessons, from your first save to connecting an agent. Go in order or jump
          ahead, and tick each one off as you go.
        </p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.progressHead}>
            <p>Your progress</p>
            <span>
              {progress.count} of {progress.total}
            </span>
          </div>
          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.count}
            aria-label="Guide progress"
          >
            <span style={{ width: `${progress.total === 0 ? 0 : (progress.count / progress.total) * 100}%` }} />
          </div>

          {GUIDE_GROUPS.map(section => {
            const lessons = groupLessons(section.id)
            const sectionDone = groupDoneCount(section.id, done)
            return (
              <section key={section.id} className={styles.group}>
                <h2>
                  {section.label}
                  <span>
                    {sectionDone}/{lessons.length}
                  </span>
                </h2>
                <ul>
                  {lessons.map(item => {
                    const active = item.id === lesson.id
                    const complete = finished.has(item.id)
                    return (
                      <li key={item.id} className={active ? styles.rowActive : styles.row}>
                        <button
                          type="button"
                          className={complete ? styles.checkOn : styles.check}
                          aria-pressed={complete}
                          aria-label={
                            complete ? `Mark "${item.title}" as not done` : `Mark "${item.title}" as done`
                          }
                          onClick={() => toggle(item.id)}
                        >
                          {complete ? <Check size={12} strokeWidth={2.5} /> : null}
                        </button>
                        <button
                          type="button"
                          className={styles.lessonBtn}
                          aria-current={active ? 'true' : undefined}
                          onClick={() => openLesson(item.id, true)}
                        >
                          <span className={styles.num}>{lessonNumber(item.id)}</span>
                          <span>{item.title}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}

          <p className={styles.saved}>
            Progress is saved in this browser only.{' '}
            <button type="button" onClick={reset}>
              Reset progress
            </button>
          </p>
        </aside>

        <article id="guide-lesson" className={styles.lesson}>
          <p className={styles.kicker}>
            {group?.label} · Lesson {lessonNumber(lesson.id)} of {GUIDE_LESSONS.length}
          </p>
          <h2 className="serif">{lesson.title}</h2>
          <p className={styles.summary}>{lesson.summary}</p>
          {lesson.blocks.map(block => (
            <Block
              key={block.type === 'code' ? block.label : block.type === 'p' || block.type === 'note' ? block.text : block.items[0]}
              block={block}
            />
          ))}
          <div className={styles.actions}>
            <button
              type="button"
              className={finished.has(lesson.id) ? styles.doneBtn : styles.primary}
              aria-pressed={finished.has(lesson.id)}
              onClick={() => toggle(lesson.id)}
            >
              {finished.has(lesson.id) ? 'Completed' : 'Mark as complete'}
            </button>
            {upcoming ? (
              <button type="button" className={styles.next} onClick={() => openLesson(upcoming, true)}>
                Next lesson
              </button>
            ) : (
              <span className={styles.end}>That is the last lesson.</span>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
