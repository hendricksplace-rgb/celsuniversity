-- C-026: XP leaderboard per course ("Tabla de posiciones") and preset cheers for the weekly top 3.

-- 1. XP ledger: one row per XP award, so XP can be summed per course and per week.
create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  amount int not null,
  source text not null,
  created_at timestamptz not null default now()
);
create index xp_events_course_created on public.xp_events (course_id, created_at);
create index xp_events_user on public.xp_events (user_id);
alter table public.xp_events enable row level security;
create policy xp_events_select_own on public.xp_events for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.xp_events from anon, authenticated;
grant select on public.xp_events to authenticated;

insert into public.xp_events (user_id, course_id, lesson_id, amount, source, created_at)
select pr.user_id, m.course_id, pr.lesson_id, pr.xp_earned,
       case when les.lesson_type = 'quiz' then 'quiz' else 'lesson_part' end,
       coalesce(pr.last_activity, now())
  from public.progress pr
  join public.lessons les on les.id = pr.lesson_id
  join public.modules m on m.id = les.module_id
 where pr.xp_earned > 0;

-- 2. Privacy switches.
alter table public.profiles
  add column show_on_leaderboard boolean not null default true,
  add column receive_cheers boolean not null default true;
grant update (show_on_leaderboard, receive_cheers) on public.profiles to authenticated;

-- 3. XP is still awarded in one place; it now also writes the ledger in the same transaction.
create or replace function public.record_lesson_progress(p_lesson uuid, p_part uuid default null, p_finish boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  uid uuid := (select auth.uid());
  l record;
  row public.progress%rowtype;
  first_finish boolean := false;
  today date := (now() at time zone 'America/Mexico_City')::date;
  monday date := today - ((extract(isodow from today))::int - 1);
begin
  if uid is null then raise exception 'not signed in'; end if;
  select les.id, les.xp_reward, les.has_content, les.lesson_type, m.course_id into l
    from public.lessons les join public.modules m on m.id = les.module_id
   where les.id = p_lesson and les.status = 'published' and not les.teacher_only;
  if l.id is null or not private.has_course_access(l.course_id) then raise exception 'no access'; end if;
  if p_part is not null and not exists (select 1 from public.content_blocks b where b.id = p_part and b.lesson_id = p_lesson) then
    raise exception 'unknown part';
  end if;
  if not l.has_content then p_finish := false; end if;

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
    if coalesce(l.xp_reward, 0) > 0 then
      insert into public.xp_events (user_id, course_id, lesson_id, amount, source)
      values (uid, l.course_id, p_lesson, l.xp_reward, case when l.lesson_type = 'quiz' then 'quiz' else 'lesson_part' end);
    end if;
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
end $function$;

-- 4. Helpers.
-- Monday 00:00 in Mexico City, as a timestamp.
create or replace function private.week_start() returns timestamptz
language sql stable set search_path to '' as $$
  select (date_trunc('week', now() at time zone 'America/Mexico_City')) at time zone 'America/Mexico_City'
$$;

-- Everyone who can study the course as a student: active enrollments (course or program) and active class members.
create or replace function private.course_user_ids(p_course uuid) returns setof uuid
language sql stable security definer set search_path to '' as $$
  select e.user_id from public.enrollments e
   where e.status = 'active' and (e.expires_at is null or e.expires_at > now())
     and (e.course_id = p_course or e.program_id in (select pc.program_id from public.program_courses pc where pc.course_id = p_course))
  union
  select m.user_id from public.class_members m
    join public.class_courses cc on cc.class_id = m.class_id
    join public.classes c on c.id = m.class_id and c.status = 'active'
   where cc.course_id = p_course and m.member_role = 'student'
$$;

-- The caller's active class for this course, if any.
create or replace function private.my_class(p_course uuid) returns uuid
language sql stable security definer set search_path to '' as $$
  select m.class_id from public.class_members m
    join public.class_courses cc on cc.class_id = m.class_id
    join public.classes c on c.id = m.class_id and c.status = 'active'
   where m.user_id = (select auth.uid()) and cc.course_id = p_course and m.member_role = 'student'
   order by c.created_at limit 1
$$;

-- Ranking among p_users by XP since p_since (null: all time). Ties: whoever reached that XP first ranks higher.
create or replace function private.lb_rank(p_course uuid, p_since timestamptz, p_users uuid[])
returns table (user_id uuid, xp int, last_at timestamptz, rnk int)
language sql stable security definer set search_path to '' as $$
  select x.user_id, x.xp, x.last_at, (row_number() over (order by x.xp desc, x.last_at asc, x.user_id))::int
    from (select e.user_id, sum(e.amount)::int as xp, max(e.created_at) as last_at
            from public.xp_events e
           where e.course_id = p_course and (p_since is null or e.created_at >= p_since) and e.user_id = any (p_users)
           group by e.user_id
          having sum(e.amount) > 0) x
$$;

-- "Valeria Martínez López" → "Valeria L."; never an email.
create or replace function private.short_name(p text) returns text
language sql immutable set search_path to '' as $$
  select case when p is null or btrim(p) = '' or position('@' in p) > 0 then 'Estudiante'
              else (select case when cardinality(a) = 1 then a[1] else a[1] || ' ' || upper(left(a[cardinality(a)], 1)) || '.' end
                      from (select regexp_split_to_array(btrim(p), '\s+') as a) s) end
$$;

-- 5. Nightly snapshot of each course's weekly ranks, for ▲/▼ moves.
create table public.leaderboard_snapshots (
  course_id uuid not null references public.courses (id) on delete cascade,
  period_start date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rank int not null,
  taken_on date not null,
  primary key (course_id, taken_on, user_id)
);
alter table public.leaderboard_snapshots enable row level security;
revoke all on public.leaderboard_snapshots from anon, authenticated;

create or replace function private.snapshot_leaderboards() returns void
language plpgsql security definer set search_path to '' as $$
declare
  c record;
  ws timestamptz := private.week_start();
  today date := (now() at time zone 'America/Mexico_City')::date;
begin
  delete from public.leaderboard_snapshots where taken_on < today - 14;
  for c in select distinct e.course_id from public.xp_events e where e.created_at >= ws loop
    insert into public.leaderboard_snapshots (course_id, period_start, user_id, rank, taken_on)
    select c.course_id, (ws at time zone 'America/Mexico_City')::date, r.user_id, r.rnk, today
      from private.lb_rank(c.course_id, ws, array(select private.course_user_ids(c.course_id))) r
    on conflict (course_id, taken_on, user_id) do update set rank = excluded.rank, period_start = excluded.period_start;
  end loop;
end $$;

-- 23:55 in Mexico City (UTC-6, no daylight saving time).
select cron.schedule('leaderboard-snapshot', '55 5 * * *', $$select private.snapshot_leaderboards()$$);

-- 6. Cheers: preset phrases only, never free text.
create table public.cheer_phrases (
  code text primary key,
  emoji text not null,
  en text not null,
  es text not null,
  note text not null default '',
  audio text,
  wt jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0
);
alter table public.cheer_phrases enable row level security;
create policy cheer_phrases_read on public.cheer_phrases for select to authenticated using (true);
revoke all on public.cheer_phrases from anon, authenticated;
grant select on public.cheer_phrases to authenticated;

insert into public.cheer_phrases (code, emoji, en, es, note, audio, wt, sort_order) values
  ('congrats', '🎉', 'Congrats!', '¡Felicidades!', '«¡Felicidades!» Forma corta y casual de «Congratulations». Se usa con amigos.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/congrats.mp3', '[0]', 1),
  ('crushing_it', '💪', 'You''re crushing it!', '¡Lo estás haciendo increíble!', '«¡Lo estás haciendo increíble!» Literalmente «lo estás aplastando». Muy común entre jóvenes cuando alguien va súper bien.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/crushing_it.mp3', '[0, 0.313, 0.929]', 2),
  ('way_to_go', '🙌', 'Way to go!', '¡Así se hace!', '«¡Así se hace!» Para felicitar a alguien justo después de un logro.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/way_to_go.mp3', '[0, 0.244, 0.337]', 3),
  ('keep_it_up', '🔥', 'Keep it up!', '¡Sigue así!', '«¡Sigue así!» Para animar a alguien a no parar.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/keep_it_up.mp3', '[0, 0.29, 0.395]', 4),
  ('inspiration', '⭐', 'You''re an inspiration!', '¡Eres una inspiración!', '«¡Eres una inspiración!» Le dices que su esfuerzo te motiva a ti también.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/inspiration.mp3', '[0, 0.302, 0.441]', 5),
  ('well_deserved', '🏆', 'Well deserved!', '¡Bien merecido!', '«¡Bien merecido!» Su lugar se lo ganó con trabajo.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/well_deserved.mp3', '[0, 0.255]', 6),
  ('hats_off', '🎩', 'Hats off to you!', '¡Me quito el sombrero!', '«¡Me quito el sombrero!» Expresión de admiración, igual que en español.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/hats_off.mp3', '[0, 0.383, 0.557, 0.662]', 7),
  ('see_you_top', '🚀', 'See you at the top!', '¡Nos vemos arriba!', '«¡Nos vemos arriba!» Rivalidad amistosa: «voy por ti».', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/see_you_top.mp3', '[0, 0.221, 0.325, 0.418, 0.522]', 8),
  ('proud', '💜', 'So proud of you!', '¡Qué orgullo!', '«¡Qué orgullo!» «Estoy muy orgulloso/a de ti». Cálido y sincero.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/proud.mp3', '[0, 0.302, 0.569, 0.685]', 9),
  ('teach_me', '😄', 'Teach me your ways!', '¡Enséñame tus trucos!', '«¡Enséñame tus trucos!» En broma: «¿cómo le haces?». Es un cumplido.', 'storage://course-media/0928ee68-d20b-4cdf-8e4b-5489ce16b4a3/cheers/teach_me.mp3', '[0, 0.406, 0.546, 0.731]', 10);

create table public.cheers (
  id bigint generated always as identity primary key,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  phrase_code text not null references public.cheer_phrases (code),
  period_start date not null,
  sent_on date not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  thanked_at timestamptz,
  thank_seen_at timestamptz,
  unique (from_user, to_user, sent_on)
);
create index cheers_to_week on public.cheers (to_user, course_id, period_start);
create index cheers_from_day on public.cheers (from_user, sent_on);
alter table public.cheers enable row level security;
create policy cheers_select_own on public.cheers for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));
revoke all on public.cheers from anon, authenticated;
grant select on public.cheers to authenticated;

-- 7. RPCs.
create or replace function public.leaderboard(p_course uuid, p_period text default 'week', p_scope text default 'course')
returns jsonb
language plpgsql stable security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  ws timestamptz := private.week_start();
  wsd date := (private.week_start() at time zone 'America/Mexico_City')::date;
  today date := (now() at time zone 'America/Mexico_City')::date;
  since timestamptz;
  cls uuid;
  users uuid[];
  teacher text;
  my_rank int;
  ranked int;
  out_rows jsonb;
  ahead jsonb;
  rk jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not private.has_course_access(p_course) then raise exception 'no access'; end if;
  if p_period not in ('week', 'all') or p_scope not in ('course', 'class') then raise exception 'bad request'; end if;
  since := case when p_period = 'week' then ws end;
  cls := private.my_class(p_course);

  if p_scope = 'class' then
    if cls is null then raise exception 'no class'; end if;
    select array_agg(m.user_id) into users from public.class_members m where m.class_id = cls and m.member_role = 'student';
    select private.short_name(p.display_name) into teacher
      from public.class_members m join public.profiles p on p.id = m.user_id
     where m.class_id = cls and m.member_role = 'teacher' limit 1;
  else
    users := array(select private.course_user_ids(p_course));
  end if;
  users := coalesce(users, '{}');

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into rk from private.lb_rank(p_course, since, users) x;
  ranked := jsonb_array_length(rk);
  -- A student with no XP yet still sees their own row, after everyone with XP.
  if uid = any (users) and not exists (select 1 from jsonb_to_recordset(rk) t(user_id uuid) where t.user_id = uid) then
    rk := rk || jsonb_build_array(jsonb_build_object('user_id', uid, 'xp', 0, 'last_at', null, 'rnk', ranked + 1));
  end if;
  select t.rnk into my_rank from jsonb_to_recordset(rk) t(user_id uuid, rnk int) where t.user_id = uid;

  select jsonb_build_object('rank', t.rnk, 'display', case when p.show_on_leaderboard or t.user_id = uid then private.short_name(p.display_name) else 'Estudiante' end, 'xp', t.xp)
    into ahead
    from jsonb_to_recordset(rk) t(user_id uuid, xp int, last_at timestamptz, rnk int) join public.profiles p on p.id = t.user_id
   where my_rank is not null and t.rnk = my_rank - 1;

  select coalesce(jsonb_agg(r order by (r->>'rank')::int), '[]'::jsonb) into out_rows from (
    select jsonb_build_object(
      'rank', t.rnk,
      'user_id', t.user_id,
      'display', d.display,
      'initial', upper(left(d.display, 1)),
      'avatar_url', case when p.show_on_leaderboard or t.user_id = uid then p.avatar_url end,
      'xp', t.xp,
      'streak', case when g.last_activity_date >= today - 1 then coalesce(g.current_streak, 0) else 0 end,
      'rank_change', case when p_period = 'week' and p_scope = 'course' and s.rank is not null then s.rank - t.rnk end,
      'is_me', t.user_id = uid,
      'receive_cheers', case when t.rnk <= 3 then p.receive_cheers end,
      'cheers', case when t.rnk <= 3 and t.xp > 0 then (select count(*) from public.cheers ch where ch.to_user = t.user_id and ch.course_id = p_course and ch.period_start = wsd) end,
      'cheered_today', case when t.rnk <= 3 and t.xp > 0 then exists (select 1 from public.cheers ch where ch.from_user = uid and ch.to_user = t.user_id and ch.sent_on = today) end
    ) as r
      from jsonb_to_recordset(rk) t(user_id uuid, xp int, last_at timestamptz, rnk int)
      join public.profiles p on p.id = t.user_id
      cross join lateral (select case when p.show_on_leaderboard or t.user_id = uid then private.short_name(p.display_name) else 'Estudiante' end as display) d
      left join public.gamification g on g.user_id = t.user_id
      left join public.leaderboard_snapshots s on s.course_id = p_course and s.user_id = t.user_id and s.taken_on = today - 1 and s.period_start = wsd
     where t.rnk <= 50 or t.user_id = uid
  ) x;

  return jsonb_build_object(
    'rows', out_rows,
    'ranked', ranked,
    'students', cardinality(users),
    'my_rank', my_rank,
    'ahead', ahead,
    'period_start', ws,
    'period_end', ws + interval '7 days',
    'has_class', cls is not null,
    'teacher', teacher
  );
end $$;

create or replace function public.send_cheer(p_to uuid, p_course uuid, p_phrase text)
returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  uid uuid := (select auth.uid());
  ws timestamptz := private.week_start();
  wsd date := (private.week_start() at time zone 'America/Mexico_City')::date;
  today date := (now() at time zone 'America/Mexico_City')::date;
  cls uuid;
  ok boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not private.has_course_access(p_course) then raise exception 'no access'; end if;
  if p_to = uid then raise exception 'cheer_self'; end if;
  if not exists (select 1 from public.cheer_phrases where code = p_phrase and active) then raise exception 'cheer_phrase'; end if;
  if not coalesce((select receive_cheers from public.profiles where id = p_to), false) then raise exception 'cheer_off'; end if;
  ok := exists (select 1 from private.lb_rank(p_course, ws, array(select private.course_user_ids(p_course))) r where r.user_id = p_to and r.rnk <= 3);
  if not ok then
    cls := private.my_class(p_course);
    if cls is not null then
      ok := exists (select 1 from private.lb_rank(p_course, ws, array(select m.user_id from public.class_members m where m.class_id = cls and m.member_role = 'student')) r
                     where r.user_id = p_to and r.rnk <= 3);
    end if;
  end if;
  if not ok then raise exception 'cheer_not_top3'; end if;
  if exists (select 1 from public.cheers where from_user = uid and to_user = p_to and sent_on = today) then raise exception 'cheer_today'; end if;
  if (select count(*) from public.cheers where from_user = uid and sent_on = today) >= 10 then raise exception 'cheer_limit'; end if;
  insert into public.cheers (from_user, to_user, course_id, phrase_code, period_start, sent_on) values (uid, p_to, p_course, p_phrase, wsd, today);
  return jsonb_build_object('count', (select count(*) from public.cheers where to_user = p_to and course_id = p_course and period_start = wsd));
end $$;

create or replace function public.thank_cheer(p_id bigint) returns void
language sql security definer set search_path to '' as $$
  update public.cheers set thanked_at = now(), seen_at = coalesce(seen_at, now())
   where id = p_id and to_user = (select auth.uid()) and thanked_at is null
$$;

create or replace function public.mark_cheers_seen(p_ids bigint[]) returns void
language sql security definer set search_path to '' as $$
  update public.cheers set seen_at = now() where id = any (p_ids) and to_user = (select auth.uid()) and seen_at is null
$$;

create or replace function public.mark_thanks_seen(p_ids bigint[]) returns void
language sql security definer set search_path to '' as $$
  update public.cheers set thank_seen_at = now() where id = any (p_ids) and from_user = (select auth.uid()) and thanked_at is not null and thank_seen_at is null
$$;

-- Unseen cheers I received (for the overlay) and unseen thanks for cheers I sent (for a toast).
create or replace function public.cheer_inbox() returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'received', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id,
               'from', case when p.show_on_leaderboard then private.short_name(p.display_name) else 'Estudiante' end,
               'course_id', c.course_id,
               'course', co.title,
               'slug', co.slug,
               'code', ph.code, 'emoji', ph.emoji, 'en', ph.en, 'es', ph.es, 'note', ph.note, 'audio', ph.audio, 'wt', ph.wt,
               'rank', (select r.rnk from private.lb_rank(c.course_id, private.week_start(), array(select private.course_user_ids(c.course_id))) r where r.user_id = c.to_user)
             ) order by c.created_at)
        from (select * from public.cheers where to_user = (select auth.uid()) and seen_at is null order by created_at desc limit 20) c
        join public.profiles p on p.id = c.from_user
        join public.courses co on co.id = c.course_id
        join public.cheer_phrases ph on ph.code = c.phrase_code), '[]'::jsonb),
    'thanks', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'to', case when p.show_on_leaderboard then private.short_name(p.display_name) else 'Estudiante' end, 'en', ph.en, 'emoji', ph.emoji))
        from public.cheers c
        join public.profiles p on p.id = c.to_user
        join public.cheer_phrases ph on ph.code = c.phrase_code
       where c.from_user = (select auth.uid()) and c.thanked_at is not null and c.thank_seen_at is null), '[]'::jsonb)
  )
$$;

-- "Tus felicitaciones": this week's cheers I received in a course.
create or replace function public.my_cheers(p_course uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'count', (select count(*) from public.cheers where to_user = (select auth.uid()) and course_id = p_course
                and period_start = (private.week_start() at time zone 'America/Mexico_City')::date),
    'latest', coalesce((
      select jsonb_agg(jsonb_build_object('from', x.sender, 'en', x.en, 'emoji', x.emoji, 'at', x.created_at) order by x.created_at desc)
        from (select case when p.show_on_leaderboard then private.short_name(p.display_name) else 'Estudiante' end as sender, ph.en, ph.emoji, c.created_at
                from public.cheers c
                join public.profiles p on p.id = c.from_user
                join public.cheer_phrases ph on ph.code = c.phrase_code
               where c.to_user = (select auth.uid()) and c.course_id = p_course
                 and c.period_start = (private.week_start() at time zone 'America/Mexico_City')::date
               order by c.created_at desc limit 10) x), '[]'::jsonb)
  )
$$;

-- The XP each kind of lesson gives in a course, for "¿Cómo gano XP?".
create or replace function public.course_xp_values(p_course uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('type', x.lesson_type, 'xp', x.xp, 'n', x.n) order by x.xp desc, x.lesson_type), '[]'::jsonb)
    from (select les.lesson_type, les.xp_reward as xp, count(*) as n
            from public.lessons les join public.modules m on m.id = les.module_id
           where m.course_id = p_course and les.status = 'published' and les.has_content and not les.teacher_only and les.xp_reward > 0
             and private.has_course_access(p_course)
           group by les.lesson_type, les.xp_reward) x
$$;

revoke execute on function public.leaderboard(uuid, text, text), public.send_cheer(uuid, uuid, text), public.thank_cheer(bigint),
  public.mark_cheers_seen(bigint[]), public.mark_thanks_seen(bigint[]), public.cheer_inbox(), public.my_cheers(uuid), public.course_xp_values(uuid)
  from public, anon;
grant execute on function public.leaderboard(uuid, text, text), public.send_cheer(uuid, uuid, text), public.thank_cheer(bigint),
  public.mark_cheers_seen(bigint[]), public.mark_thanks_seen(bigint[]), public.cheer_inbox(), public.my_cheers(uuid), public.course_xp_values(uuid)
  to authenticated;
