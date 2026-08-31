'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AppShell from '@/components/AppShell'
import DemoBanner from '@/components/DemoBanner'
import TroveLoader from '@/components/TroveLoader'
import { getDemoLibrary } from '@/lib/demo'
import { readImport } from '@/lib/importStore'
import { fetchCloudSavesForStats } from '@/lib/library'
import { filterLibrarySaves } from '@/lib/libraryCore'
import { createClient } from '@/lib/supabase/client'
import { getImportSession, getSessionMode } from '@/lib/sessionMode'
import {
  activityByMonth,
  hasEnoughStats,
  savesByType,
  topTags,
} from '@/lib/stats'
import { useLibrarySaves } from '@/lib/useLibrarySaves'
import type { Save } from '@/lib/types'
import styles from './StatisticsPage.module.css'

const CHART_COLORS = ['#c0613c', '#d48463', '#e8a88f', '#f0c4b4', '#8b5cf6', '#3b82f6']

export default function StatisticsPage() {
  const { mode, importFileName, loading: sessionLoading } = useLibrarySaves()
  const [saves, setSaves] = useState<Save[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sessionLoading) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const sessionMode = getSessionMode()
        if (sessionMode === 'demo') {
          if (!cancelled) {
            setSaves(getDemoLibrary().saves)
            setLoading(false)
          }
          return
        }

        const imported = getImportSession()
        if (sessionMode === 'import' && imported) {
          const record = await readImport(imported.id)
          if (!record) throw new Error('Import expired. Choose the file again.')
          if (!cancelled) {
            setSaves(record.saves)
            setLoading(false)
          }
          return
        }

        const supabase = createClient()
        const rows = await fetchCloudSavesForStats(supabase)
        if (!cancelled) {
          setSaves(rows)
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load statistics.')
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [sessionLoading])

  const librarySaves = useMemo(() => filterLibrarySaves(saves), [saves])
  const typeRows = useMemo(() => savesByType(saves), [saves])
  const monthRows = useMemo(() => activityByMonth(saves), [saves])
  const tagRows = useMemo(() => topTags(saves), [saves])
  const enough = hasEnoughStats(saves)

  return (
    <AppShell mode={mode} importFileName={importFileName}>
      {mode === 'demo' ? <DemoBanner /> : null}

      <header className={styles.header}>
        <p className={styles.kicker}>INSIGHTS</p>
        <h1 className={`serif ${styles.title}`}>Statistics</h1>
        <p className={styles.subtitle}>
          {librarySaves.length} saves in your library
          {mode === 'import' ? ' · local import' : mode === 'demo' ? ' · demo data' : ' · Trove Cloud'}
        </p>
      </header>

      {loading || sessionLoading ? <TroveLoader label="Loading statistics…" /> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && !sessionLoading && !error ? (
        !enough ? (
          <div className={styles.empty}>
            <p>Not enough data yet</p>
            <span>Add at least five saves to your library to see charts here.</span>
          </div>
        ) : (
          <div className={styles.grid}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Saves by type</h2>
              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={typeRows}
                      dataKey="count"
                      nameKey="label"
                      innerRadius={56}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {typeRows.map((row, index) => (
                        <Cell key={row.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className={styles.legend}>
                {typeRows.map((row, index) => (
                  <li key={row.type}>
                    <span
                      className={styles.legendDot}
                      style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    {row.label} · {row.count}
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Activity · last 6 months</h2>
              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#c0613c" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className={`${styles.card} ${styles.cardWide}`}>
              <h2 className={styles.cardTitle}>Top tags</h2>
              {tagRows.length === 0 ? (
                <p className={styles.muted}>No tags yet.</p>
              ) : (
                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height={Math.max(180, tagRows.length * 34)}>
                    <BarChart data={tagRows} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e6e0" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="tag"
                        width={90}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#c0613c" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>
        )
      ) : null}
    </AppShell>
  )
}
