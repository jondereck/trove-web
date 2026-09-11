import SharedCollectionPage from '@/components/SharedCollectionPage'
import { fetchSharedCollection, isSharedCollectionToken } from '@/lib/sharedCollection'

type Props = { params: Promise<{ token: string }> }

export default async function Page({ params }: Props) {
  const { token } = await params
  if (!isSharedCollectionToken(token)) {
    return <SharedCollectionPage unavailable />
  }
  const data = await fetchSharedCollection(token)
  if (!data) return <SharedCollectionPage unavailable />
  return <SharedCollectionPage data={data} token={token} />
}
