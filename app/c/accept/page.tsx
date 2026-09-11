import { Suspense } from 'react'
import AcceptSharedInviteClient from './AcceptSharedInviteClient'

export default function AcceptSharedInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptSharedInviteClient />
    </Suspense>
  )
}
