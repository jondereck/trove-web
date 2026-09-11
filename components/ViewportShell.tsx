'use client'

import { usePathname } from 'next/navigation'
import MobileDesktopGate from '@/components/MobileDesktopGate'
import { isMobileAllowedPath } from '@/lib/mobileViewportAllow'

export default function ViewportShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const allowMobile = isMobileAllowedPath(pathname)

  if (allowMobile) {
    return <>{children}</>
  }

  return (
    <>
      <div className="desktopOnly">{children}</div>
      <MobileDesktopGate />
    </>
  )
}
