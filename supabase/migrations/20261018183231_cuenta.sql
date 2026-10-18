-- Cuenta (celsu-cuenta-spec.md).

-- Profile photos: public, one file per student at avatars/<user id>.jpg (cropped to 256 px on the client).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy avatars_own_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.jpg');
create policy avatars_own_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.jpg')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.jpg');
create policy avatars_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.jpg');

-- Staff follow the deletion requests (ARCO) in /app/admin.
create policy "staff deletion request read" on public.account_deletion_requests for select to authenticated
  using ((select private.is_staff()));

-- "Darme de baja" from a follow-up email also turns the account's marketing emails off.
create or replace function private.lead_unsubscribed() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.unsubscribed and not coalesce(old.unsubscribed, false) then
    insert into public.user_preferences (user_id, email_followups, email_promotions)
    select p.id, false, false from public.profiles p where lower(p.email) = lower(new.email)
    on conflict (user_id) do update set email_followups = false, email_promotions = false, updated_at = now();
  end if;
  return new;
end $$;
create trigger lead_unsubscribed after update of unsubscribed on public.leads
  for each row execute function private.lead_unsubscribed();
