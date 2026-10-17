// Per-API-key token-bucket rate limiter. In-memory, per Nitro instance —
// sufficient for a single-node deploy; swap for Redis if the server ever
// scales horizontally.

interface Bucket {
  tokens: number
  updatedAt: number
}

const buckets = new Map<string, Bucket>()

// Returns seconds until the next token is available, or 0 if the request
// is allowed. `rpm` is requests per minute.
export function checkRateLimit(keyId: string, rpm: number): number {
  const now = Date.now()
  const bucket = buckets.get(keyId) ?? { tokens: rpm, updatedAt: now }

  const elapsed = (now - bucket.updatedAt) / 1000
  bucket.tokens = Math.min(rpm, bucket.tokens + elapsed * (rpm / 60))
  bucket.updatedAt = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    buckets.set(keyId, bucket)
    return 0
  }

  buckets.set(keyId, bucket)
  return Math.ceil((1 - bucket.tokens) / (rpm / 60))
}
