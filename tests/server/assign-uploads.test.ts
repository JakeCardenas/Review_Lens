import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { migrations } from "../helpers/pglite";

const SCRIPT = readFileSync(join(process.cwd(), "supabase", "manual", "assign-existing-uploads.sql"), "utf8");
const PLACEHOLDER = "your-email@example.com";
const UPLOAD = `insert into uploads (name, file_name, column_map, provider, model, topic_version, total_rows, owner_id)
  values ('Old', 'old.csv', '{"text":"Review"}', 'basic', 'vader', 'v1', 1, $1) returning id`;
const JAKE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

let pg: PGlite;

/** Runs the script with `email` in place of the placeholder and returns its result row. */
async function assign(email: string) {
  expect(SCRIPT).toContain(PLACEHOLDER);
  const results = await pg.exec(SCRIPT.replaceAll(PLACEHOLDER, email));
  return results[results.length - 1].rows[0];
}

beforeEach(async () => {
  pg = new PGlite();
  await pg.exec(`create schema auth; create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);`);
  for (const sql of migrations()) await pg.exec(sql);
  await pg.query(`insert into auth.users values ($1, 'jake@example.com', now()), ($2, 'other@example.com', now())`, [JAKE, OTHER]);
});

afterEach(() => pg.close());

describe("assign-existing-uploads.sql", () => {
  it("gives every ownerless upload to the one confirmed account, and leaves owned uploads alone", async () => {
    await pg.query(UPLOAD, [null]);
    await pg.query(UPLOAD, [null]);
    await pg.query(UPLOAD, [OTHER]);
    expect(await assign("Jake@Example.com")).toEqual({ matching_accounts: 1, uploads_assigned: 2 });
    const owners = await pg.query<{ owner_id: string; n: number }>(`select owner_id, count(*)::int as n from uploads group by 1 order by 1`);
    expect(owners.rows).toEqual([
      { owner_id: JAKE, n: 2 },
      { owner_id: OTHER, n: 1 },
    ]);
  });

  it("changes nothing when no confirmed account has that email", async () => {
    await pg.query(UPLOAD, [null]);
    await pg.query(`insert into auth.users values ('33333333-3333-4333-8333-333333333333', 'new@example.com', null)`);
    expect(await assign("missing@example.com")).toEqual({ matching_accounts: 0, uploads_assigned: 0 });
    expect(await assign("new@example.com")).toEqual({ matching_accounts: 0, uploads_assigned: 0 });
    expect((await pg.query(`select count(*)::int as n from uploads where owner_id is null`)).rows).toEqual([{ n: 1 }]);
  });
});
