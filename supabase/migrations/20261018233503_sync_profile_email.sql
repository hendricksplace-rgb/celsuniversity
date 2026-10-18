-- "Cambiar correo" (Cuenta → Mis datos) changes auth.users.email once both links are confirmed, but
-- profiles.email kept the old address (checkout, follow-up opt-outs and the admin pages read it).
-- Found in the batch 4 smoke test. Keep the profile in step with Auth.
create or replace function private.sync_profile_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;
revoke execute on function private.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_profile_email();

-- Profiles already out of step.
update public.profiles p set email = u.email
  from auth.users u
 where u.id = p.id and p.email is distinct from u.email;
