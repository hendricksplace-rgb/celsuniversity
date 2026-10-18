-- Scheduled jobs. Run ONCE in the Supabase SQL editor (pg_cron and DELETE statements time out through the
-- MCP migration tool, which waits for a confirmation it can't show). Safe to run again: each job is
-- unscheduled first. Not run yet as of 2026-10-18: until it is, none of these jobs happen.
--
--   eval-followups   09:00 Mexico City: the evaluation follow-up emails (D1/D3/D7/D30) to leads who asked
--                    for them (public.leads is empty today, so nothing goes out until real people evaluate).
--   eval-cleanup     nightly: anonymous or unfinished evaluation sessions after 7 days, rate-limit rows
--                    after 1 day. A signed-in student's finished sessions stay (level history on Progreso).
--   resume-ready     every 15 min: "Tu revisión de resume está lista" when the 48-hour hold ends.
--   error-log-purge  nightly: client_errors and function_errors older than 90 days (privacy notice §2,
--                    "Registros de errores"; Matt, 2026-10-18).
create extension if not exists pg_cron;

create or replace function private.purge_error_logs()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.client_errors where at < now() - interval '90 days';
  delete from public.function_errors where at < now() - interval '90 days';
$$;
revoke all on function private.purge_error_logs() from public, anon, authenticated;

select cron.unschedule(jobname) from cron.job where jobname in ('eval-followups', 'eval-cleanup', 'resume-ready', 'error-log-purge');

select cron.schedule('eval-followups', '0 15 * * *', $$select private.kick_followups()$$);

select cron.schedule('eval-cleanup', '17 4 * * *', $$
  delete from public.eval_sessions where created_at < now() - interval '7 days' and (user_id is null or finished_at is null);
  delete from public.eval_rate_limits where window_start < now() - interval '1 day';
$$);

select cron.schedule('resume-ready', '*/15 * * * *', $$select private.kick_resume_ready()$$);

select cron.schedule('error-log-purge', '37 4 * * *', $$select private.purge_error_logs()$$);

-- Check: four rows, all active.
select jobname, schedule, active from cron.job order by jobname;
