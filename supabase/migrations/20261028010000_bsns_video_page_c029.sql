-- C-029: CelsBSNS video page. Per-student notes per lesson, "Avísame cuando esté listo" requests for videos that
-- have no file yet, and the real duration of a video cached on its block the first time a student loads it.

create table public.lesson_notes (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_notes enable row level security;
create policy lesson_notes_own_select on public.lesson_notes for select to authenticated using (user_id = (select auth.uid()));
create policy lesson_notes_own_insert on public.lesson_notes for insert to authenticated with check (user_id = (select auth.uid()));
create policy lesson_notes_own_update on public.lesson_notes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.lesson_notes from anon, authenticated;
grant select, insert, update on public.lesson_notes to authenticated;

create table public.video_ready_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  primary key (user_id, lesson_id)
);
alter table public.video_ready_requests enable row level security;
create policy video_ready_own_select on public.video_ready_requests for select to authenticated using (user_id = (select auth.uid()));
create policy video_ready_own_insert on public.video_ready_requests for insert to authenticated with check (user_id = (select auth.uid()));
create policy video_ready_own_delete on public.video_ready_requests for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.video_ready_requests from anon, authenticated;
grant select, insert, delete on public.video_ready_requests to authenticated;

-- The videos a student asked about that now have a file, not told yet; marks them as told.
create or replace function public.take_ready_videos() returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  out jsonb;
begin
  if uid is null then return '[]'::jsonb; end if;
  with ready as (
    select r.lesson_id, l.title, m.course_id
      from public.video_ready_requests r
      join public.lessons l on l.id = r.lesson_id
      join public.modules m on m.id = l.module_id
     where r.user_id = uid and r.notified_at is null
       and exists (select 1 from public.content_blocks b
                    where b.lesson_id = r.lesson_id and b.block_type = 'video' and coalesce(b.data->>'media_url', '') <> '')
  ), marked as (
    update public.video_ready_requests r set notified_at = now()
      from ready where r.user_id = uid and r.lesson_id = ready.lesson_id
    returning r.lesson_id
  )
  select coalesce(jsonb_agg(jsonb_build_object('lesson_id', ready.lesson_id, 'title', ready.title)), '[]'::jsonb) into out
    from ready where ready.lesson_id in (select lesson_id from marked);
  return out;
end $$;

-- The file's real duration (from the player's loadedmetadata), saved once on the video block.
create or replace function public.set_video_duration(p_block uuid, p_seconds numeric) returns void
language plpgsql security definer set search_path to '' as $$
declare
  c uuid;
begin
  if (select auth.uid()) is null or p_seconds is null or p_seconds < 1 or p_seconds > 14400 then return; end if;
  select m.course_id into c
    from public.content_blocks b join public.lessons l on l.id = b.lesson_id join public.modules m on m.id = l.module_id
   where b.id = p_block and b.block_type = 'video' and (b.data->>'duration') is null;
  if c is null or not private.has_course_access(c) then return; end if;
  update public.content_blocks set data = coalesce(data, '{}'::jsonb) || jsonb_build_object('duration', round(p_seconds))
   where id = p_block and (data->>'duration') is null;
end $$;

revoke execute on function public.take_ready_videos(), public.set_video_duration(uuid, numeric) from public, anon;
grant execute on function public.take_ready_videos(), public.set_video_duration(uuid, numeric) to authenticated;

-- Week 4 Video 06's block said "Week 5 - Module 06".
update public.content_blocks b set title = 'Week 4 - Module 06'
  from public.lessons l
 where l.id = b.lesson_id and l.title = 'Week 4 | Video 06' and b.block_type = 'video' and b.title = 'Week 5 - Module 06';
