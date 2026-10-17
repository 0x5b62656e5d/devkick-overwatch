import postgres from 'postgres'

// PostgreSQL connection. Lazily created on first use so the dev server
// and dashboard routes work without DATABASE_URL set; API routes that
// need the database fail with a clear error instead.

export type Sql = ReturnType<typeof postgres>

let sql: Sql | null = null

export function getDb(): Sql {
  if (sql) return sql
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set — point it at a PostgreSQL instance ' +
        '(see .env.example) and run `bun run db:migrate`',
    )
  }
  sql = postgres(url, { max: 10 })
  return sql
}

// Runs `fn` inside a transaction with `app.tenant_id` set, so row-level
// security policies constrain every statement to one tenant. Explicit
// tenant_id predicates are still used in queries — this is the
// defence-in-depth layer for non-owner database roles.
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Sql) => Promise<T>,
): Promise<T> {
  const db = getDb()
  return db.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${tenantId}, true)`
    return fn(tx as unknown as Sql)
  }) as Promise<T>
}
