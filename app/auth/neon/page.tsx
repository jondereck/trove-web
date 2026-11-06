import { neonAuthUrl } from '@/lib/neon/env'
import { authOrigin } from '@/lib/neon/accounts'
import { NeonGoogleFinish } from '@/components/NeonGoogleFinish'

export default async function NeonAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const params = await searchParams
  return (
    <NeonGoogleFinish
      authUrl={neonAuthUrl() || authOrigin()}
      fromMobile={params.from === 'mobile'}
    />
  )
}
