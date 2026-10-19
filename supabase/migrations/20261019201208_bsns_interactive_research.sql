-- CelsBSNS interactive research task: per-lesson content, the student's 2 examples, the wrap-up, and the "Mis frases" bank.
create table if not exists public.research_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.research_content enable row level security;
create policy research_content_select on public.research_content for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.lesson_course(lesson_id)));
create policy research_content_write on public.research_content for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table if not exists public.research_entries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  slot smallint not null check (slot between 1 and 2),
  source_type text check (source_type is null or source_type in ('in','yt','bio','web')),
  url text check (url is null or length(url) <= 600),
  who text check (who is null or length(who) <= 200),
  field text check (field is null or length(field) <= 200),
  share smallint[] not null default '{}',
  tone smallint[] not null default '{}',
  borrow text check (borrow is null or length(borrow) <= 400),
  liked text check (liked is null or length(liked) <= 2000),
  analysis text check (analysis is null or length(analysis) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id, slot)
);
create table if not exists public.research_reflections (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  field text check (field is null or length(field) <= 200),
  patterns smallint[] not null default '{}',
  change text check (change is null or length(change) <= 2000),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
-- Owner reads and writes; staff/admins can read (support only, no coach review).
alter table public.research_entries enable row level security;
alter table public.research_reflections enable row level security;
create policy research_entries_select on public.research_entries for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy research_entries_insert on public.research_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy research_entries_update on public.research_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy research_reflections_select on public.research_reflections for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy research_reflections_insert on public.research_reflections for insert to authenticated with check (user_id = (select auth.uid()));
create policy research_reflections_update on public.research_reflections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- "Mis frases": owner only.
create table if not exists public.phrase_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (length(btrim(text)) between 1 and 400),
  source text check (source is null or length(source) <= 200),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists phrase_bank_user_idx on public.phrase_bank(user_id, created_at);
create index if not exists phrase_bank_lesson_idx on public.phrase_bank(lesson_id);
create index if not exists research_entries_lesson_idx on public.research_entries(lesson_id);
create index if not exists research_reflections_lesson_idx on public.research_reflections(lesson_id);
alter table public.phrase_bank enable row level security;
create policy phrase_bank_select on public.phrase_bank for select to authenticated using (user_id = (select auth.uid()));
create policy phrase_bank_insert on public.phrase_bank for insert to authenticated with check (user_id = (select auth.uid()));
create policy phrase_bank_delete on public.phrase_bank for delete to authenticated using (user_id = (select auth.uid()));
