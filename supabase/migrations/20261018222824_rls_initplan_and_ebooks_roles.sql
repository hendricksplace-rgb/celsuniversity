-- Supabase advisors (2026-10-18), the parts that don't need to drop anything:
-- * "auth RLS initplan": wrap auth.uid() as (select auth.uid()) so it is evaluated once per query.
-- * ebooks: admin_all and ebooks_read applied to every role (anon, authenticator…); scope both to
--   authenticated. Visitors could not see any e-book before either (they need course access).
alter policy "own prefs read" on public.user_preferences using (user_id = (select auth.uid()));
alter policy "own prefs insert" on public.user_preferences with check (user_id = (select auth.uid()));
alter policy "own prefs update" on public.user_preferences
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own deletion request insert" on public.account_deletion_requests with check (user_id = (select auth.uid()));
alter policy "own deletion request read" on public.account_deletion_requests using (user_id = (select auth.uid()));

alter policy admin_all on public.ebooks to authenticated;
alter policy ebooks_read on public.ebooks to authenticated;
