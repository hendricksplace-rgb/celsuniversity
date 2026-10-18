-- CelsGLOBAL AI tools: Resume Review and Interview Practice (celsu-ai-tools-spec.md).
-- Rows are written by the `ai-tools` edge function (service role); students read their own, staff all.

-- Who may use them: staff, or anyone with access to the CelsGLOBAL resume or interview course.
create or replace function public.can_use_ai_tools() returns boolean
language sql stable security definer set search_path to '' as $$
  select private.is_staff() or exists (
    select 1 from public.courses c
    where c.slug in ('from-cv-to-u-s-resume-a-step-by-step-guide', 'crack-the-u-s-interview-code')
      and private.has_course_access(c.id)
  );
$$;
revoke all on function public.can_use_ai_tools() from public, anon;
grant execute on function public.can_use_ai_tools() to authenticated;

-- Resume Review: evaluated right away, revealed after the 48-hour hold.
create table public.resume_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  file_path text,
  file_name text,
  original_text text not null,
  result jsonb,
  status text not null default 'evaluating' check (status in ('evaluating', 'ready', 'invalid', 'failed')),
  created_at timestamptz not null default now(),
  unlock_at timestamptz not null default now() + interval '48 hours',
  notified_at timestamptz
);
create index resume_reviews_user on public.resume_reviews (user_id, created_at desc);
create index resume_reviews_due on public.resume_reviews (unlock_at) where notified_at is null and status = 'ready';
alter table public.resume_reviews enable row level security;
-- Students don't read the table directly (the result stays hidden until unlock_at): my_resume_reviews().
create policy resume_reviews_staff on public.resume_reviews for select to authenticated using ((select private.is_staff()));

create or replace function public.my_resume_reviews()
returns table (id uuid, file_name text, status text, created_at timestamptz, unlock_at timestamptz, result jsonb, original_text text)
language sql stable security definer set search_path to '' as $$
  select r.id, r.file_name, r.status, r.created_at, r.unlock_at,
         case when r.status = 'invalid' or now() >= r.unlock_at then r.result end,
         case when now() >= r.unlock_at then r.original_text end
  from public.resume_reviews r
  where r.user_id = auth.uid()
  order by r.created_at desc;
$$;
revoke all on function public.my_resume_reviews() from public, anon;
grant execute on function public.my_resume_reviews() to authenticated;

-- Interview Practice.
create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('full', 'single', 'random')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb
);
create index interview_sessions_user on public.interview_sessions (user_id, started_at desc);
create table public.interview_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_key text not null,
  audio_path text,
  transcript text,
  duration_s numeric,
  feedback jsonb,
  score smallint,
  created_at timestamptz not null default now()
);
create index interview_answers_session on public.interview_answers (session_id, created_at);
create index interview_answers_user on public.interview_answers (user_id, question_key);
alter table public.interview_sessions enable row level security;
alter table public.interview_answers enable row level security;
create policy interview_sessions_read on public.interview_sessions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy interview_answers_read on public.interview_answers for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

-- Private uploads, one folder per student: resumes and spoken answers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('resumes', 'resumes', false, 5242880, array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('interview-audio', 'interview-audio', false, 26214400, null)
on conflict (id) do nothing;
create policy ai_files_own on storage.objects for all to authenticated
  using (bucket_id in ('resumes', 'interview-audio') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('resumes', 'interview-audio') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy ai_files_staff_read on storage.objects for select to authenticated
  using (bucket_id in ('resumes', 'interview-audio') and (select private.is_staff()));

-- "Tu revisión de resume está lista": every 15 minutes (supabase/manual/eval_cron.sql) the job asks
-- ai-tools to email the reviews whose hold has ended.
insert into public.job_tokens (name, token) values ('ai-tools', gen_random_uuid()) on conflict do nothing;
create or replace function private.kick_resume_ready() returns bigint language plpgsql security definer set search_path = '' as $$
declare anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key');
begin
  if not exists (select 1 from public.resume_reviews where status = 'ready' and notified_at is null and unlock_at <= now()) then return null; end if;
  if anon is null then raise exception 'Vault secret supabase_anon_key is missing'; end if;
  return net.http_post(url := 'https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/ai-tools',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'x-job-token',(select token::text from public.job_tokens where name='ai-tools')),
    body := '{"action":"notify_resumes"}'::jsonb, timeout_milliseconds := 60000);
end $$;
revoke all on function private.kick_resume_ready() from public, anon, authenticated;
