create or replace function private.evaluation_course(p_eval uuid) returns uuid language sql stable security definer set search_path = '' as $$
  select m.course_id from public.evaluations e join public.modules m on m.id = e.module_id where e.id = p_eval
$$;
revoke all on function private.evaluation_course(uuid) from public, anon;
grant execute on function private.evaluation_course(uuid) to authenticated;
alter policy eval_read on public.evaluations
  using ((select private.is_staff()) or (not archived and private.has_course_access(private.evaluation_course(id))));
alter policy eval_read on public.evaluation_questions
  using ((select private.is_staff()) or private.has_course_access(private.evaluation_course(evaluation_id)));
