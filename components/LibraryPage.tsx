'use client'

import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import SaveList from '@/components/SaveList'
import SummaryChips from '@/components/SummaryChips'
import { greetingForHour, weekdayLabel } from '@/lib/greeting'
import { countsByType } from '@/lib/libraryCore'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import styles from './LibraryPage.module.css'

export default function LibraryPage() {
  const { loading, error, saves, mode, importFileName, firstName } = useLibrarySaves()
  const counts = countsByType(saves)
  const hour = new Date().getHours()

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <p className={styles.date}>{weekdayLabel()}</p>
      <h1 className={`serif ${styles.greeting}`}>{greetingForHour(hour, firstName)}</h1>

      <div className={styles.insight}>
        {mode === 'cloud' && (
          <span>Your Cloud library · {counts.total} saves · read-only on web</span>
        )}
        {mode === 'demo' && <span>Demo library · read-only preview</span>}
        {mode === 'import' && <span>Imported file · read-only preview</span>}
      </div>

      {loading ? <p className={styles.status}>Loading library…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !error ? (
        <>
          <SummaryChips total={counts.total} notes={counts.notes} links={counts.links} />
          <SaveList saves={saves} />
        </>
      ) : null}
    </AppShell>
  )
}
