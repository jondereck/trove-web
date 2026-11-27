type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Returns true when the request is allowed. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(key, bucket)
  }
  bucket.count += 1
  return bucket.count <= max
}