-- "Salud del contenido" (/app/admin/salud): what is missing or still outside, one row per problem.
-- Staff only; runs with the caller's rights (staff read everything through RLS).
create or replace function public.content_health()
returns table (course_id uuid, course text, course_sort int, kind text, lesson_id uuid, module_n int, title text, detail text, link text)
language sql stable security invoker set search_path to '' as $$
  with l as (
    select l.id, l.title, l.lesson_type, l.has_content, m.id module_id, m.sort_order module_sort, m.title module_title, m.kind module_kind,
           m.artwork_url, c.id course_id, c.title course, c.sort_order course_sort, c.slug
      from public.lessons l
      join public.modules m on m.id = l.module_id
      join public.courses c on c.id = m.course_id
     where not l.teacher_only and l.status = 'published' and private.is_staff()
  )
  -- Lessons with nothing in them (hidden from students).
  select course_id, course, course_sort, 'empty', id, module_sort + 1, title, module_title, '/app/lecciones/' || id
    from l where not has_content
  union all
  -- Videos still on Wistia, or a video lesson with no playable video.
  select l.course_id, l.course, l.course_sort, case when b.data->>'media_url' like '%wistia.com/%' then 'wistia' else 'no_video' end,
         l.id, l.module_sort + 1, l.title, l.module_title, '/app/lecciones/' || l.id
    from l
    left join lateral (
      select b.data from public.content_blocks b
       where b.lesson_id = l.id and b.block_type in ('video', 'embed', 'audio') and not b.teacher_only
       order by b.sort_order limit 1
    ) b on true
   where (l.lesson_type = 'video' and l.has_content
          and coalesce(b.data->>'media_url', b.data->'settings'->>'src', '') !~ '(youtube|youtu\.be|wistia\.com|^storage://)')
      or b.data->>'media_url' like '%wistia.com/%'
  union all
  -- CelsTV episodes without their image.
  select distinct on (l.module_id) l.course_id, l.course, l.course_sort, 'no_artwork', null::uuid, l.module_sort + 1, l.module_title, null, '/app/cursos/' || l.slug
    from l where l.slug = 'celstv-english-for-our-generation' and l.module_kind = 'lesson_week' and l.artwork_url is null and l.has_content
  union all
  -- Quiz questions Amy doesn't read yet.
  select l.course_id, l.course, l.course_sort, 'quiz_audio', l.id, l.module_sort + 1, l.title,
         count(*)::text || ' / ' || jsonb_array_length(b.data->'settings'->'questions')::text, '/app/lecciones/' || l.id
    from l
    join public.content_blocks b on b.lesson_id = l.id and b.block_type in ('celstv_quiz', 'quiz')
         and jsonb_typeof(b.data->'settings'->'questions') = 'array'
    cross join lateral jsonb_array_elements(b.data->'settings'->'questions') q
   where not (q ? 'question_audio')
   group by l.course_id, l.course, l.course_sort, l.id, l.module_sort, l.title, b.data
  union all
  -- E-books not published yet.
  select e.course_id, c.title, c.sort_order, 'ebook', null::uuid, null::int, e.title, e.status, '/app/libros/' || e.slug
    from public.ebooks e left join public.courses c on c.id = e.course_id
   where e.status <> 'published' and private.is_staff()
  order by 3, 2, 4, 6 nulls last, 7;
$$;
revoke all on function public.content_health() from public, anon;
grant execute on function public.content_health() to authenticated;
