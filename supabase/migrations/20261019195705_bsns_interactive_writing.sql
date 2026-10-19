-- CelsBSNS interactive writing task: richer submissions, per-lesson writing content, and the student's Capstone parts.
alter table public.submissions
  add column if not exists subject text check (subject is null or length(subject) <= 200),
  add column if not exists version integer not null default 1 check (version >= 1),
  add column if not exists parts_confirmed smallint[] not null default '{}',
  add column if not exists coach_good text,
  add column if not exists coach_improve text,
  add column if not exists coach_message text,
  -- Earlier sent versions ({version, subject, body, submitted_at, coach_*}) when the student improves and resends.
  add column if not exists history jsonb not null default '[]'::jsonb;

create table if not exists public.writing_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.writing_content enable row level security;
create policy writing_content_select on public.writing_content for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.lesson_course(lesson_id)));
create policy writing_content_write on public.writing_content for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table if not exists public.capstone_parts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  part smallint not null check (part between 1 and 10),
  source_submission_id uuid references public.submissions(id) on delete set null,
  title text,
  body text not null default '' check (length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id, part)
);
alter table public.capstone_parts enable row level security;
create policy capstone_parts_select on public.capstone_parts for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy capstone_parts_insert on public.capstone_parts for insert to authenticated with check (user_id = (select auth.uid()));
create policy capstone_parts_update on public.capstone_parts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists capstone_parts_course_idx on public.capstone_parts(course_id);
