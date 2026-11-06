import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_TITLE } from '@/lib/legalCopy'

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What Trove stores, how Cloud sync and cookies work, and how to reach us.',
}

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={PRIVACY_TITLE}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
    />
  )
}
