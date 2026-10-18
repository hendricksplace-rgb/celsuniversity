insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('email-assets','email-assets', true, 524288, array['image/png','image/jpeg','image/gif'])
on conflict (id) do update set public = true;
