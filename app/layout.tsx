import type { Metadata } from 'next'
import { Instrument_Serif, Hanken_Grotesk } from 'next/font/google'
import InteractionSounds from '@/components/InteractionSounds'
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
  title: 'Trove Web',
  description: 'Browse your Trove Cloud library in the browser.',
  icons: {
    icon: '/trove-app-icon.svg',
    apple: '/trove-app-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn(serif.variable, sans.variable)}>
      <body>
        <InteractionSounds />
        {children}
      </body>
    </html>
  )
}
