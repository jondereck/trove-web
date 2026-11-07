import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mediaObjectPublicUrl, readMediaPublicBase } from './mediaUrl'

export { mediaObjectPublicUrl, readMediaPublicBase, rewriteProxiedMediaUrl } from './mediaUrl'

export function mediaBucket(): string {
  return process.env.NEON_STORAGE_BUCKET ?? 'media'
}

export function publicMediaUrl(path: string): string | null {
  return mediaObjectPublicUrl(path, readMediaPublicBase())
}

export function storageClient(): S3Client | null {
  const endpoint = process.env.NEON_STORAGE_ENDPOINT
  const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY_ID
  const secretAccessKey = process.env.NEON_STORAGE_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: process.env.NEON_STORAGE_REGION ?? 'ap-southeast-1',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
}

export async function putMedia(path: string, bytes: Buffer, contentType: string): Promise<boolean> {
  const client = storageClient()
  if (!client) return false
  await client.send(new PutObjectCommand({
    Bucket: mediaBucket(),
    Key: path,
    Body: bytes,
    ContentType: contentType,
  }))
  return true
}

export async function getMedia(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const client = storageClient()
  if (!client) return null
  try {
    const result = await client.send(new GetObjectCommand({
      Bucket: mediaBucket(),
      Key: path,
    }))
    const body = await result.Body?.transformToByteArray()
    if (!body) return null
    return {
      bytes: body,
      contentType: result.ContentType ?? 'application/octet-stream',
    }
  } catch (error) {
    if (error instanceof NoSuchKey) return null
    const name = error instanceof Error ? error.name : ''
    if (name === 'NoSuchKey' || name === 'NotFound') return null
    throw error
  }
}

