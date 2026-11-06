import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Instrument_Serif, Hanken_Grotesk } from 'next/font/google'
import CookieNotice from '@/components/CookieNotice'
import GuestImportDialog from '@/components/GuestImportDialog'
import InteractionSounds from '@/components/InteractionSounds'
import ViewportShell from '@/components/ViewportShell'
import './globals.css'
import { cn } from '@/lib/utils'
import { siteUrl } from '@/lib/env'

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
})

const site = siteUrl().replace(/\/$/, '') || 'https://web-trove.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(site.startsWith('http') ? site : `https://${site}`),
  title: {
    default: 'Trove',
    template: '%s · Trove',
  },
  description: 'Save links, notes, images, and videos. Browse your Trove Cloud library in the browser.',
  openGraph: {
    title: 'Trove',
    description: 'Save what matters — links, notes, images, and videos.',
    url: site,
    siteName: 'Trove',
    images: [{ url: '/trove-app-icon.png', width: 512, height: 512, alt: 'Trove' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Trove',
    description: 'Save what matters — links, notes, images, and videos.',
    images: ['/trove-app-icon.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '192x192', type: 'image/png' },
      { url: '/trove-app-icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/trove-app-icon.png',
    shortcut: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(serif.variable, sans.variable)}>
      <body>
        <InteractionSounds />
        <GuestImportDialog />
        <Suspense fallback={null}>
          <ViewportShell>{children}</ViewportShell>
        </Suspense>
        <CookieNotice />
      </body>
    </html>
  )
}
