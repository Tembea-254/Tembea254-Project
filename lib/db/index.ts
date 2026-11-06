import path from "path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One database for the whole app.
 *  - DATABASE_URL (or POSTGRES_URL from Vercel's Neon integration) → real Postgres.
 *  - Otherwise → PGlite, a full Postgres that runs inside Node and saves to .data/pglite.
 *    Nothing to install for local development.
 * Migrations in /drizzle are applied automatically the first time the database is used.
 */
export type DB = ReturnType<typeof drizzlePg<typeof schema>>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const usingRealPostgres = !!url;

declare global {
  // eslint-disable-next-line no-var
  var __tembeaDb: Promise<DB> | undefined;
}

async function connect(): Promise<DB> {
  if (url) {
    const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, connect_timeout: 15 });
    const db = drizzlePg(client, { schema });
    if (process.env.DB_AUTO_MIGRATE !== "false") {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: MIGRATIONS });
    }
    return db;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const serverless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (serverless) console.error("[db] DATABASE_URL is not set — using a temporary in-memory database. Connect Neon Postgres in Vercel → Storage.");
  const dir = serverless ? undefined : path.join(process.cwd(), ".data", "pglite");
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!globalThis.__tembeaDb) {
    globalThis.__tembeaDb = connect()
      .then(async (db) => {
        const { seed } = await import("./seed");
        await seed(db);
        return db;
      })
      .catch((e) => {
        globalThis.__tembeaDb = undefined;
        throw e;
      });
  }
  return globalThis.__tembeaDb;
}

export { schema };
