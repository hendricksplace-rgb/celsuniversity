-- Once the password is set, every outstanding invitation for that person stops working, not only the one
-- that was clicked (an older or re-sent link could otherwise still open a recovery session for 30 days).
create or replace function public.mark_invite_activated() returns void
language sql volatile security definer set search_path = '' as $$
  update public.student_invites set activated_at = now()
  where user_id = (select auth.uid()) and activated_at is null
$$;
