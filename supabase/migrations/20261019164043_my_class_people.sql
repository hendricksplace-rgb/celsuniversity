-- Mis clases: the names a student may see. RLS on class_members/profiles shows a student only their own row, so this
-- returns, for the caller only: the members of the classes they belong to, and the people who reviewed their own
-- submissions or assigned work to their classes. Names and roles only.
create or replace function public.my_class_people()
returns table (class_id uuid, user_id uuid, member_role text, display_name text)
language sql stable security definer set search_path = ''
as $$
  with mine as (
    select cm.class_id from public.class_members cm where cm.user_id = (select auth.uid())
  )
  select m.class_id, m.user_id, m.member_role::text, p.display_name
    from public.class_members m join mine using (class_id)
    left join public.profiles p on p.id = m.user_id
  union
  select null::uuid, s.reviewed_by, 'reviewer', p.display_name
    from public.submissions s left join public.profiles p on p.id = s.reviewed_by
   where s.user_id = (select auth.uid()) and s.reviewed_by is not null
  union
  select a.class_id, a.created_by, 'assigner', p.display_name
    from public.class_assignments a join mine using (class_id)
    left join public.profiles p on p.id = a.created_by
   where a.created_by is not null
$$;
revoke all on function public.my_class_people() from public, anon;
grant execute on function public.my_class_people() to authenticated;
