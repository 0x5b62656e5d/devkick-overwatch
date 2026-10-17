import { getDb } from './db'
import { checkRateLimit } from './rate-limit'

// Shared helpers for the /api/v1 surface: auth, errors, CORS, responses.

export type Scope = 'ingest' | 'read' | 'write'

export interface AuthContext {
  tenantId: string
  keyId: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public headers?: Record<string, string>,
  ) {
    super(message)
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Api-Key',
  'Access-Control-Max-Age': '86400',
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { ...CORS_HEADERS, ...init.headers },
  })
}

export function toResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return json(
      { error: { code: err.code, message: err.message } },
      { status: err.status, headers: err.headers },
    )
  }
  if (err instanceof Error && err.message.startsWith('DATABASE_URL')) {
    return json(
      { error: { code: 'database_unconfigured', message: err.message } },
      { status: 503 },
    )
  }
  console.error('unhandled api error:', err)
  return json(
    { error: { code: 'internal_error', message: 'internal server error' } },
    { status: 500 },
  )
}

export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ApiError(400, 'invalid_json', 'request body must be valid JSON')
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Authenticates the request via `Authorization: Bearer <key>` or the
// `X-Api-Key` header, checks the required scope, and applies the key's
// rate limit. Throws ApiError on failure.
export async function authenticate(
  request: Request,
  scope: Scope,
): Promise<AuthContext> {
  const key = extractKey(request)
  if (!key) {
    throw new ApiError(
      401,
      'missing_api_key',
      'provide an API key via Authorization: Bearer <key> or X-Api-Key',
    )
  }

  const hash = await sha256Hex(key)
  const db = getDb()
  const rows = await db<
    { key_id: string; tenant_id: string; scopes: string[]; rate_limit_rpm: number }[]
  >`select * from lookup_api_key(${hash})`

  const row = rows[0]
  if (!row) {
    throw new ApiError(401, 'invalid_api_key', 'API key is invalid or revoked')
  }
  if (!row.scopes.includes(scope)) {
    throw new ApiError(
      403,
      'insufficient_scope',
      `API key lacks the '${scope}' scope`,
    )
  }

  const retryAfter = checkRateLimit(row.key_id, row.rate_limit_rpm)
  if (retryAfter > 0) {
    throw new ApiError(429, 'rate_limited', 'rate limit exceeded', {
      'Retry-After': String(retryAfter),
    })
  }

  // Fire-and-forget usage timestamp (SECURITY DEFINER — works for
  // non-owner roles that can't see api_keys rows under RLS).
  db`select touch_api_key(${row.key_id})`.catch(() => {})

  return { tenantId: row.tenant_id, keyId: row.key_id }
}

function extractKey(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim() || null
  return request.headers.get('x-api-key')
}
