-- Medals (celsu-next-batch §4): the rules in public.badges, awarded into gamification.badges as
-- { "<code>": { "at": <timestamp>, "seen": false } }. Checked after every XP/streak change (trigger on
-- gamification) and whenever the app asks for new medals (my_new_badges), which covers the
-- evaluation, e-books and the civics exam.

-- The student's current value for one rule.
create or replace function private.badge_metric(p_user uuid, p_rule jsonb) returns numeric
language plpgsql stable security definer set search_path to '' as $$
declare
  kind text := p_rule->>'type';
begin
  if kind = 'total_xp' then
    return coalesce((select total_xp from public.gamification where user_id = p_user), 0);
  elsif kind = 'streak' then
    return coalesce((select greatest(longest_streak, current_streak) from public.gamification where user_id = p_user), 0);
  elsif kind = 'evaluation_completed' then
    return (select count(*) from public.profiles where id = p_user and evaluation_level is not null);
  elsif kind = 'level_up' then
    return (select count(*) from public.profiles where id = p_user and evaluation_level > starting_level);
  elsif kind = 'ebooks_completed' then
    return (select count(*) from public.ebook_answers where user_id = p_user and completed_at is not null);
  elsif kind = 'cards_practiced' then
    return coalesce((
      select sum(jsonb_array_length(b.data->'settings'))
        from public.progress pr
        join public.content_blocks b on b.lesson_id = pr.lesson_id and b.block_type = 'flashcard' and jsonb_typeof(b.data->'settings') = 'array'
       where pr.user_id = p_user and pr.status = 'completed'), 0);
  elsif kind = 'celscast_completed' then
    return (select count(distinct pr.lesson_id) from public.progress pr
              join public.content_blocks b on b.lesson_id = pr.lesson_id and b.block_type = 'celscast'
             where pr.user_id = p_user and pr.status = 'completed');
  elsif kind = 'civics_practice_score' then
    -- Best practice exam, scaled to 20 questions.
    return coalesce((select max(round(a.score * 20.0 / a.total)) from public.evaluation_attempts a where a.user_id = p_user and a.total > 0), 0);
  elsif kind in ('episodes_completed', 'unit_completed') then
    return (
      with weeks as (
        select m.id, c.slug, row_number() over (partition by m.course_id order by m.sort_order) as n
          from public.modules m join public.courses c on c.id = m.course_id
         where m.kind = 'lesson_week'
      ),
      done as (
        select w.id, w.slug, w.n
          from weeks w
         where exists (select 1 from public.lessons l where l.module_id = w.id and l.has_content and not l.teacher_only and l.status = 'published')
           and not exists (
             select 1 from public.lessons l
              where l.module_id = w.id and l.has_content and not l.teacher_only and l.status = 'published'
                and not exists (select 1 from public.progress pr where pr.user_id = p_user and pr.lesson_id = l.id and pr.status = 'completed'))
      )
      select case when kind = 'episodes_completed' then (select count(*) from done)
             else (select case when count(*) = 8 then 1 else 0 end from done
                    where slug = p_rule->>'course' and n between ((p_rule->>'unit')::int - 1) * 8 + 1 and (p_rule->>'unit')::int * 8) end
    );
  end if;
  return 0;
end $$;

-- Adds every medal the student now meets. Returns the codes added this time.
create or replace function private.award_badges(p_user uuid) returns text[]
language plpgsql security definer set search_path to '' as $$
declare
  have jsonb;
  added text[] := '{}';
  b record;
begin
  if p_user is null then return added; end if;
  insert into public.gamification (user_id) values (p_user) on conflict (user_id) do nothing;
  select coalesce(case when jsonb_typeof(badges) = 'object' then badges end, '{}'::jsonb) into have from public.gamification where user_id = p_user;
  for b in select code, rule from public.badges where active order by sort_order loop
    continue when have ? b.code;
    if private.badge_metric(p_user, b.rule) >= coalesce((b.rule->>'min')::numeric, 1) then
      have := have || jsonb_build_object(b.code, jsonb_build_object('at', now(), 'seen', false));
      added := added || b.code;
    end if;
  end loop;
  if array_length(added, 1) > 0 then
    update public.gamification set badges = have where user_id = p_user;
  end if;
  return added;
end $$;

create or replace function private.gamification_badges() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  perform private.award_badges(new.user_id);
  return null;
end $$;
create trigger gamification_badges after insert or update of total_xp, current_streak, last_activity_date on public.gamification
  for each row execute function private.gamification_badges();

-- For the app: checks the rules again, then returns the medals not celebrated yet and marks them seen.
create or replace function public.my_new_badges() returns table (code text, name text, color text)
language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  have jsonb;
  fresh text[];
begin
  if uid is null then return; end if;
  perform private.award_badges(uid);
  select badges into have from public.gamification where user_id = uid;
  select coalesce(array_agg(k), '{}') into fresh from jsonb_each(coalesce(have, '{}')) e(k, v) where coalesce((v->>'seen')::boolean, true) = false;
  if array_length(fresh, 1) is null then return; end if;
  update public.gamification
     set badges = (select jsonb_object_agg(k, case when k = any(fresh) then v || '{"seen": true}' else v end) from jsonb_each(badges) e(k, v))
   where user_id = uid;
  return query select b.code, b.name, b.color from public.badges b where b.code = any(fresh) order by b.sort_order;
end $$;
revoke all on function public.my_new_badges() from public, anon;
grant execute on function public.my_new_badges() to authenticated;
