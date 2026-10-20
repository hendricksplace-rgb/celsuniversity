-- Tu Camino con la Visa TN on the guided-course template: theme and the student's TN plan (owner only).
update public.courses set theme = 'visa_tn' where id = '78e640f6-fc48-4659-8db0-8ce01381caba';

create table public.tn_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 300000),
  updated_at timestamptz not null default now()
);
alter table public.tn_plans enable row level security;
create policy tn_plans_select on public.tn_plans for select to authenticated using (user_id = (select auth.uid()));
create policy tn_plans_insert on public.tn_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy tn_plans_update on public.tn_plans for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy tn_plans_delete on public.tn_plans for delete to authenticated using (user_id = (select auth.uid()));
