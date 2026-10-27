-- ReviewLens schema: uploads, the reviews in each upload, and row-level import/analysis messages.
--
-- Access model: the browser never connects to the database. The Next.js server connects with
-- DATABASE_URL (server-only). Row Level Security is enabled with no policies, and the client
-- roles used by Supabase's Data API get no grants, so a leaked publishable key reads nothing.
--
-- Not stored on purpose: the original CSV file, unmapped columns, reviewer names or IDs.

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  file_name text not null check (char_length(file_name) between 1 and 255),
  status text not null default 'importing'
    check (status in ('importing', 'analyzing', 'done', 'done_with_issues', 'failed')),
  column_map jsonb not null,
  has_date boolean not null default false,
  has_rating boolean not null default false,
  has_product boolean not null default false,
  date_format text check (date_format in ('ymd', 'mdy', 'dmy')),
  rating_scale smallint check (rating_scale in (5, 10, 100)),
  provider text not null,
  model text not null,
  topic_version text not null,
  total_rows integer not null check (total_rows between 1 and 5000),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz
);

create index uploads_created_at_idx on public.uploads (created_at desc);

create table public.reviews (
  id integer generated always as identity primary key,
  upload_id uuid not null references public.uploads (id) on delete cascade,
  row_number integer not null check (row_number >= 2),
  text text not null check (char_length(text) between 1 and 4000),
  review_date date,
  rating numeric(5, 2),
  product text check (char_length(product) <= 200),
  language text not null default 'und',
  language_status text not null
    check (language_status in ('supported', 'unsupported', 'mixed', 'undetermined')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'labeled', 'not_labeled', 'failed')),
  status_note text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  confidence text check (confidence in ('high', 'medium', 'low')),
  confidence_reasons text[] not null default '{}',
  model_output jsonb,
  topics text[] not null default '{}',
  keywords text[] not null default '{}',
  attempts smallint not null default 0,
  claimed_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('english', text)) stored,
  unique (upload_id, row_number),
  check (status <> 'labeled' or (sentiment is not null and confidence is not null))
);

create index reviews_upload_status_idx on public.reviews (upload_id, status);
create index reviews_upload_sentiment_idx on public.reviews (upload_id, sentiment);
create index reviews_upload_date_idx on public.reviews (upload_id, review_date);
create index reviews_topics_idx on public.reviews using gin (topics);
create index reviews_search_idx on public.reviews using gin (search);

create table public.upload_issues (
  id integer generated always as identity primary key,
  upload_id uuid not null references public.uploads (id) on delete cascade,
  row_number integer,
  stage text not null check (stage in ('import', 'analysis')),
  severity text not null check (severity in ('warning', 'error')),
  code text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- One message per row and problem, so a re-sent chunk doesn't duplicate messages.
create unique index upload_issues_row_code_idx on public.upload_issues (upload_id, row_number, code);

alter table public.uploads enable row level security;
alter table public.reviews enable row level security;
alter table public.upload_issues enable row level security;

-- Supabase creates the anon and authenticated roles; plain Postgres (tests, local) does not.
do $$
declare
  client_role text;
begin
  foreach client_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = client_role) then
      execute format('revoke all on table public.uploads, public.reviews, public.upload_issues from %I', client_role);
      execute format('revoke all on sequence public.reviews_id_seq, public.upload_issues_id_seq from %I', client_role);
    end if;
  end loop;
end
$$;
