-- C-049 demo: Nico Ornelas is the DIRECTOR of Demo ESL (and keeps teaching both classes). Replaces the C-048
-- attach function used by the sign-up trigger, and applies it now if he already has an account.
-- Undo: supabase/demo/c048_demo_esl_class_remove.sql (also resets his role and organization).
create or replace function private.c048_attach_demo_teacher(p_user uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.profiles
  set role = 'director', organization_id = (select id from public.organizations where legacy_id = 'demo-c048')
  where id = p_user and role in ('individual_student', 'student', 'teacher');
  insert into public.class_members (class_id, user_id, member_role)
  select c.id, p_user, 'teacher' from public.classes c
  where c.legacy_id in ('demo-c048-houston', 'demo-c048-dallas')
    and not exists (select 1 from public.class_members m where m.class_id = c.id and m.user_id = p_user);
end $$;
revoke all on function private.c048_attach_demo_teacher(uuid) from public, anon, authenticated;

do $$
declare v_nico uuid := (select id from public.profiles where lower(email) = 'nicoornelas93@gmail.com');
begin
  if v_nico is not null then perform private.c048_attach_demo_teacher(v_nico); end if;
end $$;
