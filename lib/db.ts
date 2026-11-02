/**
 * Database layer.
 *
 * - In production (Vercel), set DATABASE_URL to a Postgres database (Neon, Supabase, etc.).
 * - Locally, if DATABASE_URL is not set, an embedded Postgres (PGlite) stores data in ./.data
 *   so `npm run dev` works with zero setup.
 *
 * Tables are created automatically on first use and filled with starter content once.
 */
import { SCHEMA, seed } from "./schema";

export type Row = Record<string, any>;
type Client = { query: (text: string, params?: unknown[]) => Promise<Row[]> };

const g = globalThis as unknown as { __dbReady?: Promise<Client> };

async function createClient(): Promise<Client> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
    return {
      query: async (text, params = []) =>
        (await sql.unsafe(text, params as any[])) as unknown as Row[],
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || "./.data/pglite";
  (await import("fs")).mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  return { query: async (text, params = []) => (await db.query(text, params)).rows as Row[] };
}

// One shared connection + one schema setup per server process, even with concurrent requests.
function ready(): Promise<Client> {
  if (!g.__dbReady) {
    g.__dbReady = (async () => {
      const db = await createClient();
      for (const stmt of SCHEMA) await db.query(stmt);
      await seed(db.query);
      return db;
    })().catch((e) => {
      g.__dbReady = undefined;
      throw e;
    });
  }
  return g.__dbReady;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await ready();
  return (await db.query(text, params)) as T[];
}

export async function queryOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
