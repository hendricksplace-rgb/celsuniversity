-- Supabase advisor "signed-in users can execute SECURITY DEFINER function" (2026-10-18). Review in docs/security.md.
-- These two only read or change what the student's own RLS already allows, so they run as the caller.
alter function public.can_use_ai_tools() security invoker;
alter function public.renew_offline_downloads(text) security invoker;

-- Stays SECURITY DEFINER (students can't read resume_reviews; the result is hidden until unlock_at).
-- Only change: auth.uid() evaluated once.
create or replace function public.my_resume_reviews()
returns table (id uuid, file_name text, status text, created_at timestamptz, unlock_at timestamptz, result jsonb, original_text text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.file_name, r.status, r.created_at, r.unlock_at,
         case when r.status = 'invalid' or now() >= r.unlock_at then r.result end,
         case when now() >= r.unlock_at then r.original_text end
  from public.resume_reviews r
  where r.user_id = (select auth.uid())
  order by r.created_at desc;
$$;
