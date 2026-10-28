import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import postgres from "postgres";
import { connectPostgres } from "@/lib/server/db";
import type { Db } from "@/lib/server/db-types";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
/** Every migration's SQL, in the order Supabase applies them. */
export const migrations = () => readdirSync(MIGRATIONS).sort().map((file) => readFileSync(join(MIGRATIONS, file), "utf8"));

/** A made-up account id. Tests never use real Supabase users. */
export const newOwner = () => crypto.randomUUID();

function wrap(pg: PGlite, q: PGlite | Transaction): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await q.query<T>(text, params)).rows;
    },
    transaction<T>(fn: (tx: Db) => Promise<T>) {
      return pg.transaction((tx) => fn(wrap(pg, tx)));
    },
  };
}

/**
 * A fresh database with the real migrations applied. By default an in-memory PGlite; when
 * TEST_DATABASE_URL points at a Postgres server, a throwaway database there, reached through the
 * same postgres.js connection code the app uses.
 */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const serverUrl = process.env.TEST_DATABASE_URL;
  if (!serverUrl) {
    const pg = new PGlite();
    for (const sql of migrations()) await pg.exec(sql);
    return { db: wrap(pg, pg), close: () => pg.close() };
  }

  const admin = postgres(serverUrl, { max: 1, onnotice: () => {} });
  const name = `reviewlens_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await admin.unsafe(`create database ${name}`);
  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const { db, close } = connectPostgres(url.toString(), 2);
  for (const sql of migrations()) await db.query(sql);
  return {
    db,
    close: async () => {
      await close();
      await admin.unsafe(`drop database ${name}`);
      await admin.end();
    },
  };
}
