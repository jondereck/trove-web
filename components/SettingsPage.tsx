'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TroveLoader from '@/components/TroveLoader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import {
  clearDemoMode,
  clearImportSession,
  readSoundsEnabled,
  writeSoundsEnabled,
} from '@/lib/sessionMode'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [sounds, setSounds] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setSounds(readSoundsEnabled())
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/')
        return
      }
      setEmail(user.email ?? null)
      setLoading(false)
    })
  }, [router])

  const signOut = async () => {
    clearDemoMode()
    await clearImportSession()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <AppShell mode="cloud">
        <TroveLoader label="Loading settings…" />
      </AppShell>
    )
  }

  return (
    <AppShell mode="cloud">
      <h1 className={`serif ${styles.title}`}>Settings</h1>
      <p className={styles.subtitle}>Trove Web · read-only Cloud library on this device</p>

      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in with your Trove Cloud account.</CardDescription>
        </CardHeader>
        <CardContent className={styles.row}>
          <span className={styles.label}>Email</span>
          <span>{email ?? '—'}</span>
        </CardContent>
      </Card>

      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className={styles.switchRow}>
          <div>
            <p className={styles.switchLabel}>Interaction sounds</p>
            <p className={styles.switchHint}>Subtle taps when wired in a later update.</p>
          </div>
          <Switch
            checked={sounds}
            onCheckedChange={value => {
              setSounds(value)
              writeSoundsEnabled(value)
            }}
          />
        </CardContent>
      </Card>

      <Card className={styles.card}>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>
            Trove Web is in active development. Vault, editing, and Quick Save arrive in later phases.
          </CardDescription>
        </CardHeader>
      </Card>

      <Separator className={styles.sep} />

      <Button variant="outline" onClick={signOut}>
        Sign out
      </Button>
    </AppShell>
  )
}
