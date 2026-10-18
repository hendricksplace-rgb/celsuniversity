-- Error monitoring (batch 3 §4): browser errors and Edge Function failures, read by staff on /app/admin/errores.

create table public.client_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  session_id text not null,
  route text,
  message text not null,
  stack text,
  user_agent text,
  kind text not null default 'error' check (kind in ('error', 'unhandledrejection', 'boundary'))
);
create index client_errors_at_idx on public.client_errors (at desc);
create index client_errors_session_idx on public.client_errors (session_id, at);
create index client_errors_user_id_idx on public.client_errors (user_id);
alter table public.client_errors enable row level security;
create policy client_errors_staff_read on public.client_errors for select to authenticated using ((select private.is_staff()));

create table public.function_errors (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  function text not null,
  status int,
  message text not null
);
create index function_errors_at_idx on public.function_errors (at desc);
alter table public.function_errors enable row level security;
create policy function_errors_staff_read on public.function_errors for select to authenticated using ((select private.is_staff()));

-- Anyone (signed in or not) can report an error, through this function only:
-- at most 20 per browser session per day, and 5,000 per hour overall, with long fields cut.
create or replace function public.log_client_error(
  p_session_id text, p_route text, p_message text, p_stack text default null, p_user_agent text default null, p_kind text default 'error'
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  sid text := left(coalesce(nullif(trim(p_session_id), ''), 'none'), 64);
begin
  if coalesce(trim(p_message), '') = '' then return false; end if;
  if (select count(*) from public.client_errors where session_id = sid and at > now() - interval '1 day') >= 20 then return false; end if;
  if (select count(*) from public.client_errors where at > now() - interval '1 hour') >= 5000 then return false; end if;
  insert into public.client_errors (user_id, session_id, route, message, stack, user_agent, kind)
  values ((select auth.uid()), sid, left(p_route, 300), left(p_message, 1000), left(p_stack, 4000), left(p_user_agent, 300),
          case when p_kind in ('error', 'unhandledrejection', 'boundary') then p_kind else 'error' end);
  return true;
end $$;
revoke all on function public.log_client_error(text, text, text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text, text, text) to anon, authenticated;
