-- Finanzas Personales on the guided-course template: theme, the student's financial plan (owner only), and one e-book copy only.
update public.courses set theme = 'finanzas' where id = '873d0752-e7aa-4e5a-9554-8c04b73eff63';

create table public.financial_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 300000),
  updated_at timestamptz not null default now()
);
alter table public.financial_plans enable row level security;
create policy financial_plans_select on public.financial_plans for select to authenticated using (user_id = (select auth.uid()));
create policy financial_plans_insert on public.financial_plans for insert to authenticated with check (user_id = (select auth.uid()));
create policy financial_plans_update on public.financial_plans for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy financial_plans_delete on public.financial_plans for delete to authenticated using (user_id = (select auth.uid()));

-- Same text as tu-dinero-tu-camino-guia-financiera; keep it out of "Mis libros".
update public.ebooks set status = 'draft' where slug = 'tu-dinero-tu-camino';
