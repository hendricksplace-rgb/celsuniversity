insert into storage.buckets (id, name, public, file_size_limit)
values ('handoff','handoff', false, 52428800)
on conflict (id) do nothing;
