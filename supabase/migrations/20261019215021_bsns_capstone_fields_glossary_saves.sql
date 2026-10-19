-- Capstone page: structured fields per part, the evidence ids used, and completion.
alter table public.capstone_parts
  add column fields jsonb not null default '{}'::jsonb,
  add column sources jsonb not null default '{}'::jsonb,
  add column completed_at timestamptz,
  alter column body set default '';
alter table public.capstone_parts add constraint capstone_parts_fields_size check (pg_column_size(fields) <= 40000);

-- Course Dictionary: words a student saved (owner only).
create table public.glossary_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  term text not null check (char_length(term) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, course_id, term)
);
create index glossary_saves_course_idx on public.glossary_saves(course_id);
alter table public.glossary_saves enable row level security;
create policy glossary_saves_select on public.glossary_saves for select to authenticated
  using (user_id = (select auth.uid()));
create policy glossary_saves_insert on public.glossary_saves for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy glossary_saves_delete on public.glossary_saves for delete to authenticated
  using (user_id = (select auth.uid()));
