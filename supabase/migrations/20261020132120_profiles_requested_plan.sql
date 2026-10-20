-- Enrollment while purchases are closed (Matt, 2026-10-20): the plan a person picked before creating their
-- account ("/registro?plan=<product code>"), so staff can see what they wanted and give access ("Dar acceso").
alter table public.profiles
  add column if not exists requested_plan text references public.products(code) on update cascade on delete set null,
  add column if not exists requested_plan_at timestamptz;

comment on column public.profiles.requested_plan is 'Product code chosen at sign-up or reserved later (/registro?plan=…) while purchases are closed. Informational for staff.';

-- New accounts: copy the plan from the sign-up metadata when it names an active product.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_plan text := nullif(new.raw_user_meta_data->>'requested_plan', '');
begin
  if v_plan is not null and not exists (select 1 from public.products p where p.code = v_plan and p.active) then
    v_plan := null;
  end if;
  insert into public.profiles (id, email, display_name, requested_plan, requested_plan_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
          v_plan, case when v_plan is not null then now() end)
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
