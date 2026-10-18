-- A student's own work inside an e-book: notes, reflections, checklists, plans, quiz answers.
-- Private to the owner: no staff or admin policy, on purpose.
create table public.ebook_answers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  ebook_id uuid not null references public.ebooks(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,   -- keyed by "<screen id>:<block index>" and "quiz:<n>"
  last_screen text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, ebook_id)
);
create index ebook_answers_ebook_idx on public.ebook_answers(ebook_id);
alter table public.ebook_answers enable row level security;
create policy owner_read on public.ebook_answers for select to authenticated
  using (user_id = (select auth.uid()));
create policy owner_write on public.ebook_answers for insert to authenticated
  with check (user_id = (select auth.uid())
              and private.has_course_access((select e.course_id from public.ebooks e where e.id = ebook_id)));
create policy owner_update on public.ebook_answers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy owner_delete on public.ebook_answers for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.ebook_answers from anon;
grant select, insert, update, delete on public.ebook_answers to authenticated;
create trigger ebook_answers_touch before update on public.ebook_answers
  for each row execute function public.ebooks_touch();
