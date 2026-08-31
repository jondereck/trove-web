import TrackerDetailPage from '@/components/TrackerDetailPage'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <TrackerDetailPage id={id} />
}
