-- CelsUS: each module's Teacher's Guide (a teacher-only lesson with a teacher_guide block) moves to the top of its
-- module (sort_order 0); the lessons that were above it move down one. UPDATE only.
with guides as (
  select l.id, l.module_id, l.sort_order as old_sort
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'celsus-para-ciudadania'
    and l.teacher_only
    and exists (select 1 from public.content_blocks b where b.lesson_id = l.id and b.block_type = 'teacher_guide')
    and l.sort_order > (select min(x.sort_order) from public.lessons x where x.module_id = l.module_id)
),
lowest as (
  select g.id, g.module_id, g.old_sort, (select min(x.sort_order) from public.lessons x where x.module_id = g.module_id) as low
  from guides g
)
update public.lessons l
set sort_order = case when l.id = lw.id then lw.low else l.sort_order + 1 end
from lowest lw
where l.module_id = lw.module_id
  and (l.id = lw.id or (l.sort_order >= lw.low and l.sort_order < lw.old_sort));
