'use client'

import { usePathname } from 'next/navigation'
import MobileDesktopGate from '@/components/MobileDesktopGate'
import { isMobileAllowedPath } from '@/lib/mobileViewportAllow'

export default function ViewportShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const allowMobile = isMobileAllowedPath(pathname)

  // Keep a stable DOM shape for hydration: always one wrapper + optional gate.
  return (
    <>
      <div className={allowMobile ? undefined : 'desktopOnly'} suppressHydrationWarning>
        {children}
      </div>
      {allowMobile ? null : <MobileDesktopGate />}
    </>
  )
}
