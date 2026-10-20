-- CelsGLOBAL guided-course template: one page per module (step), the student's progress per step, and the student's resume.
create or replace function private.module_course(p_module_id uuid)
 returns uuid
 language sql
 stable
 security definer
 set search_path to ''
as $$ select course_id from public.modules where id = p_module_id $$;

create table public.guided_course_steps (
  module_id uuid primary key references public.modules(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.guided_course_steps enable row level security;
create policy guided_course_steps_select on public.guided_course_steps for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.module_course(module_id)));
create policy guided_course_steps_write on public.guided_course_steps for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.guided_step_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  state jsonb not null default '{}'::jsonb check (pg_column_size(state) <= 100000),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);
create index guided_step_progress_module_idx on public.guided_step_progress(module_id);
alter table public.guided_step_progress enable row level security;
create policy guided_step_progress_select on public.guided_step_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy guided_step_progress_insert on public.guided_step_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy guided_step_progress_update on public.guided_step_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- The student's resume: owner only (nobody else reads it; it goes to the AI only when the student sends it).
create table public.resumes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 300000),
  updated_at timestamptz not null default now()
);
alter table public.resumes enable row level security;
create policy resumes_select on public.resumes for select to authenticated using (user_id = (select auth.uid()));
create policy resumes_insert on public.resumes for insert to authenticated with check (user_id = (select auth.uid()));
create policy resumes_update on public.resumes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy resumes_delete on public.resumes for delete to authenticated using (user_id = (select auth.uid()));
