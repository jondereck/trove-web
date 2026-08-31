'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Cloud, CloudDownload, FileText, Info, Sparkle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signInWithOAuth, type OAuthProvider } from '@/lib/auth/oauth'
import { parseImportFile } from '@/lib/import'
import { writeImport } from '@/lib/importStore'
import { setDemoMode, setImportSession } from '@/lib/sessionMode'
import { BRAND } from '@/lib/branding'
import TroveMark from '@/components/TroveMark'
import styles from './LandingPage.module.css'

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c3.42-3.15 5.384-7.784 5.384-13.316z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden>
      <path d="M13.2 9.48c-.02-2.09 1.71-3.09 1.78-3.14-0.97-1.41-2.48-1.6-3.01-1.62-1.28-.13-2.5.75-3.15.75-.65 0-1.65-.74-2.72-.72-1.4.02-2.69.81-3.41 2.06-1.45 2.52-.37 6.25 1.04 8.3.69 1 1.51 2.12 2.59 2.08 1.04-.04 1.43-.67 2.69-.67 1.26 0 1.61.67 2.71.65 1.12-.02 1.83-1.02 2.51-2.03.79-1.15 1.11-2.27 1.13-2.33-.02-.01-2.17-.83-2.19-3.3zm-2.06-6.07c.57-.69.95-1.65.85-2.61-.82.03-1.81.55-2.4 1.24-.53.61-1 1.6-.87 2.54.92.07 1.86-.47 2.42-1.17z" />
    </svg>
  )
}

function PlayStoreLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M3.2 2.1 13.3 12 3.2 21.9A1.8 1.8 0 0 1 2 20.7V3.3a1.8 1.8 0 0 1 1.2-1.2z" />
      <path fill="#34A853" d="M13.3 12 17.6 16.3 3.2 21.9z" />
      <path fill="#FBBC05" d="M21.4 10.9 17.6 7.7 13.3 12l4.3 4.3 3.8-3.1a1.2 1.2 0 0 0 0-2.3z" />
      <path fill="#EA4335" d="M13.3 12 17.6 7.7 3.2 2.1z" />
    </svg>
  )
}

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

          <div className={styles.storeRow}>
            <span className={styles.storeBadge}>
              <PlayStoreLogo />
              Google Play
            </span>
            <span className={styles.storeBadge}>
              <AppleLogo />
              App Store
            </span>
          </div>
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
            <GoogleLogo />
            {oauthProvider === 'google' ? 'Redirecting…' : 'Sign in with Google'}
          </button>
          <button
            type="button"
            className={styles.oauthBtnDark}
            disabled={authBusy}
            onClick={() => handleOAuth('apple')}
          >
            <AppleLogo />
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
