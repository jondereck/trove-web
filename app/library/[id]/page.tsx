import SaveDetailPage from '@/components/SaveDetailPage'

type Props = {
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params
  return <SaveDetailPage id={id} />
}
