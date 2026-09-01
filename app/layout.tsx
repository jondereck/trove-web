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
        <div className="desktopOnly">{children}</div>
        <MobileDesktopGate />
      </body>
    </html>
  )
}
