import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { ACIL_YAKLASIMLAR_INITIAL_TOPICS } from "./initialSeedData";
import { slugify } from "./slugify";

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
  await query(`CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, seeded_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  await seedAcilYaklasimlarOnce();
  migrated = true;
}

/**
 * Populates the "acil-yaklasimlar" (Yetişkin Algoritmalar) topics on first
 * use of a fresh database — so connecting Postgres and deploying is enough
 * to see this content live, with no separate seed script to run. Guarded by
 * a row in `seed_meta` inserted with ON CONFLICT DO NOTHING, so concurrent
 * cold starts can't double-insert and a deliberate later deletion of these
 * topics via the admin panel is never silently reverted.
 */
async function seedAcilYaklasimlarOnce(): Promise<void> {
  const { rows } = await query<{ key: string }>(
    `INSERT INTO seed_meta (key) VALUES ($1) ON CONFLICT (key) DO NOTHING RETURNING key`,
    ["acil-yaklasimlar-initial"],
  );
  if (rows.length === 0) return;

  await withTransaction(async (client) => {
    for (let i = 0; i < ACIL_YAKLASIMLAR_INITIAL_TOPICS.length; i++) {
      const { title, image } = ACIL_YAKLASIMLAR_INITIAL_TOPICS[i];
      await client.query(
        `INSERT INTO topics (category_slug, slug, title, content, image_url, order_index)
         VALUES ('acil-yaklasimlar', $1, $2, '', $3, $4)
         ON CONFLICT (category_slug, slug) DO NOTHING`,
        [slugify(title), title, `/algorithms/acil-yaklasimlar/${image}.jpg`, i],
      );
    }
  });
}
