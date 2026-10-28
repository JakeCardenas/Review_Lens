import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { createTestDb, migrations } from "../helpers/pglite";

const UPLOAD_COLUMNS = `name, file_name, column_map, provider, model, topic_version, total_rows`;
const UPLOAD_VALUES = `'Reviews', 'reviews.csv', '{"text":"Review"}', 'basic', 'vader', 'v1', 1`;

describe("accounts migration", () => {
  it("applies on plain Postgres without an auth schema, leaving existing uploads ownerless", async () => {
    const { db, close } = await createTestDb();
    try {
      expect(
        await db.query(
          `select is_nullable from information_schema.columns where table_name = 'uploads' and column_name = 'owner_id'`,
        ),
      ).toEqual([{ is_nullable: "YES" }]);
      expect(
        await db.query(`select column_name from information_schema.columns where table_name = 'usage_counters' order by 1`),
      ).toEqual([{ column_name: "day" }, { column_name: "scope" }, { column_name: "subject" }, { column_name: "used" }]);
    } finally {
      await close();
    }
  });

  it("links uploads to Supabase users when auth.users exists, without touching ownerless uploads", async () => {
    const pg = new PGlite();
    try {
      await pg.exec(`create schema auth; create table auth.users (id uuid primary key, email text);`);
      for (const sql of migrations()) await pg.exec(sql);
      const user = "11111111-1111-4111-8111-111111111111";
      await pg.query(`insert into auth.users (id, email) values ($1, 'synthetic@example.com')`, [user]);
      await pg.query(`insert into uploads (${UPLOAD_COLUMNS}, owner_id) values (${UPLOAD_VALUES}, $1)`, [user]);
      await pg.query(`insert into uploads (${UPLOAD_COLUMNS}) values (${UPLOAD_VALUES})`);

      await expect(
        pg.query(`insert into uploads (${UPLOAD_COLUMNS}, owner_id) values (${UPLOAD_VALUES}, $1)`, [
          "22222222-2222-4222-8222-222222222222",
        ]),
      ).rejects.toThrow(/foreign key/);

      await pg.query(`delete from auth.users where id = $1`, [user]);
      const left = await pg.query<{ owner_id: string | null }>(`select owner_id from uploads`);
      expect(left.rows).toEqual([{ owner_id: null }]);
    } finally {
      await pg.close();
    }
  });
});
