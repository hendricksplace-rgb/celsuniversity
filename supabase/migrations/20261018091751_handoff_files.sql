create table if not exists public.handoff_files (path text primary key, content text not null, source text, uploaded_at timestamptz not null default now());
alter table public.handoff_files enable row level security;
revoke all on public.handoff_files from anon, authenticated;
comment on table public.handoff_files is 'Source files copied from the old Base44 CelsU app for Claude Code to port (English evaluation). Service role only. Drop after porting.';
insert into public.job_tokens(name) values ('handoff') on conflict do nothing;
