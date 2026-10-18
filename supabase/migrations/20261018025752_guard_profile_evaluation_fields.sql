create or replace function public.guard_profile_update() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_staff() and (
       new.evaluation_level is distinct from old.evaluation_level
    or new.evaluation_skills is distinct from old.evaluation_skills
    or new.evaluation_date is distinct from old.evaluation_date) then
    raise exception 'Only staff can change evaluation results';
  end if;
  if auth.uid() is not null and not private.is_admin() and (
       new.role is distinct from old.role or new.organization_id is distinct from old.organization_id) then
    raise exception 'Only administrators can change role or organization';
  end if;
  return new;
end $$;
