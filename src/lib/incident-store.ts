import { ApiError } from './api'
import { withTenant, type Sql } from './db'

// PostgreSQL-backed incident store for the /api/v1/incidents endpoints.
// Distinct from incident-state.ts — that in-memory module belongs to the
// telemetry→KEV pipeline; this is the durable store other branches read
// and write through the HTTP API.

export const INCIDENT_STATUSES = ['open', 'acknowledged', 'resolved'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export interface IncidentInput {
  title: string
  description?: string
  severity?: number
  status?: IncidentStatus
  assignee?: string
  labels?: string[]
  source?: string
  eventIds?: string[]
}

export interface IncidentPatch {
  title?: string
  description?: string
  severity?: number
  status?: IncidentStatus
  assignee?: string | null
  labels?: string[]
  source?: string
  addEventIds?: string[]
  removeEventIds?: string[]
}

export interface IncidentRow {
  id: string
  title: string
  description: string
  status: IncidentStatus
  severity: number
  assignee: string | null
  labels: string[]
  source: string
  eventIds: string[]
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

interface DbIncident {
  id: string
  title: string
  description: string
  status: IncidentStatus
  severity: number
  assignee: string | null
  labels: string[]
  source: string
  created_at: Date
  updated_at: Date
  resolved_at: Date | null
}

type Dict = Record<string, unknown>

function isDict(v: unknown): v is Dict {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function optField<T>(
  v: unknown,
  field: string,
  check: (x: unknown) => x is T,
  what: string,
): T | undefined {
  if (v === undefined || v === null) return undefined
  if (!check(v)) {
    throw new ApiError(400, 'invalid_incident', `'${field}' must be ${what}`)
  }
  return v
}

const isStr = (v: unknown): v is string => typeof v === 'string'
const isSeverity = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 5
const isStatus = (v: unknown): v is IncidentStatus =>
  typeof v === 'string' &&
  (INCIDENT_STATUSES as readonly string[]).includes(v)
const isLabels = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((l) => typeof l === 'string' && l.length <= 64)
const isUuidArray = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.every((id) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
  )

export function validateIncidentInput(raw: unknown): IncidentInput {
  if (!isDict(raw)) {
    throw new ApiError(400, 'invalid_incident', 'body must be a JSON object')
  }
  const title = optField(raw.title, 'title', isStr, 'a string')
  if (!title || title.length > 500) {
    throw new ApiError(
      400,
      'invalid_incident',
      `'title' is required (max 500 chars)`,
    )
  }
  return {
    title,
    description: optField(raw.description, 'description', isStr, 'a string'),
    severity: optField(raw.severity, 'severity', isSeverity, 'an integer 1-5'),
    status: optField(raw.status, 'status', isStatus, `one of: ${INCIDENT_STATUSES.join(', ')}`),
    assignee: optField(raw.assignee, 'assignee', isStr, 'a string'),
    labels: optField(raw.labels, 'labels', isLabels, 'an array of strings'),
    source: optField(raw.source, 'source', isStr, 'a string'),
    eventIds: optField(raw.eventIds, 'eventIds', isUuidArray, 'an array of UUIDs'),
  }
}

export function validateIncidentPatch(raw: unknown): IncidentPatch {
  if (!isDict(raw)) {
    throw new ApiError(400, 'invalid_incident', 'body must be a JSON object')
  }
  const title = optField(raw.title, 'title', isStr, 'a string')
  if (title !== undefined && (title.length === 0 || title.length > 500)) {
    throw new ApiError(
      400,
      'invalid_incident',
      `'title' must be 1-500 characters`,
    )
  }
  return {
    title,
    description: optField(raw.description, 'description', isStr, 'a string'),
    severity: optField(raw.severity, 'severity', isSeverity, 'an integer 1-5'),
    status: optField(raw.status, 'status', isStatus, `one of: ${INCIDENT_STATUSES.join(', ')}`),
    assignee:
      raw.assignee === null
        ? null
        : optField(raw.assignee, 'assignee', isStr, 'a string'),
    labels: optField(raw.labels, 'labels', isLabels, 'an array of strings'),
    source: optField(raw.source, 'source', isStr, 'a string'),
    addEventIds: optField(raw.addEventIds, 'addEventIds', isUuidArray, 'an array of UUIDs'),
    removeEventIds: optField(raw.removeEventIds, 'removeEventIds', isUuidArray, 'an array of UUIDs'),
  }
}

async function toIncidentRow(tx: Sql, r: DbIncident): Promise<IncidentRow> {
  const links = await tx<{ event_id: string }[]>`
    select event_id from incident_events where incident_id = ${r.id}
  `
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    severity: r.severity,
    assignee: r.assignee,
    labels: r.labels,
    source: r.source,
    eventIds: links.map((l) => l.event_id),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    resolvedAt: r.resolved_at?.toISOString() ?? null,
  }
}

export async function createIncidentRecord(
  tenantId: string,
  input: IncidentInput,
): Promise<IncidentRow> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx<DbIncident[]>`
      insert into incidents (tenant_id, title, description, status, severity, assignee, labels, source)
      values (
        ${tenantId}, ${input.title}, ${input.description ?? ''},
        ${input.status ?? 'open'}, ${input.severity ?? 3},
        ${input.assignee ?? null}, ${input.labels ?? []},
        ${input.source ?? 'manual'}
      )
      returning *
    `
    const incident = rows[0]

    if (input.eventIds?.length) {
      await linkEvents(tx, tenantId, incident.id, input.eventIds)
    }

    return toIncidentRow(tx, incident)
  })
}

async function linkEvents(
  tx: Sql,
  tenantId: string,
  incidentId: string,
  eventIds: string[],
): Promise<void> {
  // Verify the events belong to this tenant before linking — prevents
  // cross-tenant association via guessed UUIDs.
  const found = await tx<{ id: string }[]>`
    select id from events where tenant_id = ${tenantId} and id = any(${eventIds})
  `
  const foundIds = new Set(found.map((f) => f.id))
  const missing = eventIds.filter((id) => !foundIds.has(id))
  if (missing.length) {
    throw new ApiError(
      400,
      'unknown_events',
      `event ids not found for this tenant: ${missing.join(', ')}`,
    )
  }
  await tx`
    insert into incident_events (incident_id, event_id)
    select ${incidentId}, id from events where id = any(${eventIds})
    on conflict do nothing
  `
}

export interface IncidentQuery {
  status?: IncidentStatus
  severity?: number
  limit: number
  cursor?: string
}

export async function listIncidentRecords(
  tenantId: string,
  query: IncidentQuery,
): Promise<{ incidents: IncidentRow[]; nextCursor: string | null }> {
  return withTenant(tenantId, async (tx) => {
    const conditions = [tx`tenant_id = ${tenantId}`]
    if (query.status) conditions.push(tx`status = ${query.status}`)
    if (query.severity)
      conditions.push(tx`severity = ${query.severity}`)

    if (query.cursor) {
      try {
        const [createdAt, id] = atob(query.cursor).split('|')
        const d = new Date(createdAt)
        if (Number.isNaN(d.getTime())) throw new Error()
        conditions.push(tx`(created_at, id) < (${d}, ${id})`)
      } catch (e) {
        if (e instanceof ApiError) throw e
        throw new ApiError(400, 'invalid_cursor', 'malformed cursor')
      }
    }

    const where = conditions.reduce((acc, c) => tx`${acc} and ${c}`)

    const rows = await tx<DbIncident[]>`
      select * from incidents
      where ${where}
      order by created_at desc, id desc
      limit ${query.limit + 1}
    `

    const page = rows.slice(0, query.limit)
    const last = page[page.length - 1]
    const nextCursor =
      rows.length > query.limit && last
        ? btoa(`${last.created_at.toISOString()}|${last.id}`)
        : null

    const incidents = await Promise.all(
      page.map((r) => toIncidentRow(tx, r)),
    )
    return { incidents, nextCursor }
  })
}

export async function getIncidentRecord(
  tenantId: string,
  id: string,
): Promise<IncidentRow | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx<DbIncident[]>`
      select * from incidents where tenant_id = ${tenantId} and id = ${id}
    `
    return rows[0] ? toIncidentRow(tx, rows[0]) : null
  })
}

export async function updateIncidentRecord(
  tenantId: string,
  id: string,
  patch: IncidentPatch,
): Promise<IncidentRow | null> {
  return withTenant(tenantId, async (tx) => {
    const existing = await tx<DbIncident[]>`
      select * from incidents where tenant_id = ${tenantId} and id = ${id}
      for update
    `
    if (!existing[0]) return null

    const next = {
      title: patch.title ?? existing[0].title,
      description: patch.description ?? existing[0].description,
      status: patch.status ?? existing[0].status,
      severity: patch.severity ?? existing[0].severity,
      assignee:
        patch.assignee === null
          ? null
          : (patch.assignee ?? existing[0].assignee),
      labels: patch.labels ?? existing[0].labels,
      source: patch.source ?? existing[0].source,
    }

    const resolvedAt =
      next.status === 'resolved'
        ? (existing[0].resolved_at ?? new Date())
        : null

    const rows = await tx<DbIncident[]>`
      update incidents set
        title = ${next.title},
        description = ${next.description},
        status = ${next.status},
        severity = ${next.severity},
        assignee = ${next.assignee},
        labels = ${next.labels},
        source = ${next.source},
        resolved_at = ${resolvedAt},
        updated_at = now()
      where id = ${id}
      returning *
    `

    if (patch.addEventIds?.length) {
      await linkEvents(tx, tenantId, id, patch.addEventIds)
    }
    if (patch.removeEventIds?.length) {
      await tx`
        delete from incident_events
        where incident_id = ${id} and event_id = any(${patch.removeEventIds})
      `
    }

    return toIncidentRow(tx, rows[0])
  })
}

export async function deleteIncidentRecord(
  tenantId: string,
  id: string,
): Promise<boolean> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx`
      delete from incidents where tenant_id = ${tenantId} and id = ${id}
      returning id
    `
    return rows.length > 0
  })
}
