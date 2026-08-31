type Props = {
  size?: number
  className?: string
  /** Full squircle app icon (default) or chest-only on accent tile for landing hero row */
  variant?: 'app' | 'mark'
}

export default function TroveMark({ size = 40, className, variant = 'app' }: Props) {
  const radius = Math.round(size * 0.22)

  if (variant === 'mark') {
    return (
      <span
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: 'var(--trove-accent)',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/trove-icon-mark.svg"
          alt=""
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          style={{ display: 'block' }}
        />
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/trove-app-icon.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: radius, display: 'block', flexShrink: 0 }}
      aria-hidden
    />
  )
}
