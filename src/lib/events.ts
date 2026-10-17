import type postgres from 'postgres'
import { ApiError } from './api'
import { withTenant } from './db'

// Ingested event model: browser errors and user-submitted reports.
// Events deduplicate on (tenant_id, fingerprint) — repeats increment
// `occurrences` and move `last_seen_at` rather than inserting rows.

export const EVENT_KINDS = ['browser-error', 'user-report'] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export interface EventInput {
  kind: EventKind
  message: string
  stack?: string
  url?: string
  errorType?: string
  email?: string
  release?: string
  environment?: string
  occurredAt?: Date
  metadata: Record<string, unknown>
}

export interface EventRow {
  id: string
  kind: EventKind
  fingerprint: string
  message: string
  stack: string | null
  url: string | null
  release: string | null
  environment: string | null
  metadata: Record<string, unknown>
  occurredAt: string
  firstSeenAt: string
  lastSeenAt: string
  occurrences: number
}

export interface EventQuery {
  kind?: EventKind
  fingerprint?: string
  since?: Date
  until?: Date
  limit: number
  cursor?: string
}

const MAX_MESSAGE = 2_000
const MAX_STACK = 20_000
const MAX_URL = 2_048
const MAX_METADATA_BYTES = 16_384
const MAX_BATCH = 100
const MAX_FUTURE_SKEW_MS = 10 * 60 * 1000

// ---------------------------------------------------------------------------
// Validation

type Dict = Record<string, unknown>

function isDict(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function optString(
  v: unknown,
  field: string,
  max: number,
): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string' || v.length === 0 || v.length > max) {
    throw new ApiError(
      400,
      'invalid_event',
      `'${field}' must be a string of at most ${max} characters`,
    )
  }
  return v
}

function parseOccurredAt(v: unknown): Date | undefined {
  if (v === undefined || v === null) return undefined
  const date =
    typeof v === 'number'
      ? new Date(v)
      : typeof v === 'string'
        ? new Date(v)
        : null
  if (!date || Number.isNaN(date.getTime())) {
    throw new ApiError(
      400,
      'invalid_event',
      `'occurredAt' must be an ISO-8601 string or epoch milliseconds`,
    )
  }
  if (date.getTime() > Date.now() + MAX_FUTURE_SKEW_MS) {
    throw new ApiError(
      400,
      'invalid_event',
      `'occurredAt' cannot be more than 10 minutes in the future`,
    )
  }
  return date
}

function parseMetadata(v: unknown): Dict {
  if (v === undefined || v === null) return {}
  if (!isDict(v)) {
    throw new ApiError(400, 'invalid_event', `'metadata' must be an object`)
  }
  if (JSON.stringify(v).length > MAX_METADATA_BYTES) {
    throw new ApiError(
      400,
      'invalid_event',
      `'metadata' exceeds ${MAX_METADATA_BYTES} bytes`,
    )
  }
  return v
}

// Validates one raw item into an EventInput. Throws ApiError(400) with a
// field-specific message.
export function validateEvent(raw: unknown): EventInput {
  if (!isDict(raw)) {
    throw new ApiError(400, 'invalid_event', 'each event must be an object')
  }
  const kind = raw.kind
  if (kind !== 'browser-error' && kind !== 'user-report') {
    throw new ApiError(
      400,
      'invalid_event',
      `'kind' must be one of: ${EVENT_KINDS.join(', ')}`,
    )
  }

  const message = optString(raw.message, 'message', MAX_MESSAGE)
  if (!message) {
    throw new ApiError(400, 'invalid_event', `'message' is required`)
  }

  const metadata = parseMetadata(raw.metadata)

  const email = optString(raw.email, 'email', 320)
  if (email !== undefined) {
    if (kind !== 'user-report') {
      throw new ApiError(
        400,
        'invalid_event',
        `'email' only applies to user-report events`,
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, 'invalid_event', `'email' is not a valid address`)
    }
    metadata.contact = email
  }

  return {
    kind,
    message,
    stack: optString(raw.stack, 'stack', MAX_STACK),
    url: optString(raw.url, 'url', MAX_URL),
    errorType: optString(raw.errorType, 'errorType', 200),
    release: optString(raw.release, 'release', 200),
    environment: optString(raw.environment, 'environment', 100),
    occurredAt: parseOccurredAt(raw.occurredAt),
    metadata,
  }
}

// Accepts a single event object or `{ events: [...] }` (max 100).
// The whole batch is validated up front — nothing is stored on failure.
export function validateEventBatch(body: unknown): EventInput[] {
  const items = isDict(body) && Array.isArray(body.events) ? body.events : [body]
  if (items.length === 0) {
    throw new ApiError(400, 'invalid_event', 'no events provided')
  }
  if (items.length > MAX_BATCH) {
    throw new ApiError(
      400,
      'invalid_event',
      `batches are limited to ${MAX_BATCH} events`,
    )
  }
  return items.map((item, i) => {
    try {
      return validateEvent(item)
    } catch (err) {
      if (err instanceof ApiError) {
        throw new ApiError(
          err.status,
          err.code,
          `events[${i}]: ${err.message}`,
        )
      }
      throw err
    }
  })
}

// ---------------------------------------------------------------------------
// Fingerprinting (duplicate grouping)

function normalizeUrl(url: string | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url, 'http://placeholder.invalid')
    return `${u.hostname}${u.pathname}`
  } catch {
    return url.slice(0, 500)
  }
}

function firstStackFrame(stack: string | undefined): string {
  if (!stack) return ''
  const line = stack.split('\n').find((l) => /\bat\b|@|:\d+:\d+/.test(l))
  return (line ?? stack.split('\n')[0] ?? '').trim().slice(0, 500)
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

export function fingerprint(event: EventInput): Promise<string> {
  return sha256Hex(
    [
      event.kind,
      event.errorType ?? '',
      normalizeUrl(event.url),
      event.message,
      firstStackFrame(event.stack),
    ].join('\n'),
  )
}

// ---------------------------------------------------------------------------
// Storage

interface DbEvent {
  id: string
  kind: EventKind
  fingerprint: string
  message: string
  stack: string | null
  url: string | null
  release: string | null
  environment: string | null
  metadata: Dict
  occurred_at: Date
  first_seen_at: Date
  last_seen_at: Date
  occurrences: number
  inserted?: boolean
}

function toEventRow(r: DbEvent): EventRow {
  return {
    id: r.id,
    kind: r.kind,
    fingerprint: r.fingerprint,
    message: r.message,
    stack: r.stack,
    url: r.url,
    release: r.release,
    environment: r.environment,
    metadata: r.metadata,
    occurredAt: r.occurred_at.toISOString(),
    firstSeenAt: r.first_seen_at.toISOString(),
    lastSeenAt: r.last_seen_at.toISOString(),
    occurrences: r.occurrences,
  }
}

export interface IngestResult {
  received: number
  inserted: number
  deduplicated: number
  ids: string[]
}

// Upserts each event on (tenant_id, fingerprint). xmax = 0 distinguishes a
// fresh insert from a dedup hit in a single round trip.
export async function ingestEvents(
  tenantId: string,
  events: EventInput[],
): Promise<IngestResult> {
  const fingerprints = await Promise.all(events.map(fingerprint))

  const ids: string[] = []
  let inserted = 0

  await withTenant(tenantId, async (tx) => {
    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      const rows = await tx<DbEvent[]>`
        insert into events (
          tenant_id, kind, fingerprint, message, stack, url,
          release, environment, metadata, occurred_at
        ) values (
          ${tenantId}, ${e.kind}, ${fingerprints[i]}, ${e.message},
          ${e.stack ?? null}, ${e.url ?? null},
          ${e.release ?? null}, ${e.environment ?? null},
          ${tx.json(e.metadata as postgres.JSONValue)},
          ${e.occurredAt ?? new Date()}
        )
        on conflict (tenant_id, fingerprint) do update set
          occurrences = events.occurrences + 1,
          last_seen_at = now(),
          occurred_at = excluded.occurred_at,
          stack = coalesce(excluded.stack, events.stack),
          metadata = events.metadata || excluded.metadata
        returning id, (xmax = 0) as inserted
      `
      ids.push(rows[0].id)
      if (rows[0].inserted) inserted++
    }
  })

  return {
    received: events.length,
    inserted,
    deduplicated: events.length - inserted,
    ids,
  }
}

// ---------------------------------------------------------------------------
// Retrieval

// Keyset pagination over (last_seen_at desc, id desc); `cursor` is the
// base64 of "lastSeenAt|id" from the previous page's last row.
export async function listEvents(
  tenantId: string,
  query: EventQuery,
): Promise<{ events: EventRow[]; nextCursor: string | null }> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [tx`tenant_id = ${tenantId}`]
    if (query.kind) conditions.push(tx`kind = ${query.kind}`)
    if (query.fingerprint)
      conditions.push(tx`fingerprint = ${query.fingerprint}`)
    if (query.since)
      conditions.push(tx`last_seen_at >= ${query.since}`)
    if (query.until)
      conditions.push(tx`last_seen_at <= ${query.until}`)

    let cursor: { seenAt: Date; id: string } | null = null
    if (query.cursor) {
      try {
        const [seenAt, id] = atob(query.cursor).split('|')
        cursor = { seenAt: new Date(seenAt), id }
        if (Number.isNaN(cursor.seenAt.getTime())) throw new Error()
      } catch {
        throw new ApiError(400, 'invalid_cursor', 'malformed cursor')
      }
      conditions.push(
        tx`(last_seen_at, id) < (${cursor.seenAt}, ${cursor.id})`,
      )
    }

    const where = conditions.reduce((acc, c) => tx`${acc} and ${c}`)

    const rows = await tx<DbEvent[]>`
      select * from events
      where ${where}
      order by last_seen_at desc, id desc
      limit ${query.limit + 1}
    `

    const page = rows.slice(0, query.limit)
    const last = page[page.length - 1]
    const nextCursor =
      rows.length > query.limit && last
        ? btoa(`${last.last_seen_at.toISOString()}|${last.id}`)
        : null

    return { events: page.map(toEventRow), nextCursor }
  })
}

export async function getEvent(
  tenantId: string,
  id: string,
): Promise<EventRow | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx<DbEvent[]>`
      select * from events
      where tenant_id = ${tenantId} and id = ${id}
    `
    return rows[0] ? toEventRow(rows[0]) : null
  })
}
