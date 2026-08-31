'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Cloud, CloudDownload, FileText, Info, Sparkle } from 'lucide-react'
import { SiApple, SiGoogle } from 'react-icons/si'
import { createClient } from '@/lib/supabase/client'
import { signInWithOAuth, type OAuthProvider } from '@/lib/auth/oauth'
import { parseImportFile } from '@/lib/import'
import { writeImport } from '@/lib/importStore'
import { setDemoMode, setImportSession } from '@/lib/sessionMode'
import { playSuccess } from '@/lib/sounds'
import { BRAND } from '@/lib/branding'
import StoreBadgeLinks from '@/components/StoreBadgeLinks'
import TroveMark from '@/components/TroveMark'
import styles from './LandingPage.module.css'

function PeachWaves() {
  return (
    <div className={styles.wavesWrap} aria-hidden>
      <svg
        className={styles.waves}
        viewBox="0 0 1200 520"
        preserveAspectRatio="xMinYMax meet"
      >
        <defs>
          <linearGradient id="waveFillA" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f3e4dc" stopOpacity="0.3" />
            <stop offset="55%" stopColor="#f3e4dc" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f3e4dc" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveFillB" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#edd4c8" stopOpacity="0.18" />
            <stop offset="50%" stopColor="#edd4c8" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#edd4c8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveFillC" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f6ece6" stopOpacity="0.24" />
            <stop offset="60%" stopColor="#f6ece6" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#f6ece6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveStrokeFade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e8c8b8" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#e8c8b8" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#e8c8b8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          fill="url(#waveFillA)"
          d="M0,320 C180,220 280,380 460,280 C600,200 680,360 900,300 C1020,260 1100,340 1200,310 L1200,520 L0,520 Z"
        />
        <path
          fill="url(#waveFillB)"
          d="M0,400 C140,340 240,460 400,400 C560,340 660,440 860,390 C980,360 1080,420 1200,400 L1200,520 L0,520 Z"
        />
        <path
          fill="url(#waveFillC)"
          d="M0,460 C120,420 200,500 360,470 C520,440 620,500 820,480 C960,460 1080,500 1200,490 L1200,520 L0,520 Z"
        />
        <path
          fill="none"
          stroke="url(#waveStrokeFade)"
          strokeWidth="1"
          d="M40,430 C160,360 240,470 380,400 C520,330 620,430 820,380 C960,340 1040,400 1200,370"
        />
        <path
          fill="none"
          stroke="url(#waveStrokeFade)"
          strokeWidth="0.9"
          d="M20,470 C140,410 230,500 370,450 C510,400 620,480 820,430 C980,390 1080,450 1200,420"
        />
        <circle cx="248" cy="404" r="2.5" fill="#c0613c" fillOpacity="0.28" />
      </svg>
      <Sparkle className={styles.waveSparkle} strokeWidth={0} />
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [importLoading, setImportLoading] = useState(false)

  useEffect(() => {
    const authError = searchParams.get('error')
    if (authError) setError(authError)
  }, [searchParams])

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
    playSuccess()
    router.push('/library')
    router.refresh()
  }

  const handleOAuth = async (provider: OAuthProvider) => {
    setError('')
    setOauthProvider(provider)
    const { error: oauthError } = await signInWithOAuth(provider)
    if (oauthError) {
      setOauthProvider(null)
      setError(oauthError)
    }
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
    setImportLoading(true)
    try {
      const parsed = await parseImportFile(file)
      const importId = await writeImport(file.name, parsed.saves, parsed.collections)
      setImportSession(file.name, importId)
      router.push('/library')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that file.')
    } finally {
      setImportLoading(false)
      event.target.value = ''
    }
  }

  const authBusy = loading || oauthProvider !== null

  return (
    <div className={styles.page} data-landing-page>
      <PeachWaves />

      <p className={styles.wordmark}>{BRAND.name}</p>

      <div className={styles.shell}>
        <section className={styles.left}>
          <div className={styles.hero}>
          <div className={styles.titleRow}>
            <TroveMark size={72} />
            <h1 className={styles.productName}>{BRAND.webName}</h1>
            <span className={styles.beta}>{BRAND.beta}</span>
          </div>

          <p className={`serif ${styles.tagline}`}>{BRAND.tagline}.</p>

          <div className={styles.bodyCopy}>
            <p>
              Sign in with the same Trove Cloud account you use on mobile to browse your synced
              library on this device.
            </p>
            <p>You can also load a local export or explore a demo library.</p>
          </div>

          <StoreBadgeLinks layout="row" className={styles.storeRow} />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHead}>
          <div className={styles.iconCircle}>
            <Cloud size={20} strokeWidth={2} />
          </div>
          <div>
            <h2>Sync from Trove Cloud</h2>
            <p>
              Use the same account as Trove mobile. Your latest synced library loads
              automatically.
            </p>
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
          <button type="submit" className={styles.primaryBtn} disabled={authBusy}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.oauthRow}>
          <button
            type="button"
            className={styles.oauthBtn}
            disabled={authBusy}
            onClick={() => handleOAuth('google')}
          >
            <SiGoogle size={18} aria-hidden />
            {oauthProvider === 'google' ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          <button
            type="button"
            className={styles.oauthBtnDark}
            disabled={authBusy}
            onClick={() => handleOAuth('apple')}
          >
            <SiApple size={18} aria-hidden />
            {oauthProvider === 'apple' ? 'Redirecting…' : 'Sign in with Apple'}
          </button>
        </div>

        <div className={styles.divider} />

        <p className={styles.loadLabel}>Load data</p>

        <div className={styles.loadHead}>
          <div className={styles.loadIcon}>
            <CloudDownload size={18} strokeWidth={2} />
          </div>
          <p>Choose a file. Select a Trove export to review saves locally in your browser.</p>
        </div>

        <label className={styles.filePick}>
          <FileText size={18} strokeWidth={1.75} aria-hidden />
          <span>{importLoading ? 'Reading file…' : 'Choose JSON, ZIP, or CSV'}</span>
          <input
            type="file"
            accept=".json,.zip,.csv"
            onChange={handleFile}
            disabled={importLoading}
          />
        </label>
        {importMessage ? <p className={styles.hint}>{importMessage}</p> : null}
        <p className={styles.hint}>Opens a local export — does not upload to Trove Cloud.</p>

        <div className={styles.orRow}>
          <span className={styles.orLine} />
          <span>OR</span>
          <span className={styles.orLine} />
        </div>

        <div className={styles.demoRow}>
          <Info size={16} strokeWidth={2} aria-hidden />
          <button type="button" className={styles.demoLink} onClick={handleDemo}>
            Start with a demo →
          </button>
        </div>
        <p className={styles.demoHint}>
          Explore sample links, notes, and images without signing in.
        </p>
      </section>
      </div>
    </div>
  )
}
