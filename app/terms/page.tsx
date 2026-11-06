import type { Metadata } from 'next'
import LegalDocument from '@/components/LegalDocument'
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE } from '@/lib/legalCopy'

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'Terms for using the Trove phone app and Trove Web.',
}

export default function TermsPage() {
  return (
    <LegalDocument
      title={TERMS_TITLE}
      intro={TERMS_INTRO}
      sections={TERMS_SECTIONS}
    />
  )
}
