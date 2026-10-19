-- CelsBSNS Speaking Practice: per-lesson content, best try text per exercise (no audio), and rep counts.
create table public.speaking_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.speaking_content enable row level security;
create policy speaking_content_select on public.speaking_content for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.lesson_course(lesson_id)));
create policy speaking_content_write on public.speaking_content for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.speaking_best (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  exercise smallint not null check (exercise between 1 and 3),
  text text not null check (char_length(text) <= 5000),
  duration_s numeric check (duration_s >= 0 and duration_s <= 600),
  points smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id, exercise)
);
create index speaking_best_lesson_idx on public.speaking_best(lesson_id);
alter table public.speaking_best enable row level security;
create policy speaking_best_select on public.speaking_best for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy speaking_best_insert on public.speaking_best for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy speaking_best_update on public.speaking_best for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.speaking_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  reps int[] not null default '{0,0,0}' check (array_length(reps, 1) = 3),
  partner_feedback int[] not null default '{0,0,0}' check (array_length(partner_feedback, 1) = 3),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index speaking_progress_lesson_idx on public.speaking_progress(lesson_id);
alter table public.speaking_progress enable row level security;
create policy speaking_progress_select on public.speaking_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy speaking_progress_insert on public.speaking_progress for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy speaking_progress_update on public.speaking_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
