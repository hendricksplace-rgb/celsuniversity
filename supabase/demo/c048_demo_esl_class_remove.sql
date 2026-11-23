-- Removes everything c048_demo_esl_class.sql created: the Demo ESL school, its 2 classes, the 10 made-up students
-- and all their rows, and Nico's sign-up trigger. Nico's own account stays (he goes back to a plain student account
-- with no class; set his role again in Admin → Equipo if needed).
do $$
declare
  v_org uuid := (select id from public.organizations where legacy_id = 'demo-c048');
  ids uuid[] := array(select id from public.profiles where legacy_id like 'demo-c048-%');
begin
  drop trigger if exists c048_nico_signup on public.profiles;
  drop function if exists private.c048_on_nico_signup();
  drop function if exists private.c048_attach_demo_teacher(uuid);
  delete from public.progress where user_id = any (ids);
  delete from public.gamification where user_id = any (ids);
  delete from public.class_assignments where class_id in (select id from public.classes where organization_id = v_org);
  delete from public.class_members where class_id in (select id from public.classes where organization_id = v_org);
  delete from public.class_courses where class_id in (select id from public.classes where organization_id = v_org);
  delete from public.classes where organization_id = v_org;
  update public.profiles set organization_id = null, role = case when role = 'teacher' then 'individual_student'::public.user_role else role end
  where organization_id = v_org and not (id = any (ids));
  delete from auth.users where id = any (ids) and email like '%.demo@example.com' and raw_app_meta_data->>'demo' = 'true';
  delete from public.organizations where id = v_org;
end $$;
