import { Suspense } from 'react'
import type { Metadata } from 'next'
import GuidePage from '@/components/GuidePage'

export const metadata: Metadata = {
  title: 'Guide · Trove',
  description: 'Short lessons for Trove, from your first save to connecting an agent with MCP.',
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GuidePage />
    </Suspense>
  )
}
