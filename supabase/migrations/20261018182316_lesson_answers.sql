-- "Tu respuesta" under text blocks with data.response_field (Finanzas activities). One answer per
-- student and block; only the student reads and writes it.
create table public.lesson_answers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  block_id uuid not null references public.content_blocks (id) on delete cascade,
  body text not null default '' check (length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, block_id)
);
alter table public.lesson_answers enable row level security;
create policy lesson_answers_own on public.lesson_answers for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create or replace function private.touch_lesson_answer() returns trigger
language plpgsql set search_path to '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger touch_lesson_answer before insert or update on public.lesson_answers
  for each row execute function private.touch_lesson_answer();
