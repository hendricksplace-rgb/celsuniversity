-- Students can't write the coach review fields or rewrite their history. On "improve and resend"
-- (reviewed -> draft) the server archives the reviewed version into history and clears the review.
create or replace function private.guard_submission()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if not private.is_staff() then
    if tg_op = 'INSERT' then
      new.user_id := auth.uid();
      new.coach_feedback := null;
      new.coach_good := null;
      new.coach_improve := null;
      new.coach_message := null;
      new.history := '[]'::jsonb;
      new.reviewed_by := null;
      new.reviewed_at := null;
      if new.status = 'reviewed' then new.status := 'submitted'; end if;
    else
      new.user_id := old.user_id;
      new.lesson_id := old.lesson_id;
      new.coach_feedback := old.coach_feedback;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
      if old.status = 'reviewed' and new.status = 'draft' then
        new.history := coalesce(old.history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'version', old.version, 'subject', old.subject, 'body', old.body,
          'submitted_at', old.submitted_at, 'reviewed_at', old.reviewed_at, 'reviewed_by', old.reviewed_by,
          'coach_good', old.coach_good, 'coach_improve', old.coach_improve,
          'coach_message', coalesce(old.coach_message, old.coach_feedback)));
        new.coach_good := null;
        new.coach_improve := null;
        new.coach_message := null;
      else
        new.history := old.history;
        new.coach_good := old.coach_good;
        new.coach_improve := old.coach_improve;
        new.coach_message := old.coach_message;
      end if;
      if new.status = 'reviewed' and old.status <> 'reviewed' then new.status := old.status; end if;
    end if;
  elsif new.status = 'reviewed' and (tg_op = 'INSERT' or old.status <> 'reviewed') then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $function$;

-- Let a student clear their own starred Speaking try.
create policy speaking_best_delete on public.speaking_best for delete to authenticated
  using (user_id = (select auth.uid()));
