import { withTenant } from './db'

// Tenant-scoped rollup for dashboards: event counts by kind and incident
// counts by status, plus occurrences over the last 24 hours.
export interface TenantStats {
  events: { browserErrors: number; userReports: number; occurrences24h: number }
  incidents: { open: number; acknowledged: number; resolved: number }
}

export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  return withTenant(tenantId, async (tx) => {
    const [ev, inc] = await Promise.all([
      tx<{ kind: string; count: number; occurrences24h: number }[]>`
        select kind,
               count(*)::int as count,
               coalesce(sum(occurrences) filter (
                 where last_seen_at > now() - interval '24 hours'
               ), 0)::int as "occurrences24h"
        from events where tenant_id = ${tenantId} group by kind
      `,
      tx<{ status: string; count: number }[]>`
        select status, count(*)::int as count
        from incidents where tenant_id = ${tenantId} group by status
      `,
    ])

    const events = { browserErrors: 0, userReports: 0, occurrences24h: 0 }
    for (const row of ev) {
      events.occurrences24h += row.occurrences24h
      if (row.kind === 'browser-error') events.browserErrors = row.count
      if (row.kind === 'user-report') events.userReports = row.count
    }

    const incidents = { open: 0, acknowledged: 0, resolved: 0 }
    for (const row of inc) {
      if (row.status in incidents)
        incidents[row.status as keyof typeof incidents] = row.count
    }

    return { events, incidents }
  })
}
