'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseBackupJson } from '@/lib/importJson'
import { setDemoMode, setImportSession } from '@/lib/sessionMode'
import { BRAND } from '@/lib/branding'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (signInError) {
      setLoading(false)
      setError(signInError.message)
      return
    }
    router.push('/library')
    router.refresh()
  }

  const handleDemo = () => {
    setDemoMode()
    router.push('/library')
  }

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportMessage('')
    setError('')
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'json') {
      setImportMessage('Full zip and CSV import coming soon — use a Trove JSON export for now.')
      return
    }
    try {
      const raw = await file.text()
      const parsed = parseBackupJson(raw)
      setImportSession(file.name, JSON.stringify(parsed.saves))
      router.push('/library')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.left}>
        <div className={styles.brandRow}>
          <div className={styles.logoMark}>T</div>
          <div>
            <div className={styles.titleRow}>
              <h1 className={`serif ${styles.wordmark}`}>{BRAND.webName}</h1>
              <span className={styles.beta}>{BRAND.beta}</span>
            </div>
            <p className={styles.tagline}>{BRAND.tagline}</p>
          </div>
        </div>
        <p className={styles.lead}>
          Sign in with the same Trove Cloud account you use on mobile to browse your synced library on this device.
          You can also load a local export or explore a demo library.
        </p>
        <div className={styles.storeRow}>
          <span className={styles.storeBadge}>Google Play</span>
          <span className={styles.storeBadge}>App Store</span>
        </div>
        <p className={styles.footerNote}>
          Trove Web is in active development. Same Supabase backend as the mobile app.
        </p>
      </section>

      <section className={styles.card}>
        <div className={styles.cardSection}>
          <div className={styles.sectionHead}>
            <div className={styles.iconTile}>☁</div>
            <div>
              <h2>Sync from Trove Cloud</h2>
              <p>Use the same account as Trove mobile. Your latest synced library loads automatically.</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSignIn}>
            <label className={styles.label}>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.input}
              />
            </label>
            <label className={styles.label}>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={styles.input}
              />
            </label>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className={styles.oauthRow}>
            <button type="button" className={styles.oauthBtn} disabled title="Coming soon">
              Sign in with Google <span className={styles.soon}>Soon</span>
            </button>
            <button type="button" className={styles.oauthBtnDark} disabled title="Coming soon">
              Sign in with Apple <span className={styles.soonDark}>Soon</span>
            </button>
          </div>
        </div>

        <div className={styles.cardSection}>
          <span className={styles.pill}>LOAD DATA</span>
          <h3>Choose a file</h3>
          <p>Select a Trove `.json` export to review saves locally in your browser.</p>
          <label className={styles.filePick}>
            <span>Choose JSON, ZIP, or CSV</span>
            <input type="file" accept=".json,.zip,.csv" onChange={handleFile} />
          </label>
          {importMessage ? <p className={styles.hint}>{importMessage}</p> : null}
          <p className={styles.hint}>Opens a local export — does not upload to Trove Cloud.</p>
        </div>

        <div className={styles.orRow}>
          <span className={styles.orLine} />
          <span>OR</span>
          <span className={styles.orLine} />
        </div>

        <button type="button" className={styles.demoLink} onClick={handleDemo}>
          Start with a demo →
        </button>
        <p className={styles.demoHint}>Explore sample links, notes, and images without signing in.</p>
      </section>
    </div>
  )
}
