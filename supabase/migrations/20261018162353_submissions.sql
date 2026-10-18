-- CelsBSNS tasks: the student's answer to a lesson (writing, research, speaking, video submission), which a
-- coach reviews. One row per student and lesson. Students write their own rows; staff (teachers included)
-- read and review all. Recordings go to the private `submissions` bucket under '<user id>/<lesson id>/…'.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null default '',
  media_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'reviewed')),
  coach_feedback text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index submissions_queue on public.submissions (status, submitted_at);
create index submissions_lesson on public.submissions (lesson_id);
alter table public.submissions enable row level security;

create policy submissions_read on public.submissions for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy submissions_insert on public.submissions for insert to authenticated
  with check (user_id = (select auth.uid()) and private.has_course_access(private.lesson_course(lesson_id)));
create policy submissions_update on public.submissions for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()))
  with check (user_id = (select auth.uid()) or (select private.is_staff()));
create policy submissions_delete_own_draft on public.submissions for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'draft');

-- Students can't review themselves: the coach fields only change when staff write them.
create or replace function private.guard_submission() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if not private.is_staff() then
    if tg_op = 'INSERT' then
      new.user_id := auth.uid();
      new.coach_feedback := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      if new.status = 'reviewed' then new.status := 'submitted'; end if;
    else
      new.user_id := old.user_id;
      new.lesson_id := old.lesson_id;
      new.coach_feedback := old.coach_feedback;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
      if new.status = 'reviewed' and old.status <> 'reviewed' then new.status := old.status; end if;
    end if;
  elsif new.status = 'reviewed' and (tg_op = 'INSERT' or old.status <> 'reviewed') then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_submission before insert or update on public.submissions
  for each row execute function private.guard_submission();

-- Recordings: private bucket, one folder per student.
insert into storage.buckets (id, name, public, file_size_limit)
values ('submissions', 'submissions', false, 209715200)
on conflict (id) do nothing;
create policy submissions_files_own on storage.objects for all to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy submissions_files_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (select private.is_staff()));
