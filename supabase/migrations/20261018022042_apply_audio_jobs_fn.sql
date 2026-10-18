create or replace function private.apply_audio_jobs() returns jsonb language plpgsql security definer set search_path = '' as $$
declare n_q int; n_b int;
begin
  -- exam questions (all 2025 evaluations)
  with j as (
    select (ref->>'n')::int n,
      jsonb_object_agg(kind, jsonb_build_object('path','storage://course-media/'||path,'wt',wt,'dur',duration)) k
    from public.audio_jobs where status='done' and kind like 'exam_%' group by 1),
  upd as (
    update public.evaluation_questions q set data = q.data || jsonb_build_object(
      'audio', coalesce(q.data->'audio','{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
         'q', case when e.language='en' then j.k->'exam_q_en'->>'path' else j.k->'exam_q_es'->>'path' end,
         'q_wt', case when e.language='en' then j.k->'exam_q_en'->'wt' else j.k->'exam_q_es'->'wt' end,
         'q_en', j.k->'exam_q_en'->>'path', 'q_en_wt', j.k->'exam_q_en'->'wt',
         'q_es', j.k->'exam_q_es'->>'path', 'q_es_wt', j.k->'exam_q_es'->'wt',
         'a_en', j.k->'exam_a_en'->>'path', 'a_en_wt', j.k->'exam_a_en'->'wt')),
      'audio_url', case when e.language='en' then j.k->'exam_q_en'->>'path' else j.k->'exam_q_es'->>'path' end)
    from public.evaluations e, j
    where e.id=q.evaluation_id and e.test_version='2025' and (q.data->>'n')::int=j.n
    returning 1)
  select count(*) into n_q from upd;
  -- e-book narrations
  with j as (select ref->>'slug' slug, ref->>'screen' sid, 'storage://course-media/'||path p, wt from public.audio_jobs where status='done' and kind='ebook_narration'),
  upd as (
    update public.ebooks b set screens = (
      select jsonb_agg(case when j.p is null then s else jsonb_set(s, '{narration}', (s->'narration') || jsonb_build_object('audio', j.p, 'wt', j.wt)) end order by o)
      from jsonb_array_elements(b.screens) with ordinality t(s,o) left join j on j.slug=b.slug and j.sid=s->>'id')
    where exists (select 1 from j where j.slug=b.slug) returning 1)
  select count(*) into n_b from upd;
  return jsonb_build_object('questions_updated', n_q, 'ebooks_updated', n_b);
end $$;
revoke all on function private.apply_audio_jobs() from public, anon, authenticated;
