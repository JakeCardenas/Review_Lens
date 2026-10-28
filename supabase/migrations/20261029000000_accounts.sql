-- Accounts: each upload belongs to one signed-in user, and usage counters back the daily limits.
-- Additive only. Existing uploads keep owner_id null, which hides them from every user until
-- supabase/manual/assign-existing-uploads.sql gives them to an account. Nothing is deleted.

alter table public.uploads add column if not exists owner_id uuid;

create index if not exists uploads_owner_created_idx on public.uploads (owner_id, created_at desc);

-- Supabase keeps accounts in auth.users. Plain Postgres (tests, local) has no auth schema, so the
-- link is only added where that table exists. Deleting an account deletes its uploads.
do $$
begin
  if to_regclass('auth.users') is not null
    and not exists (select 1 from pg_constraint where conname = 'uploads_owner_id_fkey') then
    alter table public.uploads
      add constraint uploads_owner_id_fkey foreign key (owner_id) references auth.users (id) on delete cascade;
  end if;
end
$$;

-- How much of each daily limit has been used: new uploads and reviews sent to Gemini, per account
-- and for the whole app. Days follow Pacific time, when Gemini's free-tier quota resets.
create table if not exists public.usage_counters (
  scope text not null,
  subject text not null,
  day date not null,
  used integer not null default 0 check (used >= 0),
  primary key (scope, subject, day)
);

alter table public.usage_counters enable row level security;

do $$
declare
  client_role text;
begin
  foreach client_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = client_role) then
      execute format('revoke all on table public.usage_counters from %I', client_role);
    end if;
  end loop;
end
$$;
