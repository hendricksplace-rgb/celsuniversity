-- Only super_admin changes roles or organizations (administrators run the app but can't make other admins).
-- Server-side scripts with the service role (no auth.uid()) are not restricted.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if auth.uid() is not null and not private.is_staff() and (
       new.evaluation_level is distinct from old.evaluation_level
    or new.evaluation_skills is distinct from old.evaluation_skills
    or new.evaluation_date is distinct from old.evaluation_date) then
    raise exception 'Only staff can change evaluation results';
  end if;
  if auth.uid() is not null and private.my_role() is distinct from 'super_admin' and (
       new.role is distinct from old.role or new.organization_id is distinct from old.organization_id) then
    raise exception 'Only a super_admin can change role or organization';
  end if;
  return new;
end $$;
