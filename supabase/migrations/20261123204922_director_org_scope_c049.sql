-- C-049: a director runs ONE school (organization): they read its locations (classes), the students in them and
-- their progress, and the courses linked to those classes (with the teacher-only content), and nothing else.
-- Before this, 'director' was in private.is_staff() AND private.is_admin(): every course and student, the audit
-- log, and write access to courses, lessons, profiles, enrollments, orders, payments, products and settings.
-- Nobody had the director role when this ran (2026-11-23), so nothing is taken away from anyone.
-- A director writes nothing here: every new policy is SELECT only.

-- 1. Staff and admin = our own team only.
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select role in ('super_admin','administrator') from public.profiles where id = (select auth.uid())), false)
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select role in ('super_admin','administrator') from public.profiles where id = (select auth.uid())), false)
$$;

-- 2. The caller is the director of this organization.
create or replace function private.directs_org(p_org uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select p_org is not null and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'director' and p.organization_id = p_org
  )
$$;

-- 3. The class belongs to a school the caller directs.
create or replace function private.directs_class(p_class uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.classes c where c.id = p_class and private.directs_org(c.organization_id))
$$;

-- 4. The user is in an active class of a school the caller directs (students and their teachers).
create or replace function private.directs_user(p_user uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id and c.status = 'active'
    where m.user_id = p_user and private.directs_org(c.organization_id)
  )
$$;

-- 5. The course is linked to an active class of a school the caller directs.
create or replace function private.directs_course(p_course uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.class_courses cc
    join public.classes c on c.id = cc.class_id and c.status = 'active'
    where cc.course_id = p_course and private.directs_org(c.organization_id)
  )
$$;

revoke all on function private.directs_org(uuid) from public;
revoke all on function private.directs_class(uuid) from public;
revoke all on function private.directs_user(uuid) from public;
revoke all on function private.directs_course(uuid) from public;
grant execute on function private.directs_org(uuid) to authenticated;
grant execute on function private.directs_class(uuid) to authenticated;
grant execute on function private.directs_user(uuid) to authenticated;
grant execute on function private.directs_course(uuid) to authenticated;

-- 6. Course access: + the courses of the director's school (same as their teachers).
create or replace function private.has_course_access(p_course uuid)
returns boolean language sql stable security definer set search_path to '' as $$
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
  or private.directs_course(p_course)
$$;

-- 7. Read-only policies for the director (permissive, next to the existing ones).
drop policy if exists classes_org_director on public.classes;
create policy classes_org_director on public.classes for select to authenticated
  using (private.directs_org(organization_id));

do $$
declare t text;
begin
  foreach t in array array['class_members','class_courses','class_assignments'] loop
    execute format('drop policy if exists %I on public.%I', t || '_org_director', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.directs_class(class_id))', t || '_org_director', t);
  end loop;
  foreach t in array array['progress','gamification','enrollments','guided_step_progress','evaluation_attempts',
    'reading_progress','speaking_progress','speaking_best','submissions','capstone_parts','course_commitments',
    'research_entries','research_reflections','video_proofs','xp_events'] loop
    execute format('drop policy if exists %I on public.%I', t || '_org_director', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.directs_user(user_id))', t || '_org_director', t);
  end loop;
end $$;

drop policy if exists profiles_org_director on public.profiles;
create policy profiles_org_director on public.profiles for select to authenticated
  using (private.directs_user(id));

-- organizations: the existing select policy already lets anyone read their own organization's row.

drop policy if exists lessons_org_director on public.lessons;
create policy lessons_org_director on public.lessons for select to authenticated
  using (teacher_only and status = 'published' and private.directs_course(private.module_course(module_id)));

drop policy if exists content_blocks_org_director on public.content_blocks;
create policy content_blocks_org_director on public.content_blocks for select to authenticated
  using (teacher_only and private.directs_course(private.lesson_course(lesson_id)));
