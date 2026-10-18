-- Lessons with nothing for students to see (no content blocks, or only teacher-only ones) are hidden
-- from students. Kept up to date from content_blocks.
alter table public.lessons add column has_content boolean not null default false;

create or replace function private.refresh_lesson_has_content(p_lesson uuid) returns void
language sql security definer set search_path to '' as $$
  update public.lessons l
     set has_content = exists (select 1 from public.content_blocks b where b.lesson_id = l.id and not b.teacher_only)
   where l.id = p_lesson;
$$;

create or replace function private.content_blocks_has_content() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_lesson_has_content(old.lesson_id);
  else
    perform private.refresh_lesson_has_content(new.lesson_id);
    if tg_op = 'UPDATE' and old.lesson_id is distinct from new.lesson_id then
      perform private.refresh_lesson_has_content(old.lesson_id);
    end if;
  end if;
  return null;
end $$;

create trigger content_blocks_has_content
after insert or delete or update of lesson_id, teacher_only on public.content_blocks
for each row execute function private.content_blocks_has_content();

update public.lessons l
   set has_content = exists (select 1 from public.content_blocks b where b.lesson_id = l.id and not b.teacher_only);
