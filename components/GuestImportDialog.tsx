'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  currentGuestImportPrompt,
  declineWebGuestImport,
  ensureWebGuestImport,
  importWebGuestDailyTasks,
  restoreWebGuestDailyTasks,
  subscribeGuestImportPrompt,
} from '@/lib/guestImportSession'
import {
  holdGuestDailyPushFor,
  setGuestSessionUserId,
} from '@/lib/guestImportGate'
import {
  guestImportDoneMessage,
  guestImportPromptBody,
  type GuestImportFacts,
} from '@/lib/guestImportPrompt'
import styles from './GuestImportDialog.module.css'

type Phase =
  | { kind: 'hidden' }
  | { kind: 'prompt'; facts: GuestImportFacts }
  | { kind: 'running'; completed: number; total: number; percent: number }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string; facts: GuestImportFacts }

export default function GuestImportDialog() {
  const [phase, setPhase] = useState<Phase>({ kind: 'hidden' })
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    const existing = currentGuestImportPrompt()
    if (existing) setPhase({ kind: 'prompt', facts: existing })
    return subscribeGuestImportPrompt(facts => {
      setPhase(current => (current.kind === 'running' ? current : { kind: 'prompt', facts }))
    })
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user.id ?? null
      setGuestSessionUserId(userId)
      if (!userId) {
        if (event === 'SIGNED_OUT') restoreWebGuestDailyTasks()
        setPhase({ kind: 'hidden' })
        return
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        holdGuestDailyPushFor(userId)
        void ensureWebGuestImport(userId)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (phase.kind === 'hidden') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const current = phaseRef.current
      if (current.kind === 'running') return
      if (current.kind === 'done') {
        setPhase({ kind: 'hidden' })
        return
      }
      if (current.kind === 'prompt' || current.kind === 'error') {
        event.preventDefault()
        void declineWebGuestImport().finally(() => setPhase({ kind: 'hidden' }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase.kind])

  const decline = useCallback(() => {
    if (phaseRef.current.kind === 'running') return
    void declineWebGuestImport()
      .then(() => setPhase({ kind: 'hidden' }))
      .catch(() => {
        const current = phaseRef.current
        const facts = current.kind === 'prompt' || current.kind === 'error'
          ? current.facts
          : null
        if (!facts) {
          setPhase({ kind: 'hidden' })
          return
        }
        setPhase({
          kind: 'error',
          facts,
          message: 'Couldn\'t keep this browser\'s copy separate. Try again.',
        })
      })
  }, [])

  const runImport = useCallback((facts: GuestImportFacts) => {
    setPhase({ kind: 'running', completed: 0, total: 1, percent: 0 })
    void importWebGuestDailyTasks(progress => {
      setPhase({
        kind: 'running',
        completed: progress.completed,
        total: progress.total,
        percent: progress.percent,
      })
    })
      .then(() => {
        setPhase({
          kind: 'done',
          message: guestImportDoneMessage({ saves: 0, collections: 0, dailyTasks: true }),
        })
      })
      .catch(() => {
        setPhase({
          kind: 'error',
          facts,
          message: 'Import stopped. This account was not fully updated. Daily tasks on this browser were kept.',
        })
      })
  }, [])

  if (phase.kind === 'hidden') return null

  const title = phase.kind === 'running'
    ? 'Importing'
    : phase.kind === 'done'
      ? 'Imported'
      : phase.kind === 'error'
        ? 'Import didn\'t finish'
        : 'Import from this browser?'

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.card} role="dialog" aria-modal="true" aria-labelledby="guest-import-title">
        <h2 id="guest-import-title" className={styles.title}>{title}</h2>
        {phase.kind === 'prompt' ? (
          <p className={styles.body}>{guestImportPromptBody(phase.facts)}</p>
        ) : null}
        {phase.kind === 'running' ? (
          <>
            <p className={styles.body}>{phase.completed} of {phase.total}</p>
            <div
              className={styles.track}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={phase.percent}
              aria-label="Import progress"
            >
              <div className={styles.fill} style={{ width: `${phase.percent}%` }} />
            </div>
          </>
        ) : null}
        {phase.kind === 'done' || phase.kind === 'error' ? (
          <p className={styles.body}>{phase.message}</p>
        ) : null}
        {phase.kind === 'prompt' ? (
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={decline}>
              Don&apos;t import
            </button>
            <button type="button" className={styles.primary} onClick={() => runImport(phase.facts)}>
              Import
            </button>
          </div>
        ) : null}
        {phase.kind === 'error' ? (
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={decline}>
              Don&apos;t import
            </button>
            <button type="button" className={styles.primary} onClick={() => runImport(phase.facts)}>
              Try again
            </button>
          </div>
        ) : null}
        {phase.kind === 'done' ? (
          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={() => setPhase({ kind: 'hidden' })}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
