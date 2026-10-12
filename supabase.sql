-- Run once in Supabase (SQL editor). Only the server's service key may access it.
create table if not exists public.site_kv (
  key text primary key,
  value jsonb not null
);
alter table public.site_kv enable row level security;  -- no policies = no public access
