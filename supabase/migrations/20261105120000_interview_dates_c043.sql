-- C-043: the student's citizenship interview date, per student per course (CelsUS), for the passport page's
-- countdown and plan. Students read and write only their own rows; staff can read them.
create table if not exists public.interview_dates (
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  interview_date date not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

alter table public.interview_dates enable row level security;

create policy "own or staff read" on public.interview_dates
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "own insert" on public.interview_dates
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own update" on public.interview_dates
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "own delete" on public.interview_dates
  for delete to authenticated
  using (user_id = (select auth.uid()));

create index if not exists interview_dates_course_idx on public.interview_dates (course_id);
