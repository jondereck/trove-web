import type { Metadata } from 'next'
import { Instrument_Serif, Hanken_Grotesk } from 'next/font/google'
import InteractionSounds from '@/components/InteractionSounds'
import MobileDesktopGate from '@/components/MobileDesktopGate'
import './globals.css'
import { cn } from '@/lib/utils'

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

const sans = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Trove',
  description: 'Browse your Trove Cloud library in the browser.',
  icons: {
    icon: [
      { url: '/trove-icon-mark.svg', type: 'image/svg+xml' },
      { url: '/trove-icon-mark.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/trove-app-icon.png',
    shortcut: '/trove-icon-mark.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(serif.variable, sans.variable)}>
      <body>
        <InteractionSounds />
        <div className="desktopOnly">{children}</div>
        <MobileDesktopGate />
      </body>
    </html>
  )
}
