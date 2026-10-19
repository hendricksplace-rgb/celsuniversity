-- CelsBSNS interactive reading: content per lesson, private notes, and per-student reading state.
create table if not exists public.reading_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.reading_content enable row level security;
create policy reading_content_select on public.reading_content for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.lesson_course(lesson_id)));
create policy reading_content_write on public.reading_content for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Private notes: the owner only (coaches and staff cannot read them).
create table if not exists public.reading_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_id text not null check (length(block_id) between 1 and 40),
  body text not null default '' check (length(body) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id, block_id)
);
alter table public.reading_notes enable row level security;
create policy reading_notes_select on public.reading_notes for select to authenticated using (user_id = (select auth.uid()));
create policy reading_notes_insert on public.reading_notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy reading_notes_update on public.reading_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reading_notes_delete on public.reading_notes for delete to authenticated using (user_id = (select auth.uid()));

-- Reading state (poll, activities, checkpoint answers, completion): the owner; staff/admins can read.
create table if not exists public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.reading_progress enable row level security;
create policy reading_progress_select on public.reading_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy reading_progress_insert on public.reading_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy reading_progress_update on public.reading_progress for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create index if not exists reading_notes_lesson_idx on public.reading_notes(lesson_id);
create index if not exists reading_progress_lesson_idx on public.reading_progress(lesson_id);
