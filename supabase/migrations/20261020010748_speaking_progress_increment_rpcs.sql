-- Speaking counts are changed in the database, one step at a time, so a page opened from an old cache can never
-- write lower numbers over the saved ones. Runs as the caller (RLS: owner insert/update on speaking_progress).
create or replace function public.add_speaking_rep(p_lesson uuid, p_exercise int)
 returns int[]
 language plpgsql
 security invoker
 set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  n int;
  out_reps int[];
begin
  if uid is null then raise exception 'not signed in'; end if;
  select coalesce(jsonb_array_length(data->'exercises'), 3) into n from public.speaking_content where lesson_id = p_lesson;
  if n is null then raise exception 'no speaking content'; end if;
  n := least(greatest(n, 1), 6);
  if p_exercise < 1 or p_exercise > n then raise exception 'bad exercise'; end if;
  insert into public.speaking_progress as sp (user_id, lesson_id, reps, partner_feedback, updated_at)
  values (uid, p_lesson, array_fill(0, array[n]), array_fill(0, array[least(greatest(coalesce((select jsonb_array_length(data->'bonus'->'questions'->'en') from public.speaking_content where lesson_id = p_lesson), 3), 1), 6)]), now())
  on conflict (user_id, lesson_id) do nothing;
  update public.speaking_progress sp
     set reps = (select array_agg(case when k = p_exercise then coalesce(sp.reps[k], 0) + 1 else coalesce(sp.reps[k], 0) end order by k)
                   from generate_series(1, greatest(n, coalesce(array_length(sp.reps, 1), 0))) k),
         updated_at = now()
   where sp.user_id = uid and sp.lesson_id = p_lesson
  returning sp.reps into out_reps;
  return out_reps;
end $$;

create or replace function public.set_speaking_partner(p_lesson uuid, p_question int, p_value int)
 returns int[]
 language plpgsql
 security invoker
 set search_path to ''
as $$
declare
  uid uuid := (select auth.uid());
  n int;
  out_pf int[];
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_question < 1 or p_question > 6 or p_value < 0 or p_value > 3 then raise exception 'bad value'; end if;
  select coalesce(jsonb_array_length(data->'exercises'), 3) into n from public.speaking_content where lesson_id = p_lesson;
  if n is null then raise exception 'no speaking content'; end if;
  insert into public.speaking_progress (user_id, lesson_id, reps, partner_feedback, updated_at)
  values (uid, p_lesson, array_fill(0, array[least(greatest(n, 1), 6)]), array_fill(0, array[greatest(p_question, 3)]), now())
  on conflict (user_id, lesson_id) do nothing;
  update public.speaking_progress sp
     set partner_feedback = (select array_agg(case when k = p_question then p_value else coalesce(sp.partner_feedback[k], 0) end order by k)
                               from generate_series(1, greatest(p_question, coalesce(array_length(sp.partner_feedback, 1), 0))) k),
         updated_at = now()
   where sp.user_id = uid and sp.lesson_id = p_lesson
  returning sp.partner_feedback into out_pf;
  return out_pf;
end $$;

revoke execute on function public.add_speaking_rep(uuid, int) from public, anon;
revoke execute on function public.set_speaking_partner(uuid, int, int) from public, anon;
grant execute on function public.add_speaking_rep(uuid, int) to authenticated;
grant execute on function public.set_speaking_partner(uuid, int, int) to authenticated;
