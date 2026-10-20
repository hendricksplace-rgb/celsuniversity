-- A video block with no file (the "Video pending" placeholders) is not content: the lesson is hidden from students
-- like other empty lessons and can't be "completed" in seconds. Recomputed when a block's data changes too.
create or replace function private.block_counts_as_content(p_type text, p_data jsonb)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $$
  select p_type is distinct from 'video'
      or coalesce(nullif(p_data->>'media_url', ''), nullif(p_data->>'src', ''), nullif(p_data->>'url', ''),
                  nullif(p_data->>'storage', ''), nullif(p_data->'settings'->>'src', '')) is not null
$$;

create or replace function private.refresh_lesson_has_content(p_lesson uuid)
 returns void
 language sql
 security definer
 set search_path to ''
as $function$
  update public.lessons l
     set has_content = exists (select 1 from public.content_blocks b
                                where b.lesson_id = l.id and not b.teacher_only
                                  and private.block_counts_as_content(b.block_type, b.data))
   where l.id = p_lesson;
$function$;

create or replace trigger content_blocks_has_content after insert or delete or update of lesson_id, teacher_only, block_type, data
  on public.content_blocks for each row execute function private.content_blocks_has_content();

-- Applied once by hand after the migration (data, not schema):
--   select private.refresh_lesson_has_content(id) from public.lessons
--    where id in (select distinct lesson_id from public.content_blocks where block_type = 'video');
--   update public.lessons set title = replace(title, 'Week 2 Video', 'Week 3 Video')
--    where title in ('Week 2 Video 2', 'Week 2 Video 6') and module_id = <English for Business, week 3>;
