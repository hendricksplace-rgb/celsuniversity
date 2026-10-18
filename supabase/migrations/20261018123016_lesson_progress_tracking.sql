-- Lesson completion tracking: the parts (content blocks) a student finished, the lesson status,
-- XP for finishing a lesson (once) and the daily streak.
alter table public.progress add column if not exists parts jsonb not null default '{}'::jsonb;

-- Called by the lesson page: on open (no part), when a part is done, and when the lesson is finished
-- (every part done, or "Marcar como terminada"). Returns the row's state.
create or replace function public.record_lesson_progress(p_lesson uuid, p_part uuid default null, p_finish boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  l record;
  row public.progress%rowtype;
  first_finish boolean := false;
  today date := (now() at time zone 'America/Mexico_City')::date;
  monday date := today - ((extract(isodow from today))::int - 1);
begin
  if uid is null then raise exception 'not signed in'; end if;
  select les.id, les.xp_reward, m.course_id into l
    from public.lessons les join public.modules m on m.id = les.module_id
   where les.id = p_lesson and les.status = 'published' and not les.teacher_only;
  if l.id is null or not private.has_course_access(l.course_id) then raise exception 'no access'; end if;
  if p_part is not null and not exists (select 1 from public.content_blocks b where b.id = p_part and b.lesson_id = p_lesson) then
    raise exception 'unknown part';
  end if;

  insert into public.progress as pr (user_id, lesson_id, status, parts, last_activity)
  values (uid, p_lesson, 'in_progress', case when p_part is null then '{}'::jsonb else jsonb_build_object(p_part::text, true) end, now())
  on conflict (user_id, lesson_id) do update set
    parts = case when p_part is null then pr.parts else pr.parts || jsonb_build_object(p_part::text, true) end,
    status = case when pr.status = 'completed' then 'completed' else 'in_progress' end,
    last_activity = now()
  returning * into row;

  if p_finish and row.status <> 'completed' then
    first_finish := true;
    update public.progress set status = 'completed', xp_earned = coalesce(l.xp_reward, 0) where id = row.id returning * into row;
  end if;

  -- Streak and XP: a day counts when the student studied; XP comes with a first finish.
  insert into public.gamification as g (user_id, total_xp, weekly_xp, weekly_reset_date, current_streak, longest_streak, last_activity_date)
  values (uid, case when first_finish then coalesce(l.xp_reward, 0) else 0 end, case when first_finish then coalesce(l.xp_reward, 0) else 0 end, monday, 1, 1, today)
  on conflict (user_id) do update set
    current_streak = case when g.last_activity_date = today then g.current_streak
                          when g.last_activity_date = today - 1 then g.current_streak + 1 else 1 end,
    longest_streak = greatest(g.longest_streak, case when g.last_activity_date = today then g.current_streak
                          when g.last_activity_date = today - 1 then g.current_streak + 1 else 1 end),
    last_activity_date = today,
    weekly_xp = case when g.weekly_reset_date is distinct from monday then 0 else g.weekly_xp end
                + case when first_finish then coalesce(l.xp_reward, 0) else 0 end,
    weekly_reset_date = monday,
    total_xp = g.total_xp + case when first_finish then coalesce(l.xp_reward, 0) else 0 end;

  return jsonb_build_object('status', row.status, 'parts', row.parts, 'xp', case when first_finish then coalesce(l.xp_reward, 0) else 0 end);
end $$;
revoke all on function public.record_lesson_progress(uuid, uuid, boolean) from public, anon;
grant execute on function public.record_lesson_progress(uuid, uuid, boolean) to authenticated;
