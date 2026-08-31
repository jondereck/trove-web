import styles from './UserAvatar.module.css'

type Props = {
  imageUrl?: string | null
  initials: string
  size?: number
}

export default function UserAvatar({ imageUrl, initials, size = 34 }: Props) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        className={styles.image}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span className={styles.initials} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </span>
  )
}
