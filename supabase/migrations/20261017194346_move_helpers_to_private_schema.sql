create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.my_role() set schema private;
alter function public.is_admin() set schema private;
alter function public.is_staff() set schema private;
alter function public.has_course_access(uuid) set schema private;
alter function public.lesson_course(uuid) set schema private;
alter function public.path_course(text) set schema private;

create or replace function private.has_course_access(p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff()
  or exists (
    select 1 from public.enrollments e
    where e.user_id = (select auth.uid()) and e.status = 'active'
      and (e.expires_at is null or e.expires_at > now())
      and (e.course_id = p_course
           or e.program_id in (select pc.program_id from public.program_courses pc where pc.course_id = p_course))
  )
  or exists (
    select 1 from public.class_members m
    join public.class_courses cc on cc.class_id = m.class_id
    join public.classes c on c.id = m.class_id and c.status = 'active'
    where m.user_id = (select auth.uid()) and cc.course_id = p_course
  )
$$;

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() and (new.role is distinct from old.role or new.organization_id is distinct from old.organization_id) then
    raise exception 'Only administrators can change role or organization';
  end if;
  return new;
end $$;

create or replace function public.renew_offline_downloads(p_device text)
returns table (module_id uuid, expires_at timestamptz, allowed boolean)
language plpgsql security definer set search_path = '' as $$
begin
  update public.offline_downloads d
     set last_validated_at = now(), expires_at = now() + interval '7 days'
   where d.user_id = (select auth.uid()) and d.device_id = p_device and d.removed_at is null
     and private.has_course_access((select m.course_id from public.modules m where m.id = d.module_id));
  return query
    select d.module_id, d.expires_at,
           private.has_course_access((select m.course_id from public.modules m where m.id = d.module_id))
      from public.offline_downloads d
     where d.user_id = (select auth.uid()) and d.device_id = p_device and d.removed_at is null;
end $$;
revoke execute on function public.renew_offline_downloads(text) from public, anon;
grant execute on function public.renew_offline_downloads(text) to authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
