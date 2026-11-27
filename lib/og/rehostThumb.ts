import { createHash } from 'node:crypto'
import { neonPool } from '@/lib/neon/pool'
import { publicMediaUrl, putMedia } from '@/lib/neon/storage'
import { isCrawlerOnlyThumb, shouldRehostOgImage } from './crawlerThumb'
import { decodeOgText } from './decodeEntities'

const UA_FBCRAWLER = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

function extFromContentType(ct: string): string {
  if (ct.includes('png')) return 'png'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('gif')) return 'gif'
  return 'jpg'
}

export async function downloadRemoteImage(sourceUrl: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const imageUrl = decodeOgText(sourceUrl) ?? sourceUrl
  try {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': UA_FBCRAWLER,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    if (!contentType.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200 || buf.length > 10 * 1024 * 1024) return null
    return { bytes: buf, contentType }
  } catch {
    return null
  }
}

export async function rehostOgImageForUser(
  userId: string,
  sourceUrl: string,
): Promise<string | null> {
  if (!shouldRehostOgImage(sourceUrl)) return null
  const hash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 24)
  const pathPattern = `${userId}/og/${hash}.`
  const prior = await neonPool().query<{ path: string }>(
    "select path from public.media_objects where path like $1 and user_id = $2::uuid limit 1",
    [`${pathPattern}%`, userId],
  )
  const priorPath = prior.rows[0]?.path
  if (priorPath) {
    const url = publicMediaUrl(priorPath)
    if (url) return url
  }
  const downloaded = await downloadRemoteImage(sourceUrl)
  if (!downloaded) return null
  const ext = extFromContentType(downloaded.contentType)
  const path = `${userId}/og/${hash}.${ext}`
  const stored = await putMedia(path, downloaded.bytes, downloaded.contentType)
  if (!stored) return null
  await neonPool().query(
    `insert into public.media_objects (path, content_type, bytes, user_id)
     values ($1, $2, ''::bytea, $3::uuid)
     on conflict (path) do update set content_type = excluded.content_type`,
    [path, downloaded.contentType, userId],
  )
  return publicMediaUrl(path)
}

export function stripUnusableOgImage(image: string | undefined): string | undefined {
  if (!image) return undefined
  if (isCrawlerOnlyThumb(image)) return undefined
  return decodeOgText(image) ?? image
}