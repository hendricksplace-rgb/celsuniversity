-- C-048: a teacher sees THEIR classes only (students, progress, the classes' courses and their teacher-only
-- content), never the whole school. Before this, 'teacher' was in private.is_staff(), which opened every course,
-- every student's profile, progress, submissions, interview answers, resume reviews and the audit log.
-- Nobody had the teacher role when this ran (2026-11-23), so nothing is taken away from anyone.
-- The class-teacher rules are added as extra permissive policies ("..._class_teacher"); the staff/admin/own-row
-- policies are untouched.

-- 1. Staff = school admins only.
create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path to '' as $$
  select coalesce((select role in ('super_admin','director','administrator') from public.profiles where id = (select auth.uid())), false)
$$;

-- 2. The caller teaches an active class this user is a member of.
create or replace function private.teaches_user(p_user uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.class_members t
    join public.class_members s on s.class_id = t.class_id
    join public.classes c on c.id = t.class_id and c.status = 'active'
    where t.user_id = (select auth.uid()) and t.member_role = 'teacher' and s.user_id = p_user
  )
$$;

-- 3. The caller teaches an active class that has this course.
create or replace function private.teaches_course(p_course uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.class_members t
    join public.class_courses cc on cc.class_id = t.class_id
    join public.classes c on c.id = t.class_id and c.status = 'active'
    where t.user_id = (select auth.uid()) and t.member_role = 'teacher' and cc.course_id = p_course
  )
$$;

revoke all on function private.teaches_user(uuid) from public;
revoke all on function private.teaches_course(uuid) from public;
grant execute on function private.teaches_user(uuid) to authenticated;
grant execute on function private.teaches_course(uuid) to authenticated;

-- 4. Teacher-only lessons and blocks (Teachersbook, teacher guides) of the courses they teach.
drop policy if exists lessons_class_teacher on public.lessons;
create policy lessons_class_teacher on public.lessons for select to authenticated
  using (teacher_only and status = 'published' and private.teaches_course(private.module_course(module_id)));

drop policy if exists content_blocks_class_teacher on public.content_blocks;
create policy content_blocks_class_teacher on public.content_blocks for select to authenticated
  using (teacher_only and private.teaches_course(private.lesson_course(lesson_id)));

-- 5. The class roster: everyone in the classes they teach.
drop policy if exists class_members_class_teacher on public.class_members;
create policy class_members_class_teacher on public.class_members for select to authenticated
  using (private.is_class_teacher(class_id));

-- 6. Their students' profile and learning data (read only).
do $$
declare t text;
begin
  foreach t in array array['progress','gamification','enrollments','guided_step_progress','evaluation_attempts',
    'reading_progress','speaking_progress','speaking_best','submissions','capstone_parts','course_commitments',
    'research_entries','research_reflections','video_proofs','xp_events']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_class_teacher', t);
    execute format('create policy %I on public.%I for select to authenticated using (private.teaches_user(user_id))', t || '_class_teacher', t);
  end loop;
end $$;

drop policy if exists profiles_class_teacher on public.profiles;
create policy profiles_class_teacher on public.profiles for select to authenticated
  using (private.teaches_user(id));
