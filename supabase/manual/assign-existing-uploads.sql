-- Gives the uploads made before accounts existed to one ReviewLens account.
--
-- Run it once in the Supabase SQL Editor, AFTER the account has signed up and confirmed its email.
-- Change only the email address on the line marked below, then press Run.
--
-- It changes nothing unless exactly one confirmed account has that email. The result row shows
-- matching_accounts (should be 1) and uploads_assigned (how many uploads moved). Uploads that
-- already belong to an account are never touched, and nothing is deleted.

with target as (
  select id
  from auth.users
  where lower(email) = lower('your-email@example.com') -- ← put the account's email here
    and email_confirmed_at is not null
),
chosen as (
  select id from target where (select count(*) from target) = 1
),
assigned as (
  update public.uploads
  set owner_id = (select id from chosen)
  where owner_id is null and exists (select 1 from chosen)
  returning id
)
select
  (select count(*)::int from target) as matching_accounts,
  (select count(*)::int from assigned) as uploads_assigned;
