-- C-012: a student who finished every old lesson (with content) of a guided module gets that guided step marked
-- complete, so CelsGLOBAL course progress (guided steps) matches what they already did.
with gm as (
  select g.module_id from public.guided_course_steps g
),
done as (
  select p.user_id, l.module_id, max(p.last_activity) last_at
  from public.progress p
  join public.lessons l on l.id = p.lesson_id
  join gm on gm.module_id = l.module_id
  where p.status = 'completed'
  group by p.user_id, l.module_id
  having count(*) >= (
    select count(*) from public.lessons x
    where x.module_id = l.module_id and x.status = 'published' and not x.teacher_only and x.has_content
  )
)
insert into public.guided_step_progress (user_id, module_id, state, completed_at, updated_at)
select d.user_id, d.module_id, '{}'::jsonb, coalesce(d.last_at, now()), now()
from done d
on conflict (user_id, module_id) do update
  set completed_at = coalesce(public.guided_step_progress.completed_at, excluded.completed_at),
      updated_at = now()
  where public.guided_step_progress.completed_at is null;
