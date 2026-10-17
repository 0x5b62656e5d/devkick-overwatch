import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

// Applies db/schema.sql to the database at DATABASE_URL.
//   bun run db:migrate

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set (see .env.example)')
  process.exit(1)
}

const sql = postgres(url)
try {
  await sql.file(fileURLToPath(new URL('../db/schema.sql', import.meta.url)))
  console.log('schema applied')
} finally {
  await sql.end()
}
