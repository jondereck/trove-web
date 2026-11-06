import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/env'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl().replace(/\/$/, '')
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/guide`, changeFrequency: 'monthly', priority: 0.5 },
  ]
}
