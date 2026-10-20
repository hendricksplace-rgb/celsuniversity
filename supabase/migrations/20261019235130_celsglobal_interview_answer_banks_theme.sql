-- Guided-course theme key (the template picks colors by it) and the Interview course's answer bank.
alter table public.courses add column theme text check (theme is null or theme ~ '^[a-z0-9_-]{1,40}$');
update public.courses set theme = 'resume' where id = '512a5035-e402-4eb4-9d04-6bbd4f8d88cd';
update public.courses set theme = 'interview' where id = 'f7d7f4e4-b598-4943-8692-e18ce65379d3';

-- The student's answer bank: owner only (private notes and answers; voice is never stored, only text).
create table public.answer_banks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 400000),
  updated_at timestamptz not null default now()
);
alter table public.answer_banks enable row level security;
create policy answer_banks_select on public.answer_banks for select to authenticated using (user_id = (select auth.uid()));
create policy answer_banks_insert on public.answer_banks for insert to authenticated with check (user_id = (select auth.uid()));
create policy answer_banks_update on public.answer_banks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy answer_banks_delete on public.answer_banks for delete to authenticated using (user_id = (select auth.uid()));
