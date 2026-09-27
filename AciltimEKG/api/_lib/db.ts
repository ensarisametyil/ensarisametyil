import { Pool, type PoolClient, type QueryResultRow } from "pg";

// Works against any standard Postgres connection string — Vercel Postgres,
// Neon, Supabase, PlanetScale's Postgres-compatible endpoint, or a local
// instance for development. Vercel Postgres exposes this exact variable
// name (POSTGRES_URL) when you connect it to your project; DATABASE_URL is
// accepted as a fallback for other providers.
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  // Thrown lazily (on first query) rather than at import time, so routes
  // that don't touch the DB (e.g. a health check) don't crash the function.
  console.warn("[db] POSTGRES_URL / DATABASE_URL is not set — database calls will fail.");
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!connectionString) {
      throw new Error("POSTGRES_URL veya DATABASE_URL ortam değişkeni tanımlı değil.");
    }
    pool = new Pool({
      connectionString,
      // Local Postgres (dev) has no TLS listener; hosted providers (Vercel
      // Postgres/Neon/Supabase) require SSL. Toggle based on the host so the
      // same code works in both places without extra env vars.
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  const client = getPool();
  return client.query<T>(text, params);
}

/**
 * A single dedicated connection for multi-statement transactions (BEGIN /
 * ... / COMMIT). Using the plain `query()` helper for a transaction would be
 * incorrect: the pool hands out a different connection per call, so BEGIN,
 * the statements, and COMMIT could each land on a different session.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

let migrated = false;

/** Idempotent, lazy schema setup — runs once per warm serverless instance. */
export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  await query(`
    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      category_slug TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (category_slug, slug)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_topics_category_order ON topics (category_slug, order_index);`);
  migrated = true;
}
