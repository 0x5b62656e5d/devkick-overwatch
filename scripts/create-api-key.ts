import postgres from 'postgres'

// Creates (or upserts) a tenant and mints an API key for it. The key is
// printed once — only its sha256 hash is stored.
//
//   bun run db:create-key -- --tenant acme --name ingest \
//     --scopes ingest,read,write --rpm 600

const args = process.argv.slice(2)

function flag(name: string, fallback?: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const tenantSlug = flag('tenant')
const keyName = flag('name', 'default')!
const scopes = (flag('scopes', 'ingest,read,write')!).split(',')
const rpm = Number(flag('rpm', '120'))

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set (see .env.example)')
  process.exit(1)
}
if (!tenantSlug || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(tenantSlug)) {
  console.error('--tenant is required (lowercase slug, e.g. acme-corp)')
  process.exit(1)
}
for (const scope of scopes) {
  if (!['ingest', 'read', 'write'].includes(scope)) {
    console.error(`unknown scope '${scope}' (allowed: ingest, read, write)`)
    process.exit(1)
  }
}

const sql = postgres(url)
try {
  const tenants = await sql<{ id: string }[]>`
    insert into tenants (slug, name) values (${tenantSlug}, ${tenantSlug})
    on conflict (slug) do update set name = excluded.name
    returning id
  `
  const tenantId = tenants[0].id

  const key = `owk_${crypto.randomUUID().replaceAll('-', '')}${crypto
    .randomUUID()
    .replaceAll('-', '')}`
  const hash = [...new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)),
  )]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  await sql`
    insert into api_keys (tenant_id, name, key_hash, key_prefix, scopes, rate_limit_rpm)
    values (${tenantId}, ${keyName}, ${hash}, ${key.slice(0, 12)}, ${scopes}, ${rpm})
  `

  console.log(`tenant '${tenantSlug}' (${tenantId})`)
  console.log(`key '${keyName}' scopes=[${scopes}] rpm=${rpm}`)
  console.log(`\nAPI key (shown once, store it somewhere safe):\n${key}`)
} finally {
  await sql.end()
}
