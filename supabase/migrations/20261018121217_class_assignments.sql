-- Teachers assign a course (or one of its modules) to their class, with a due date and a short note.
create or replace function private.is_class_teacher(p_class uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.class_members m
                  where m.class_id = p_class and m.user_id = (select auth.uid()) and m.member_role = 'teacher')
$$;

create table public.class_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,
  note text check (char_length(note) <= 280),
  due_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index class_assignments_class_idx on public.class_assignments (class_id);
create index class_assignments_course_idx on public.class_assignments (course_id);
alter table public.class_assignments enable row level security;

-- Members of the class read its assignments; staff read all.
create policy member_read on public.class_assignments for select to authenticated
  using ((select private.is_staff()) or exists (
    select 1 from public.class_members m where m.class_id = class_assignments.class_id and m.user_id = (select auth.uid())));

-- Admins, and the teachers of that class, write. A module must belong to the assigned course.
create policy teacher_write on public.class_assignments for all to authenticated
  using ((select private.is_admin()) or private.is_class_teacher(class_id))
  with check (
    ((select private.is_admin()) or private.is_class_teacher(class_id))
    and (module_id is null or exists (select 1 from public.modules md where md.id = module_id and md.course_id = class_assignments.course_id)));

grant select, insert, update, delete on public.class_assignments to authenticated;

-- A student's own English evaluation history (eval_sessions is service-role only).
create or replace function public.my_evaluation_history()
returns table (evaluated_at timestamptz, level text)
language sql stable security definer set search_path to '' as $$
  select s.finished_at, s.result->>'band'
    from public.eval_sessions s
   where s.user_id = (select auth.uid()) and s.finished_at is not null and s.result ? 'band'
   order by s.finished_at
$$;
revoke all on function public.my_evaluation_history() from public, anon;
grant execute on function public.my_evaluation_history() to authenticated;
