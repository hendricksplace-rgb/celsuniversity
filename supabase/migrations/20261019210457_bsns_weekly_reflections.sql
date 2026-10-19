-- CelsBSNS Feedback & Progress: per-lesson content and a private weekly reflection (owner only, nobody else reads it).
create table public.feedback_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.feedback_content enable row level security;
create policy feedback_content_select on public.feedback_content for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.lesson_course(lesson_id)));
create policy feedback_content_write on public.feedback_content for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  week smallint not null check (week between 1 and 10),
  self_eval smallint[] not null default '{}' check (cardinality(self_eval) <= 6 and self_eval <@ array[0,1,2]::smallint[]),
  answers text[] not null default '{}' check (cardinality(answers) <= 3),
  confidence smallint check (confidence between 1 and 10),
  next_goal text check (char_length(next_goal) <= 300),
  focus text[] not null default '{}' check (cardinality(focus) <= 6),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, week)
);
create index weekly_reflections_course_idx on public.weekly_reflections(course_id);
alter table public.weekly_reflections enable row level security;
create policy weekly_reflections_select on public.weekly_reflections for select to authenticated
  using (user_id = (select auth.uid()));
create policy weekly_reflections_insert on public.weekly_reflections for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy weekly_reflections_update on public.weekly_reflections for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
