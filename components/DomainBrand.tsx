'use client'

import { ExternalLink } from 'lucide-react'
import { brandTileForDomain, faviconUrl, saveCardDomain } from '@/lib/linkBrand'
import styles from './DomainBrand.module.css'

type Props = {
  url?: string
  domain?: string
  onClick?: (event: React.MouseEvent) => void
}

export default function DomainBrand({ url, domain: domainProp, onClick }: Props) {
  const domain = domainProp ?? saveCardDomain(url)
  if (!domain) return null

  const tile = brandTileForDomain(domain)
  const content = (
    <>
      <span className={styles.tile} style={{ backgroundColor: tile.bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={faviconUrl(domain)} alt="" className={styles.favicon} />
      </span>
      <span className={styles.domain}>{domain}</span>
      {onClick ? <ExternalLink size={14} strokeWidth={2} className={styles.external} aria-hidden /> : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        className={styles.button}
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
          onClick?.(event)
        }}
      >
        {content}
      </button>
    )
  }

  return <span className={styles.row}>{content}</span>
}
