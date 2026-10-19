-- Weeks 2–10 have up to 4 speaking exercises and 4 reflection questions; leave room for 6.
alter table public.speaking_best drop constraint speaking_best_exercise_check,
  add constraint speaking_best_exercise_check check (exercise between 1 and 6);
alter table public.speaking_progress drop constraint speaking_progress_reps_check,
  add constraint speaking_progress_reps_check check (array_length(reps, 1) between 1 and 6);
alter table public.speaking_progress drop constraint speaking_progress_partner_feedback_check,
  add constraint speaking_progress_partner_feedback_check check (array_length(partner_feedback, 1) between 1 and 6);
alter table public.weekly_reflections drop constraint weekly_reflections_answers_check,
  add constraint weekly_reflections_answers_check check (cardinality(answers) <= 6);

-- Writing is saved as finished (no coach step).
alter table public.submissions drop constraint submissions_status_check,
  add constraint submissions_status_check check (status = any (array['draft','submitted','reviewed','finished']));

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
  if new.status in ('submitted', 'finished') and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $function$;

-- Week 4 duplicate Writing lesson has no content; keep it out of the student view (draft = staff only).
update public.lessons set status = 'draft' where id = '1ff56977-4646-4b32-ba44-534475ac6925';
