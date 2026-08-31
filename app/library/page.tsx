import { Suspense } from 'react'
import LibraryPage from '@/components/LibraryPage'
import TroveLoader from '@/components/TroveLoader'

export default function Page() {
  return (
    <Suspense fallback={<TroveLoader label="Loading library…" />}>
      <LibraryPage />
    </Suspense>
  )
}
