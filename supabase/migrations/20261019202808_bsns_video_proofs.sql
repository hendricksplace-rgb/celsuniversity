-- CelsBSNS video task: the video never leaves the student's device; only a chosen JPEG thumbnail is saved as proof.
create table if not exists public.video_task_content (
  lesson_id uuid primary key references public.lessons(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.video_task_content enable row level security;
create policy video_task_content_select on public.video_task_content for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.lesson_course(lesson_id)));
create policy video_task_content_write on public.video_task_content for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table if not exists public.video_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  thumb_path text not null check (thumb_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'),
  duration_s numeric check (duration_s is null or (duration_s >= 0 and duration_s <= 3600)),
  frame_at_s numeric check (frame_at_s is null or frame_at_s >= 0),
  self_check smallint[] not null default '{}',
  confidence smallint check (confidence is null or confidence between 1 and 5),
  script text check (script is null or length(script) <= 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
create index if not exists video_proofs_lesson_idx on public.video_proofs(lesson_id);
alter table public.video_proofs enable row level security;
create policy video_proofs_select on public.video_proofs for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()) or (select private.is_staff()));
create policy video_proofs_insert on public.video_proofs for insert to authenticated with check (user_id = (select auth.uid()));
create policy video_proofs_update on public.video_proofs for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Private bucket that only accepts small JPEGs (the server-side guard: a video can never land here).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-proofs', 'video-proofs', false, 204800, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 204800, allowed_mime_types = array['image/jpeg'];

create policy video_proofs_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'video-proofs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()) or (select private.is_staff())));
create policy video_proofs_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'video-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text and name ~ '\.jpg$');
create policy video_proofs_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'video-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'video-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text and name ~ '\.jpg$');
