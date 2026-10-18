-- Public English evaluation (/evaluacion): sessions, rate limit, lead emails and follow-up outbox.

-- One lead per email address (case-insensitive); unsubscribe links carry a per-lead token, not the email.
create unique index if not exists leads_email_lower_key on public.leads (lower(email));
alter table public.leads add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

-- One evaluation attempt. Service role only: the edge function `evaluation` reads and writes it.
create table public.eval_sessions (
  token uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '45 minutes',
  ai_calls int not null default 0,
  writing jsonb,
  writing_text text,
  speaking jsonb,
  finished_at timestamptz,
  result jsonb
);
create index eval_sessions_created_idx on public.eval_sessions (created_at);
alter table public.eval_sessions enable row level security;
revoke all on public.eval_sessions from anon, authenticated;

create table public.eval_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);
alter table public.eval_rate_limits enable row level security;
revoke all on public.eval_rate_limits from anon, authenticated;

-- Counts one evaluation start for an address; false once it is over p_max in the window.
create or replace function public.eval_rate_hit(p_ip_hash text, p_max int default 3, p_window interval default '1 hour')
returns boolean language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.eval_rate_limits as r (ip_hash, window_start, count) values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    count = case when r.window_start < now() - p_window then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - p_window then now() else r.window_start end
  returning count into n;
  return n <= p_max;
end $$;
revoke all on function public.eval_rate_hit(text, int, interval) from public, anon, authenticated;
grant execute on function public.eval_rate_hit(text, int, interval) to service_role;

-- Takes one AI scoring call from a live session; false when the session is expired, finished or used up.
create or replace function public.eval_take_ai_call(p_token uuid, p_max int default 4)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update public.eval_sessions set ai_calls = ai_calls + 1
     where token = p_token and ai_calls < p_max and expires_at > now() and finished_at is null
    returning 1)
  select exists (select 1 from u)
$$;
revoke all on function public.eval_take_ai_call(uuid, int) from public, anon, authenticated;
grant execute on function public.eval_take_ai_call(uuid, int) to service_role;

-- Every email the evaluation sends (results, D1/D3/D7, D30). 'stubbed' until Resend is connected.
create table public.email_outbox (
  id bigserial primary key,
  lead_id uuid references public.leads(id) on delete set null,
  to_email text not null,
  kind text not null,
  subject text not null,
  html text not null,
  status text not null default 'stubbed' check (status in ('stubbed', 'sent', 'error')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;
grant select on public.email_outbox to authenticated;
create policy admin_read on public.email_outbox for select to authenticated using ((select private.is_admin()));

-- Daily follow-ups: called by pg_cron (eval_followups_cron); job token checked in the edge function.
insert into public.job_tokens (name) values ('followups') on conflict (name) do nothing;
create or replace function private.kick_followups() returns bigint language plpgsql security definer set search_path = '' as $$
declare anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key');
begin
  if anon is null then raise exception 'Vault secret supabase_anon_key is missing'; end if;
  return net.http_post(url := 'https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/eval-followups',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'x-job-token',(select token::text from public.job_tokens where name='followups')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
end $$;
revoke all on function private.kick_followups() from public, anon, authenticated;
