-- Students read the transcript of an audio file in a course they can access (path = '<course id>/…' in course-media).
create policy transcripts_read on public.audio_transcripts for select to authenticated
using (
  (select private.is_staff())
  or (
    status = 'done'
    and split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.has_course_access(split_part(path, '/', 1)::uuid)
  )
);
