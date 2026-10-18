-- Cuenta → Preferencias "Seguimiento y recomendaciones" and the lead's unsubscribe flag stay in step,
-- so the daily follow-up job (which skips unsubscribed leads) respects the preference.
-- "Darme de baja" in a follow-up turns off follow-ups only; promotions have their own preference.
create or replace function private.lead_unsubscribed() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.unsubscribed and not coalesce(old.unsubscribed, false) then
    insert into public.user_preferences (user_id, email_followups)
    select p.id, false from public.profiles p where lower(p.email) = lower(new.email)
    on conflict (user_id) do update set email_followups = false, updated_at = now()
      where public.user_preferences.email_followups;
  end if;
  return new;
end $$;

create or replace function private.followups_preference() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'INSERT' or new.email_followups is distinct from old.email_followups then
    update public.leads l set unsubscribed = not new.email_followups
      from public.profiles p
     where p.id = new.user_id and lower(l.email) = lower(p.email) and l.unsubscribed is distinct from (not new.email_followups);
  end if;
  return new;
end $$;
create trigger followups_preference after insert or update of email_followups on public.user_preferences
  for each row execute function private.followups_preference();
