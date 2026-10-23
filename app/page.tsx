import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { safeNextPath } from '@/lib/auth/safeNext'
import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = safeNextPath((await searchParams).next)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect(next ?? '/library')
  return (
    <Suspense fallback={null}>
      <LandingPage />
    </Suspense>
  )
}
