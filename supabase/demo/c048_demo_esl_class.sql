-- C-048 demo: "Demo ESL", a sample school with 2 locations (one class each) and 10 made-up students at different
-- stages of CelsTV and CelsBSNS, for Nico Ornelas (prospective ESL partner) to review as their teacher.
-- NOT a migration: demo data. Remove it all with supabase/demo/c048_demo_esl_class_remove.sql.
--
-- Every demo row is tagged:
--   organizations.legacy_id = 'demo-c048' · classes.legacy_id = 'demo-c048-houston' / 'demo-c048-dallas'
--   profiles.legacy_id = 'demo-c048-N' · emails *.demo@example.com (a domain that can never receive mail)
--   auth.users.raw_app_meta_data.demo = true
-- The students have no password (nobody can sign in as them), are hidden from leaderboards and cheers, and get NO
-- xp_events, so they never rank on a real student's leaderboard or count in course rankings.
-- Nico: when nicoornelas93@gmail.com signs up, a trigger on profiles makes him a teacher of both classes (it does
-- nothing for any other email; the remove script drops it). If he already exists, it happens right here.
-- Idempotent: re-running does nothing once the school exists.

do $$
declare
  v_org uuid;
  v_houston uuid;
  v_dallas uuid;
  v_tv uuid := (select id from public.courses where slug = 'celstv-english-for-our-generation');
  v_bsns uuid := (select id from public.courses where slug = 'english-for-business');
  s record;
  v_uid uuid;
  v_n int := 0;
begin
  if exists (select 1 from public.organizations where legacy_id = 'demo-c048') then
    raise notice 'demo school already exists';
    return;
  end if;

  insert into public.organizations (legacy_id, name, notes)
  values ('demo-c048', 'Demo ESL', 'C-048 sample school for the ESL partner review. Safe to delete (supabase/demo/c048_demo_esl_class_remove.sql).')
  returning id into v_org;
  insert into public.classes (legacy_id, organization_id, name, status, schedule_label)
  values ('demo-c048-houston', v_org, 'Demo ESL · Houston', 'active', 'Lunes y miércoles · 7:00 pm')
  returning id into v_houston;
  insert into public.classes (legacy_id, organization_id, name, status, schedule_label)
  values ('demo-c048-dallas', v_org, 'Demo ESL · Dallas', 'active', 'Martes y jueves · 6:30 pm')
  returning id into v_dallas;
  insert into public.class_courses (class_id, course_id)
  values (v_houston, v_tv), (v_houston, v_bsns), (v_dallas, v_tv), (v_dallas, v_bsns);

  -- location, name, email, CelsTV lessons done / in progress, CelsBSNS done / in progress, last activity,
  -- days of history, current streak, quiz skill (typical score out of 10)
  for s in
    select * from (values
      ('houston', 'Sofía Ramírez',    'sofia.ramirez.demo@example.com',      1, 1,  0, 0, now() - interval '2 days',    2,  0, 7),
      ('houston', 'Diego Hernández',  'diego.hernandez.demo@example.com',   38, 1,  0, 0, now() - interval '1 day',    20,  4, 8),
      ('houston', 'Valeria Torres',   'valeria.torres.demo@example.com',    84, 0, 19, 1, now() - interval '3 hours',  45, 12, 9),
      ('houston', 'Carlos Mendoza',   'carlos.mendoza.demo@example.com',    12, 0, 40, 1, now() - interval '3 days',   35,  0, 7),
      ('houston', 'Lucía Gómez',      'lucia.gomez.demo@example.com',       19, 1,  2, 0, now() - interval '24 days',  18,  0, 6),
      ('dallas',  'Andrés Castillo',  'andres.castillo.demo@example.com',   60, 1,  7, 0, now() - interval '5 hours',  30,  7, 8),
      ('dallas',  'Mariana López',    'mariana.lopez.demo@example.com',     25, 0, 12, 1, now() - interval '2 days',   25,  2, 7),
      ('dallas',  'José Morales',     'jose.morales.demo@example.com',       6, 1,  0, 0, now() - interval '9 days',    6,  0, 5),
      ('dallas',  'Daniela Ruiz',     'daniela.ruiz.demo@example.com',     110, 1, 33, 0, now() - interval '1 hour',   60, 21, 9),
      ('dallas',  'Fernando Vargas',  'fernando.vargas.demo@example.com',   44, 0,  0, 0, now() - interval '15 days',  28,  0, 6)
    ) as t(loc, name, email, tv_done, tv_ip, bs_done, bs_ip, last_at, span_days, streak, skill)
  loop
    v_uid := gen_random_uuid();
    v_n := v_n + 1;
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', s.email, '', now(),
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb, jsonb_build_object('display_name', s.name),
      s.last_at - make_interval(days => s.span_days + 1), now(), '', '', '', '');
    -- handle_new_user made the profile: tag it, attach it to the demo school, keep it off leaderboards and cheers.
    update public.profiles
    set legacy_id = 'demo-c048-' || v_n, display_name = s.name, organization_id = v_org,
        show_on_leaderboard = false, receive_cheers = false
    where id = v_uid;
    insert into public.class_members (class_id, user_id, member_role)
    values (case when s.loc = 'houston' then v_houston else v_dallas end, v_uid, 'student');

    -- Progress: the first N student lessons of each course in order, spread over the student's history.
    -- Quiz scores sit around the student's skill (skill-1 … skill+1, max 10).
    insert into public.progress (user_id, lesson_id, status, xp_earned, quiz_score, quiz_max_score, last_activity)
    select v_uid, o.id,
      case when o.rn <= o.done then 'completed' else 'in_progress' end,
      case when o.rn <= o.done then 10 else 0 end,
      case when o.rn <= o.done and o.lesson_type = 'quiz' then least(10, s.skill - 1 + (abs(hashtext(v_uid::text || o.id::text)) % 3)) end,
      case when o.rn <= o.done and o.lesson_type = 'quiz' then 10 end,
      s.last_at - make_interval(secs => (greatest(o.done + o.ip - o.rn, 0)::float / greatest(o.done + o.ip, 1)) * s.span_days * 86400)
    from (
      select l.id, l.lesson_type,
        row_number() over (partition by c.id order by m.sort_order, l.sort_order) rn,
        case when c.id = v_tv then s.tv_done else s.bs_done end done,
        case when c.id = v_tv then s.tv_ip else s.bs_ip end ip
      from public.lessons l join public.modules m on m.id = l.module_id join public.courses c on c.id = m.course_id
      where c.id in (v_tv, v_bsns) and m.status = 'published' and m.kind = 'lesson_week'
        and l.status = 'published' and not l.teacher_only and l.has_content
    ) o
    where o.rn <= o.done + o.ip;

    insert into public.gamification (user_id, total_xp, current_streak, longest_streak, last_activity_date, weekly_xp)
    values (v_uid, (s.tv_done + s.bs_done) * 10, s.streak, greatest(s.streak, least(s.tv_done + s.bs_done, 9)),
      (s.last_at at time zone 'America/Mexico_City')::date,
      case when s.last_at > now() - interval '7 days' then least((s.tv_done + s.bs_done) * 10, 120) else 0 end)
    on conflict (user_id) do nothing;
  end loop;
end $$;

-- Nico Ornelas becomes the teacher of both demo classes: now if he already has an account, else on sign-up.
create or replace function private.c048_attach_demo_teacher(p_user uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.profiles
  set role = 'teacher', organization_id = (select id from public.organizations where legacy_id = 'demo-c048')
  where id = p_user and role in ('individual_student', 'student');
  insert into public.class_members (class_id, user_id, member_role)
  select c.id, p_user, 'teacher' from public.classes c
  where c.legacy_id in ('demo-c048-houston', 'demo-c048-dallas')
    and not exists (select 1 from public.class_members m where m.class_id = c.id and m.user_id = p_user);
end $$;

create or replace function private.c048_on_nico_signup()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if lower(new.email) = 'nicoornelas93@gmail.com' then
    perform private.c048_attach_demo_teacher(new.id);
  end if;
  return new;
end $$;

revoke all on function private.c048_attach_demo_teacher(uuid) from public, anon, authenticated;
revoke all on function private.c048_on_nico_signup() from public, anon, authenticated;

do $$
declare v_nico uuid := (select id from public.profiles where lower(email) = 'nicoornelas93@gmail.com');
begin
  if v_nico is not null then
    perform private.c048_attach_demo_teacher(v_nico);
  else
    drop trigger if exists c048_nico_signup on public.profiles;
    create trigger c048_nico_signup after insert on public.profiles
      for each row execute function private.c048_on_nico_signup();
  end if;
end $$;
