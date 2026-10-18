-- Replacing a photo (upload with upsert) needs to see the existing object.
create policy avatars_own_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.jpg');
