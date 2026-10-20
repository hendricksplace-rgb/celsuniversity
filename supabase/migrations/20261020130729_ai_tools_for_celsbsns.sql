-- CelsBSNS week 10 is now AI interview practice (Matt, 2026-10-20): CelsBSNS students can use the AI tools too.
create or replace function public.can_use_ai_tools()
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select private.is_staff() or exists (
    select 1 from public.courses c
    where c.slug in ('from-cv-to-u-s-resume-a-step-by-step-guide', 'crack-the-u-s-interview-code', 'english-for-business')
      and private.has_course_access(c.id)
  );
$function$;
