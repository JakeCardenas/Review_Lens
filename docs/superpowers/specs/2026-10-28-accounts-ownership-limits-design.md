# Accounts, upload ownership and usage limits — design

Date: 2026-10-28. Source: Jake's spec (pasted in the session), plus the calls marked **(builder's call)** below.

## Why

ReviewLens is live with no sign-in. Every page and API action trusts an upload ID alone, the home page lists everyone's uploads, and anyone can spend the shared Gemini free-tier quota. The app needs accounts, per-user ownership checked on the server, and limits, without losing or exposing the existing uploads.

## Goals

- Anyone can create an account with a personal email (Gmail is fine) and a password made just for ReviewLens: sign-up, email verification, sign-in, sign-out, password reset.
- Each user sees and manages only their own uploads. Every page and API action checks the signed-in user on the server, and every database query is scoped to that user.
- Per-user limits on uploads and on Gemini analysis protect the free tier.
- Existing uploads keep their data and their original analysis mode, stay hidden from everyone, and can be assigned to Jake's account with a manual SQL script.
- Each upload's analysis mode is obvious, and Basic-mode uploads explain how to get Tagalog/Taglish labels (upload again in AI mode).
- The label-check upload flow can't silently lose the label column, and it is verified with a synthetic fixture.

## Non-goals and anti-goals

- No Google or other OAuth, no roles (one kind of user), no team features, no paid services, no paid Gemini fallback, no model training.
- Never ask for or use Gmail, SPUP SIAS or school passwords.
- No public demo of anyone's uploads. (A synthetic read-only demo was optional; it is left out, since sign-up is open. **(builder's call)**)
- No reanalysis or mode change of existing uploads.
- No production SQL, commits, pushes or deploys by the builder.

## Constraints

- Next.js 16.4 (`proxy.ts` replaces `middleware.ts`), Supabase Postgres reached directly with postgres.js (`DATABASE_URL`), Vercel Hobby, Gemini free tier.
- Supabase guidance: `@supabase/ssr` server client with cookies; refresh sessions in the proxy; trust only `auth.getClaims()` on the server, never `getSession()`.
- Supabase's built-in email sender only delivers to the project team's addresses, 2 emails per hour. Open sign-up needs a custom SMTP provider with a free tier (setup step for Jake).
- Supabase Auth limits sign-ups and sign-ins per IP address (30 per 5 minutes by default). Server-side calls come from Vercel, so all users share that bucket; it can be raised in the dashboard.
- Tests use synthetic users, mocked Supabase Auth and a fake Gemini; no live calls.

## Design

### Authentication

- `src/lib/supabase/server.ts`: `createServerClient` with Next's `cookies()` (getAll/setAll). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public by design; tables have no client grants).
- `src/proxy.ts`: refreshes the session with `getClaims()`. Signed-out requests to app pages redirect to `/sign-in?next=…`; signed-out API requests get 401 JSON. This is only the first check.
- `src/lib/server/auth.ts` (data access layer): `getCurrentUser()` (React `cache`, `getClaims()`, rejects anonymous users), `requireUser()` for pages (redirects), `requireApiUser()` for route handlers (401).
- Server actions: sign up, sign in, sign out, resend confirmation, request password reset, set new password. Inputs are validated with zod. The minimum password is 8 characters **(builder's call)**. Errors don't reveal whether an email has an account. `next` is accepted only as a same-site path.
- Email verification is required: Supabase's "Confirm email" (on by default) plus the app's own check. Sign-in refuses unconfirmed accounts, and a sign-up that returns a session without confirmation is signed out.
- `/auth/confirm` handles both link styles: `token_hash` + `type` (`verifyOtp`, which works on any device and needs the recommended email templates) and `code` (`exchangeCodeForSession`, the default templates, same browser only). Recovery links lead to `/reset-password`.
- Sign-up copy: "Create a new password just for ReviewLens. Don't use your Gmail or school (SIAS) password."

### Ownership

- Migration `20261029000000_accounts.sql`, additive only:
  - `uploads.owner_id uuid` (nullable), with an index on `(owner_id, created_at desc)`
  - a foreign key to `auth.users(id) on delete cascade`, added only when `auth.users` exists (so plain Postgres and the tests still apply it)
  - a `usage_counters` table with RLS on and client grants revoked
- Existing uploads get `owner_id null`. Every query filters by owner, so nobody sees them.
- `supabase/manual/assign-existing-uploads.sql` assigns the ownerless uploads to one confirmed account by email. It checks that exactly one confirmed user matches and reports how many uploads moved. Jake runs it after signing up.
- Every data function takes the owner. `getOwnedUpload(db, ownerId, id)` returns null for someone else's upload, so callers answer 404, the same as a missing upload. Review-level queries (`buildWhere`) scope `r.upload_id` with an uncorrelated subquery that also checks the owner, so they return nothing for another user's ID.
- Pages (`/`, `/upload`, every `/uploads/[id]/…` page) call `requireUser()`. Every API route calls `requireApiUser()`, and mutating routes also check the request's origin. A test scans `src/app` so a new page or route can't skip the check.

### Limits (env-overridable defaults) (builder's call)

- 10 new uploads per user per day, and at most 25 stored uploads per user.
- AI mode: 2,500 reviews per user per day and 10,000 per day for the whole app. These are reserved just before each Gemini batch, so a partial batch is cut down and the rest is put back.
- When a limit is reached, analysis pauses with a clear message and can be resumed after the reset.
- Days reset at midnight Pacific time, the same time Gemini's daily quota resets.
- The existing limits stay: 5 MB, 5,000 rows per upload, 25 reviews per Gemini request.

### Analysis mode

- The upload list and dashboard show a badge for each upload ("AI mode · Gemini" or "Basic mode · English only") and its labeled, not-labeled and failed counts.
- A Basic-mode dashboard with unlabeled reviews explains:
  - Basic mode reads English only.
  - The upload keeps its original mode.
  - A link starts a new upload, which uses AI mode when the server has a Gemini key.
- Existing safeguards stay: analysis refuses an upload whose mode differs from the server's (`PROVIDER_CHANGED`).

### Label-check flow

- Mapping step:
  - It blocks a "Review text" column whose values are mostly positive/neutral/negative labels, which is the mistake seen in production.
  - With no label column matched, it says there will be no label check.
- The preview says whether the label check is on, and which column it uses.
- `fixtures/label-check-sample.csv` holds synthetic reviews with `my_label`. A test runs it end to end: column guess, preparing rows, ingest, mock analysis and the dashboard check. It is also checked by hand in a local browser.
- `docs/accuracy-check.md` states that the 150-review file isn't in the repo and isn't labeled yet, so no accuracy improvement is claimed.

## Left to the builder

Component layout of the auth pages within the existing design system, exact wording, the test structure, and the order of work.
