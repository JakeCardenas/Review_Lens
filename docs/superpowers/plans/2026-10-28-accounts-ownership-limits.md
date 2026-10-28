# Accounts, Ownership and Limits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase email/password accounts, per-user ownership checked on the server for every page and API action, per-user upload and Gemini limits, clear analysis-mode labels, and a safer label-check upload flow, without losing or exposing existing uploads.

**Architecture:**
- Supabase Auth runs through `@supabase/ssr`, with server-side clients only.
- `src/proxy.ts` refreshes sessions and turns away signed-out requests early. The real checks live in a data access layer (`requireUser`, `requireApiUser`) and in owner-scoped queries.
- Limits use one `usage_counters` table with atomic reservations per Pacific-time day.

**Tech Stack:** Next.js 16.4 (`proxy.ts`), `@supabase/ssr` 0.12.x + `@supabase/supabase-js` 2.x, postgres.js, zod, vitest with PGlite (and PG17 via `TEST_DATABASE_URL`).

**Spec:** `docs/superpowers/specs/2026-10-28-accounts-ownership-limits-design.md`

## Global Constraints

- No OAuth, no roles, no paid services, no paid Gemini fallback, no live Gemini or Supabase calls in tests.
- Never trust `getSession()` on the server; only `getClaims()`.
- Someone else's upload gives the same 404 as a missing upload.
- Existing uploads keep `owner_id null`, stay invisible, and keep their mode. The migration is additive only.
- Defaults (env-overridable):
  - `UPLOADS_PER_DAY=10`, `MAX_STORED_UPLOADS=25`
  - `AI_REVIEWS_PER_USER_PER_DAY=2500`, `AI_REVIEWS_PER_DAY=10000`
  - days reset at midnight `America/Los_Angeles`
- Minimum password length 8. Sign-up copy: "Create a new password just for ReviewLens. Don't use your Gmail or school (SIAS) password."
- No commits, pushes, deploys or production SQL (the user's rule overrides the template's commit steps).

## Review Focus

1. A signed-in user requests another user's upload ID on any page or API route. Expect a 404 that reveals nothing. (Task 7: route matrix test.)
2. Ownerless (legacy) uploads stay out of every list and lookup for every user. (Task 3.)
3. Two analyze calls race at the edge of the daily AI limit. Reservations must not exceed the limit. (Task 4: concurrent reservation test.)
4. `next=//evil.example` or `next=https://evil.example` on sign-in must not redirect off-site. (Task 5.)
5. An unconfirmed account tries to sign in, or sign-up returns a session without confirmation. No session may be kept. (Task 6.)

---

### Task 1: Migration for owners and usage counters

**Files:** Create `supabase/migrations/20261029000000_accounts.sql`; Test `tests/server/accounts-migration.test.ts`.

**Interfaces:**
- Produces:
  - `uploads.owner_id uuid null`, with a foreign key to `auth.users(id) on delete cascade` only if `auth.users` exists
  - index `uploads_owner_created_idx`
  - table `usage_counters(scope text, subject text, day date, used integer >= 0, primary key (scope, subject, day))`, with RLS on and client grants revoked

- [ ] Test `applies on plain Postgres without an auth schema`: `createTestDb()` succeeds, and `owner_id` exists and is nullable.
- [ ] Test `links owners to Supabase users when auth.users exists`: in a fresh PGlite, run `create schema auth; create table auth.users (id uuid primary key, email text)`, then apply all migrations. Insert a user and an owned upload, delete the user, and expect the upload to be gone. An upload with a null owner is untouched.
- [ ] Implement with a guarded `do $$` block (`to_regclass('auth.users')`, then check `pg_constraint` before adding). Run: `npx vitest run tests/server/accounts-migration.test.ts`. Expected: PASS.

### Task 2: Usage limits

**Files:** Create `src/lib/server/limits.ts`; Test `tests/server/limits.test.ts`.

**Interfaces:**
- Produces:
  - `LIMIT_DEFAULTS` and `limitsFromEnv(env = process.env): Limits`, where `Limits = { uploadsPerDay, maxStoredUploads, aiReviewsPerUserPerDay, aiReviewsPerDay }`
  - `pacificDay(now: Date): string` (`YYYY-MM-DD`)
  - `reserve(db, { scope, subject, limit, wanted, now }): Promise<number>`, which returns the amount granted (0..wanted) and runs atomically in a transaction with `select … for update`
  - `nextPacificMidnight(now: Date): Date`

- [ ] Tests:
  - `pacificDay` is `2026-10-28` at 2026-10-29T06:00Z (11 p.m. PDT); `nextPacificMidnight` at 2026-10-29T06:00Z is 2026-10-29T07:00Z
  - `reserve` grants 25, then 25, then 0 against a limit of 50
  - it grants a partial 10 when 40 is used and the limit is 50
  - subjects and days are separate
  - two `reserve` calls in parallel with wanted 30 and limit 50 grant 50 in total
  - `limitsFromEnv` ignores non-numeric and non-positive values
- [ ] Implement and run `npx vitest run tests/server/limits.test.ts`. Expected: PASS.

### Task 3: Owner-scoped data access

**Files:**
- Modify:
  - `src/lib/server/uploads.ts`, `reviews.ts`, `filters.ts`, `dashboard.ts`, `export.ts`, `ingest.ts`, `analyze.ts`
  - `tests/helpers/` (add `newOwner()`)
  - existing server tests, to pass owners
- Test: `tests/server/ownership.test.ts`.

**Interfaces:**
- Produces:
  - `type UploadScope = { uploadId: string; ownerId: string }`
  - `createUpload(db, input, provider, ownerId)`, `getOwnedUpload(db, ownerId, id)`, `listUploads(db, ownerId)`, `deleteUpload(db, ownerId, id)`, `getProgress(db, ownerId, id)`
  - `buildWhere(scope: UploadScope, filters)`: `$1` is the upload id and `$2` the owner, with `r.upload_id = (select o.id from uploads o where o.id = $1::uuid and o.owner_id = $2::uuid)`
  - `searchReviews(db, scope, …)`, `getReview(db, scope, reviewId)`, `getFilterOptions(db, scope)`, `listIssues(db, scope, …)`
  - `getDashboard(db, upload, filters)`, where `UploadRecord` gains `ownerId: string | null`
  - `reviewCsvLines(db, upload, filters)`
  - `startAnalysis(db, ownerId, id)`, `analyzeNextBatch(db, provider, ownerId, id, batchSize?)`, `retryFailed(db, ownerId, id)`
  - `ingestRows` unchanged; it takes an owned `UploadRecord`
  - `UploadRecord` adds `ownerId`

- [ ] Test `keeps each user's uploads to themselves`: owner A creates and ingests. Then B's `getOwnedUpload`, `getProgress`, `deleteUpload`, `searchReviews`, `getReview`, `listIssues`, `getFilterOptions`, `startAnalysis`, `analyzeNextBatch` and `retryFailed` all return null or empty, or throw 404. B's `listUploads` is empty, and A's upload still exists.
- [ ] Test `hides uploads without an owner from everyone`: insert a legacy upload with a null owner. It's absent from every user's list and lookup.
- [ ] Update the existing tests to create uploads with a synthetic owner. Run `npx vitest run`. Expected: all PASS.

### Task 4: Upload and AI limits enforced

**Files:** Modify `src/app/api/uploads/route.ts` (via a new `createUploadForUser` in `uploads.ts`) and `src/lib/server/analyze.ts`. Test `tests/server/usage-limits.test.ts`.

**Interfaces:**
- Consumes: `reserve` and `limitsFromEnv` (Task 2).
- Produces:
  - `createUploadForUser(db, input, provider, ownerId, limits)` throws `AppError` with:
    - `UPLOAD_LIMIT_DAY` (429): "You can start up to 10 uploads a day. Try again after midnight Pacific time."
    - `UPLOAD_LIMIT_STORED` (409): "You have 25 uploads. Delete one to add another."
  - `analyzeNextBatch` reserves for external providers only, against the user then the app total. On a partial grant it analyzes the granted reviews and puts the rest back. On no grant it throws `ProviderError(…, false, { code: "AI_DAILY_LIMIT" })` with the user or app message.
  - `analyze-progress.tsx` treats `AI_DAILY_LIMIT` like `FREE_TIER_DAILY_LIMIT` (it stops and shows the message).
- [ ] Tests:
  - an 11th upload in a day → `UPLOAD_LIMIT_DAY`
  - a 26th stored upload → `UPLOAD_LIMIT_STORED`
  - deleting uploads doesn't reset the daily count
  - Gemini (fake) with a user limit of 30: the first batch labels 25, the next labels 5, the next throws `AI_DAILY_LIMIT`, and no review stays `processing`
  - the app limit applies across two users
  - Basic mode is never counted
- [ ] Implement and run the tests. Expected: PASS.

### Task 5: Auth plumbing (client, data access layer, proxy, safe redirects)

**Files:**
- Create:
  - `src/lib/supabase/server.ts`
  - `src/lib/server/auth.ts`
  - `src/lib/auth/paths.ts`
  - `src/proxy.ts`
- Modify: `package.json` (add `@supabase/ssr@0.12.7`, `@supabase/supabase-js@2.118.0`)
- Tests: `tests/server/auth-paths.test.ts`, `tests/server/auth.test.ts`

**Interfaces:**
- Produces:
  - `createSupabaseServerClient(): Promise<SupabaseClient>`, using `cookies()` getAll/setAll and throwing a clear `AppError` when env is missing
  - `getCurrentUser = cache(async (): Promise<{ id: string; email: string } | null>)`, with `getClaims()`, which rejects `is_anonymous` and a missing `sub`
  - `requireUser(next?: string)`, which redirects to `/sign-in?next=…`
  - `requireApiUser()`, which throws `AppError("SIGN_IN_REQUIRED", …, 401)`
  - `safeNextPath(value: unknown, fallback = "/"): string`, accepting only a `/x` path, not `//`, not `/\`, with no control characters
  - `isPublicPath(pathname)` for `/sign-in`, `/sign-up`, `/forgot-password`, `/check-email`, `/auth/confirm` and static files
  - `isApiPath(pathname)`
  - `assertSameOrigin(request: Request)`, which throws 403 when `Origin` is present and doesn't match `Host` / `x-forwarded-host`
- [ ] Tests:
  - `safeNextPath` cases: `/uploads/x?y=1` ✓; `//evil.example`, `https://evil.example`, `/\evil`, `javascript:…` and an empty value fall back to `/`
  - path classification
  - `getCurrentUser` with a mocked client: valid claims → user; an error, no claims or an anonymous user → null
  - `assertSameOrigin` passes on the same origin or with no Origin, and fails cross-site
- [ ] `src/proxy.ts` follows Supabase's `updateSession` pattern. For a signed-out request to an app page it redirects, copying cookies onto the redirect; for an API path it returns 401 JSON. The matcher excludes `_next/static`, `_next/image`, `favicon.ico` and image files.
- [ ] Run the tests. Expected: PASS.

### Task 6: Auth pages and actions

**Files:**
- Create:
  - `src/app/(auth)/sign-in/page.tsx`, `sign-up/page.tsx`, `forgot-password/page.tsx`, `check-email/page.tsx`, `reset-password/page.tsx`
  - `src/app/(auth)/actions.ts`
  - `src/components/auth/auth-form.tsx` (client form using `useActionState`)
  - `src/app/auth/confirm/route.ts`
- Test: `tests/server/auth-actions.test.ts`

**Interfaces:**
- Produces server actions `signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`, `resendConfirmation`. Each takes `(prev: AuthState, formData: FormData)` and returns `AuthState = { error?: string; message?: string }`, or redirects.
- [ ] Tests (mocked `createSupabaseServerClient`):
  - `signUp` with a valid email and an 8+ character password calls `auth.signUp` with `emailRedirectTo` ending `/auth/confirm?next=%2F`, then redirects to `/check-email`
  - a short password or a bad email returns an error and makes no Supabase call
  - if Supabase returns a session for an unconfirmed user, `signOut` is called
  - `signIn` success redirects to `safeNextPath(next)`
  - an unconfirmed user is signed out and gets "Confirm your email first"
  - a wrong password gets the generic "Email or password is incorrect."
  - `requestPasswordReset` always shows the same message, whether or not the email exists
  - `updatePassword` requires a user and a matching confirmation
  - `/auth/confirm` with `token_hash` and `type` calls `verifyOtp` and redirects to the safe `next`; with `code` it calls `exchangeCodeForSession`; otherwise it redirects to `/sign-in?error=link`
- [ ] Pages use the existing `Card`, `Button`, `Notice` and tokens. Run the tests. Expected: PASS.

### Task 7: Protect every page and API route

**Files:**
- Modify:
  - every `src/app/api/uploads/**/route.ts`
  - `src/app/page.tsx`, `src/app/upload/page.tsx`
  - every `src/app/uploads/[id]/**/page.tsx` and `layout.tsx`
  - `src/app/layout.tsx` (header: email + sign-out)
- Tests: `tests/server/route-guards.test.ts`, `tests/server/api-protection.test.ts`

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces:
  - `requireOwnedUpload(id)` for pages, which returns `{ user, upload }` or calls `notFound()`
  - route handlers call `requireApiUser()`, and mutating handlers also call `assertSameOrigin(request)`
- [ ] Test `every page and route checks the signed-in user`: scan `src/app` for `page.tsx` and `route.ts`. Each one except the public auth pages and `/auth/confirm` must reference `requireUser`, `requireOwnedUpload` or `requireApiUser`.
- [ ] Test the API matrix with `vi.mock("@/lib/server/auth")`: for every method and route, signed out → 401; user B on A's upload → 404 (and A's data unchanged); a cross-origin POST → 403.
- [ ] Run all tests. Expected: PASS.

### Task 8: Analysis mode made obvious

**Files:**
- Create: `src/components/mode-badge.tsx`
- Modify:
  - `src/app/page.tsx`
  - `src/app/uploads/[id]/layout.tsx` (header)
  - `src/app/uploads/[id]/page.tsx`
  - `src/lib/server/uploads.ts` (list counts)

**Interfaces:**
- Produces:
  - `ModeBadge({ provider })`, which shows "AI mode · Gemini" or "Basic mode · English only"
  - `UploadListItem` gains `notLabeled` and `failed`
- [ ] Test: `listUploads` returns `notLabeled` and `failed` counts for the owner's uploads.
- [ ] A Basic-mode dashboard with `notLabeled > 0` shows a Notice: Basic mode reads English only; this upload keeps Basic mode; upload the file again to label Tagalog and Taglish in AI mode. It links to `/upload` and is shown only when the server has Gemini configured; otherwise it says AI mode isn't set up.
- [ ] Check in a local browser.

### Task 9: Safer label-check upload flow

**Files:**
- Create: `fixtures/label-check-sample.csv` (20 synthetic reviews, English and Taglish, `review_text,stars,my_label`)
- Modify: `src/components/upload/upload-wizard.tsx`, `src/lib/csv/columns.ts`
- Test: `tests/server/label-check-fixture.test.ts`

**Interfaces:**
- Produces `textColumnProblem(values: string[]): string | null` in `columns.ts`. It uses `labelColumnLooksValid` and returns "This column holds labels like positive, neutral or negative, not review text. Choose the column with what customers wrote."
- [ ] Tests:
  - `textColumnProblem` is set for a label column and null for real text
  - the fixture end to end: Papa parse, `guessColumnMapping` (text = `review_text`, label = `my_label`), `prepareRow`, `ingestRows`, MockProvider analysis, then `getDashboard` returns a label check with `eligible` equal to the labeled rows and `source: "label"`
- [ ] Wizard:
  - `mappingProblem` includes `textColumnProblem`
  - the mapping step says "No label column — there will be no label check" when `mapping.label` is null
  - the preview says "Label check: on (column my_label)" or off
- [ ] Check in a local browser with the fixture.

### Task 10: Docs and setup

**Files:**
- Create: `supabase/manual/assign-existing-uploads.sql`
- Modify: `README.md`, `.env.example`, `docs/accuracy-check.md`
- [ ] The assign script:
  - sets the email in one place
  - raises an exception unless exactly one confirmed user matches
  - updates `owner_id` where it is null
  - reports the count
- [ ] Docs: setup order, Supabase settings (email confirmation, URL configuration, recommended email templates, custom SMTP), Vercel env vars, limits, and the 150-file status.

### Task 11: Review and verify

- [ ] Run a security review of the diff: auth bypasses, cross-user access, unprotected routes, data exposure, migration safety, quota abuse. Fix critical and high findings.
- [ ] Run `npm test`, `TEST_DATABASE_URL=… npx vitest run tests/server`, `npm run lint`, `npm run typecheck` and `npm run build`. Expected: all pass.
