type Props = {
  size?: number
  className?: string
  /** Kept for call sites; transparent chest mark only */
  variant?: 'app' | 'mark'
}

export default function TroveMark({ size = 40, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/trove-app-icon.png"
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden
    />
  )
}
