-- C-071: the general invitation (invite-general) has no /activar link: the student signs in with an email code
-- (C-039) at /entrar?email=…. Its student_invites row counts as activated on the first sign-in after it was sent,
-- whatever the method (code, password, Google). invite-celsglobal keeps its rule (password set on /nueva-contrasena,
-- public.mark_invite_activated): its /activar link signs the student in before the password exists, and must keep
-- working until they set one.
create or replace function private.on_auth_sign_in_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.last_sign_in_at is not null and new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.student_invites i
       set activated_at = new.last_sign_in_at
      from public.email_outbox o
     where i.user_id = new.id
       and i.activated_at is null
       and i.sent_at <= new.last_sign_in_at
       and o.id = i.email_outbox_id
       and o.template = 'invite-general';
  end if;
  return new;
end $$;
revoke execute on function private.on_auth_sign_in_invite() from public, anon, authenticated;

drop trigger if exists on_auth_sign_in_invite on auth.users;
create trigger on_auth_sign_in_invite
  after update of last_sign_in_at on auth.users
  for each row execute function private.on_auth_sign_in_invite();
