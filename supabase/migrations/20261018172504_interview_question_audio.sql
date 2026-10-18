-- Interview Practice plays the four question recordings to anyone who may use the AI tools,
-- including students who only bought the resume course. Only the interview/ folder is opened.
create policy "interview_questions_read" on storage.objects for select to authenticated
using (
  bucket_id = 'course-media'
  and name like 'f7d7f4e4-b598-4943-8692-e18ce65379d3/interview/%'
  and public.can_use_ai_tools()
);
