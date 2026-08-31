'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { signInWithOAuth, type OAuthProvider } from '@/lib/auth/oauth'
import { parseImportFile } from '@/lib/import'
import { writeImport } from '@/lib/importStore'
import { setDemoMode, setImportSession } from '@/lib/sessionMode'
import { BRAND } from '@/lib/branding'
import { cn } from '@/lib/utils'

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
    <div className="grid min-h-screen grid-cols-1 items-center gap-12 bg-linear-to-br from-background to-secondary px-5 py-8 md:grid-cols-[minmax(280px,1fr)_minmax(340px,460px)] md:gap-12 md:px-[clamp(20px,5vw,72px)] md:py-12 lg:gap-12">
      <section className="max-w-[560px]">
        <div className="mb-6 flex items-center gap-4">
          <div className="grid size-[52px] place-items-center rounded-xl bg-primary font-serif text-[28px] text-primary-foreground">
            T
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-[clamp(28px,4vw,36px)] font-normal leading-none">
                {BRAND.webName}
              </h1>
              <Badge variant="secondary" className="rounded-full bg-muted text-[11px] font-semibold tracking-wide text-primary">
                {BRAND.beta}
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground">{BRAND.tagline}</p>
          </div>
        </div>

        <p className="mb-7 text-lg leading-relaxed text-muted-foreground">
          Sign in with the same Trove Cloud account you use on mobile to browse your synced library on this device.
          You can also load a local export or explore a demo library.
        </p>

        <div className="mb-8 flex flex-wrap gap-3">
          <span className="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-muted-foreground">
            Google Play
          </span>
          <span className="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-muted-foreground">
            App Store
          </span>
        </div>

        <p className="text-[13px] leading-relaxed text-[var(--trove-muted)]">
          Trove Web is in active development. Same Supabase backend as the mobile app.
        </p>
      </section>

      <Card className="w-full max-w-[460px] justify-self-center rounded-3xl border-border py-7 shadow-[0_24px_60px_rgba(26,26,26,0.06)] ring-border/80 md:justify-self-auto">
        <CardContent className="space-y-0 px-7">
          <div className="flex gap-3.5 pb-1">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-xl">
              ☁
            </div>
            <div>
              <CardTitle className="mb-1.5 text-lg font-semibold">Sync from Trove Cloud</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Use the same account as Trove mobile. Your latest synced library loads automatically.
              </CardDescription>
            </div>
          </div>

          <form className="mt-4 grid gap-3" onSubmit={handleSignIn}>
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-[13px] font-normal text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 bg-background"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password" className="text-[13px] font-normal text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 bg-background"
              />
            </div>
            {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
            <Button type="submit" className="mt-1 h-11 w-full" disabled={authBusy}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-3.5 grid gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full bg-card"
              disabled={authBusy}
              onClick={() => handleOAuth('google')}
            >
              {oauthProvider === 'google' ? 'Redirecting…' : 'Sign in with Google'}
            </Button>
            <Button
              type="button"
              className={cn(
                'h-11 w-full border-transparent bg-foreground text-background hover:bg-foreground/90',
              )}
              disabled={authBusy}
              onClick={() => handleOAuth('apple')}
            >
              {oauthProvider === 'apple' ? 'Redirecting…' : 'Sign in with Apple'}
            </Button>
          </div>
        </CardContent>

        <Separator className="my-7" />

        <CardContent className="px-7">
          <Badge variant="secondary" className="mb-2.5 rounded-full bg-muted text-[11px] font-bold tracking-widest text-primary">
            LOAD DATA
          </Badge>
          <CardHeader className="gap-2 p-0">
            <CardTitle className="text-base font-semibold">Choose a file</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Select a Trove `.json` export to review saves locally in your browser.
            </CardDescription>
          </CardHeader>
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-3.5 text-sm">
            <span>{importLoading ? 'Reading file…' : 'Choose JSON, ZIP, or CSV'}</span>
            <input
              type="file"
              accept=".json,.zip,.csv"
              onChange={handleFile}
              disabled={importLoading}
              className="hidden"
            />
          </label>
          {importMessage ? <p className="mt-2.5 text-xs text-[var(--trove-muted)]">{importMessage}</p> : null}
          <p className="mt-2.5 text-xs text-[var(--trove-muted)]">
            Opens a local export — does not upload to Trove Cloud.
          </p>
        </CardContent>

        <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-7 text-xs text-[var(--trove-muted)]">
          <Separator />
          <span>OR</span>
          <Separator />
        </div>

        <CardContent className="px-7 pt-0">
          <Button type="button" variant="link" className="h-auto p-0 text-[15px] font-semibold" onClick={handleDemo}>
            Start with a demo →
          </Button>
          <p className="mt-2 text-[13px] text-muted-foreground">
            Explore sample links, notes, and images without signing in.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
