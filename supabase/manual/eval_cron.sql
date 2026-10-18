-- Run once in the Supabase SQL editor (pg_cron times out through the migration tool).
-- Daily evaluation follow-ups at 09:00 Mexico City (15:00 UTC), and a nightly cleanup of
-- finished/expired evaluation sessions and old rate-limit rows.
create extension if not exists pg_cron;

select cron.schedule('eval-followups', '0 15 * * *', $$select private.kick_followups()$$);

select cron.schedule('eval-cleanup', '17 4 * * *', $$
  delete from public.eval_sessions where created_at < now() - interval '7 days';
  delete from public.eval_rate_limits where window_start < now() - interval '1 day';
$$);
