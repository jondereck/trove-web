import Link from 'next/link'

export default function DemoBanner() {
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--trove-accent-border)] bg-muted px-4 py-3 text-sm">
      <strong>Demo data</strong>
      <span>These saves are sample content, not your account.</span>
      <Link href="/" className="font-semibold text-primary">
        Sign in for your library
      </Link>
    </div>
  )
}
