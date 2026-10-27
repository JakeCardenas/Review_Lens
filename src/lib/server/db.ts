import "server-only";
import postgres from "postgres";
import type { Db } from "./db-types";
import { AppError } from "./errors";

type Sql = postgres.Sql | postgres.TransactionSql;

function wrap(sql: Sql, root: postgres.Sql): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
    transaction<T>(fn: (tx: Db) => Promise<T>) {
      return root.begin((tx) => fn(wrap(tx, root))) as Promise<T>;
    },
  };
}

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Opens a postgres.js pool. With Supabase on Vercel, use the transaction pooler connection
 * string (port 6543), which needs prepared statements turned off.
 */
export function connectPostgres(url: string, max = 5): { db: Db; close: () => Promise<void> } {
  const sql = postgres(url, {
    prepare: false,
    max,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: isLocalHost(url) ? false : "require",
    onnotice: () => {},
  });
  return { db: wrap(sql, sql), close: () => sql.end({ timeout: 5 }) };
}

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { reviewlensDb?: Db };

/** The app's database connection, from the server-only DATABASE_URL. */
export function getDb(): Db {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new AppError(
      "DATABASE_NOT_CONFIGURED",
      "The database isn't connected yet. Set DATABASE_URL as described in the README.",
      503,
    );
  }
  globalForDb.reviewlensDb ??= connectPostgres(url).db;
  return globalForDb.reviewlensDb;
}
