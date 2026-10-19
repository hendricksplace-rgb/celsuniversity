-- CelsBSNS syllabus "Mi compromiso": the student's signed commitment to a course.
create table if not exists public.course_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  signed_name text not null check (length(btrim(signed_name)) between 3 and 80),
  signed_at timestamptz not null default now(),
  lang text not null default 'es' check (lang in ('es','en')),
  unique (user_id, course_id)
);
create index if not exists course_commitments_course_idx on public.course_commitments(course_id);
alter table public.course_commitments enable row level security;
-- Students sign once (insert-only, no edits); they and staff/admins (coaches) can read.
create policy course_commitments_select on public.course_commitments for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy course_commitments_insert on public.course_commitments for insert to authenticated
  with check (user_id = (select auth.uid()) and signed_at > now() - interval '5 minutes');
revoke update, delete on public.course_commitments from authenticated, anon;
comment on table public.course_commitments is 'CelsBSNS "Mi compromiso": the student''s signed commitment to a course. Insert-only from the student side.';
