-- C-031: the evaluation is public (no account), so its recorded clips (Amy / Brian, audio_jobs kind eval_v2, in
-- course-media/<course>/eval-v2/) can be read without signing in. Only that folder; the rest of course-media stays
-- private. The manifest gives each clip's text and word timings (wt) for the karaoke; clips recorded later show up
-- by themselves.
create policy "eval v2 audio is public" on storage.objects for select to anon, authenticated
  using (bucket_id = 'course-media' and name like '%/eval-v2/%' and name like '%.mp3');

create or replace function public.eval_audio_manifest() returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', j.ref->>'id', 'text', j.text, 'path', j.path, 'wt', coalesce(j.wt, '[]'::jsonb), 'duration', j.duration) order by j.ref->>'id'), '[]'::jsonb)
    from public.audio_jobs j
   where j.kind = 'eval_v2' and j.status = 'done' and j.path like '%/eval-v2/%'
$$;
revoke execute on function public.eval_audio_manifest() from public;
grant execute on function public.eval_audio_manifest() to anon, authenticated;
