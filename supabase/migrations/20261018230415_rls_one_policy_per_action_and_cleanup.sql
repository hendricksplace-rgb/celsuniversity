-- Batch 3 §1: approved by Matt and applied by him in the Supabase SQL editor on 2026-10-18 (the MCP
-- connector's DROP confirmation could not reach him from the cloud session). Recorded in
-- supabase_migrations.schema_migrations as version 20261018230415.
--
-- Part A: Supabase advisor "multiple permissive policies". One policy per action whose condition is the OR
-- of the policies it replaces, so access is unchanged. supabase/tests/rls-visibility.sql gave identical
-- counts right before and right after, and a write test confirmed students can only change their own
-- preferences and profile.
-- Part B: drop the leftover staging/handoff tables. Cowork confirmed civics2025_staging is fully in
-- evaluation_questions, and handoff_files and teacher_guides_staging aren't needed.
set local lock_timeout = '15s';

-- account_deletion_requests
drop policy "own deletion request insert" on public.account_deletion_requests;
drop policy "own deletion request read" on public.account_deletion_requests;
drop policy "staff deletion request read" on public.account_deletion_requests;
create policy "select" on public.account_deletion_requests for select to authenticated
  using ((select private.is_staff()) or user_id = (select auth.uid()));
create policy insert on public.account_deletion_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

-- class_assignments
drop policy member_read on public.class_assignments;
drop policy teacher_write on public.class_assignments;
create policy "select" on public.class_assignments for select to authenticated
  using ((select private.is_admin()) or private.is_class_teacher(class_id) or (select private.is_staff())
    or exists (select 1 from public.class_members m where m.class_id = class_assignments.class_id and m.user_id = (select auth.uid())));
create policy insert on public.class_assignments for insert to authenticated
  with check (((select private.is_admin()) or private.is_class_teacher(class_id))
    and (module_id is null or exists (select 1 from public.modules md where md.id = class_assignments.module_id and md.course_id = class_assignments.course_id)));
create policy update on public.class_assignments for update to authenticated
  using ((select private.is_admin()) or private.is_class_teacher(class_id))
  with check (((select private.is_admin()) or private.is_class_teacher(class_id))
    and (module_id is null or exists (select 1 from public.modules md where md.id = class_assignments.module_id and md.course_id = class_assignments.course_id)));
create policy delete on public.class_assignments for delete to authenticated
  using ((select private.is_admin()) or private.is_class_teacher(class_id));

-- class_courses
drop policy admin_all on public.class_courses;
drop policy member_read on public.class_courses;
create policy "select" on public.class_courses for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff())
    or exists (select 1 from public.class_members m where m.class_id = class_courses.class_id and m.user_id = (select auth.uid())));
create policy insert on public.class_courses for insert to authenticated with check ((select private.is_admin()));
create policy update on public.class_courses for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.class_courses for delete to authenticated using ((select private.is_admin()));

-- class_members
drop policy admin_all on public.class_members;
drop policy member_read on public.class_members;
create policy "select" on public.class_members for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or user_id = (select auth.uid()));
create policy insert on public.class_members for insert to authenticated with check ((select private.is_admin()));
create policy update on public.class_members for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.class_members for delete to authenticated using ((select private.is_admin()));

-- classes
drop policy admin_all on public.classes;
drop policy member_read on public.classes;
create policy "select" on public.classes for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff())
    or exists (select 1 from public.class_members m where m.class_id = classes.id and m.user_id = (select auth.uid())));
create policy insert on public.classes for insert to authenticated with check ((select private.is_admin()));
create policy update on public.classes for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.classes for delete to authenticated using ((select private.is_admin()));

-- content_blocks
drop policy admin_all on public.content_blocks;
drop policy content_read on public.content_blocks;
create policy "select" on public.content_blocks for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff())
    or (not teacher_only
      and exists (select 1 from public.lessons l where l.id = content_blocks.lesson_id and l.status = 'published'::pub_status and not l.teacher_only)
      and private.has_course_access(private.lesson_course(lesson_id))));
create policy insert on public.content_blocks for insert to authenticated with check ((select private.is_admin()));
create policy update on public.content_blocks for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.content_blocks for delete to authenticated using ((select private.is_admin()));

-- courses
drop policy admin_all on public.courses;
drop policy catalog_read on public.courses;
create policy "select" on public.courses for select to anon, authenticated
  using ((select private.is_admin()) or status = 'published'::pub_status or (select private.is_staff()));
create policy insert on public.courses for insert to authenticated with check ((select private.is_admin()));
create policy update on public.courses for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.courses for delete to authenticated using ((select private.is_admin()));

-- ebooks (scoped to authenticated; was every role)
drop policy admin_all on public.ebooks;
drop policy ebooks_read on public.ebooks;
create policy "select" on public.ebooks for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or (status = 'published' and private.has_course_access(course_id)));
create policy insert on public.ebooks for insert to authenticated with check ((select private.is_admin()));
create policy update on public.ebooks for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.ebooks for delete to authenticated using ((select private.is_admin()));

-- enrollments
drop policy admin_all on public.enrollments;
drop policy own_read on public.enrollments;
create policy "select" on public.enrollments for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()) or (select private.is_staff()));
create policy insert on public.enrollments for insert to authenticated with check ((select private.is_admin()));
create policy update on public.enrollments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.enrollments for delete to authenticated using ((select private.is_admin()));

-- evaluation_attempts
drop policy admin_all on public.evaluation_attempts;
drop policy own_insert on public.evaluation_attempts;
drop policy own_rw on public.evaluation_attempts;
create policy "select" on public.evaluation_attempts for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()) or (select private.is_staff()));
create policy insert on public.evaluation_attempts for insert to authenticated
  with check ((select private.is_admin()) or user_id = (select auth.uid()));
create policy update on public.evaluation_attempts for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.evaluation_attempts for delete to authenticated using ((select private.is_admin()));

-- evaluation_questions
drop policy admin_all on public.evaluation_questions;
drop policy eval_read on public.evaluation_questions;
create policy "select" on public.evaluation_questions for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(private.evaluation_course(evaluation_id)));
create policy insert on public.evaluation_questions for insert to authenticated with check ((select private.is_admin()));
create policy update on public.evaluation_questions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.evaluation_questions for delete to authenticated using ((select private.is_admin()));

-- evaluations
drop policy admin_all on public.evaluations;
drop policy eval_read on public.evaluations;
create policy "select" on public.evaluations for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or (not archived and private.has_course_access(private.evaluation_course(id))));
create policy insert on public.evaluations for insert to authenticated with check ((select private.is_admin()));
create policy update on public.evaluations for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.evaluations for delete to authenticated using ((select private.is_admin()));

-- gamification
drop policy admin_all on public.gamification;
drop policy own_read on public.gamification;
create policy "select" on public.gamification for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()) or (select private.is_staff()));
create policy insert on public.gamification for insert to authenticated with check ((select private.is_admin()));
create policy update on public.gamification for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.gamification for delete to authenticated using ((select private.is_admin()));

-- lessons
drop policy admin_all on public.lessons;
drop policy catalog_read on public.lessons;
create policy "select" on public.lessons for select to authenticated
  using ((select private.is_admin()) or (status = 'published'::pub_status and not teacher_only) or (select private.is_staff()));
create policy insert on public.lessons for insert to authenticated with check ((select private.is_admin()));
create policy update on public.lessons for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.lessons for delete to authenticated using ((select private.is_admin()));

-- media_files
drop policy admin_all on public.media_files;
drop policy content_read on public.media_files;
create policy "select" on public.media_files for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or private.has_course_access(course_id));
create policy insert on public.media_files for insert to authenticated with check ((select private.is_admin()));
create policy update on public.media_files for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.media_files for delete to authenticated using ((select private.is_admin()));

-- modules
drop policy admin_all on public.modules;
drop policy catalog_read on public.modules;
create policy "select" on public.modules for select to anon, authenticated
  using ((select private.is_admin()) or status = 'published'::pub_status or (select private.is_staff()));
create policy insert on public.modules for insert to authenticated with check ((select private.is_admin()));
create policy update on public.modules for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.modules for delete to authenticated using ((select private.is_admin()));

-- offline_downloads
drop policy admin_all on public.offline_downloads;
drop policy own_rw on public.offline_downloads;
create policy "select" on public.offline_downloads for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy insert on public.offline_downloads for insert to authenticated
  with check ((select private.is_admin()) or user_id = (select auth.uid()));
create policy update on public.offline_downloads for update to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()))
  with check ((select private.is_admin()) or user_id = (select auth.uid()));
create policy delete on public.offline_downloads for delete to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));

-- orders
drop policy admin_all on public.orders;
drop policy own_read on public.orders;
create policy "select" on public.orders for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy insert on public.orders for insert to authenticated with check ((select private.is_admin()));
create policy update on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.orders for delete to authenticated using ((select private.is_admin()));

-- organizations
drop policy admin_all on public.organizations;
drop policy own_org on public.organizations;
create policy "select" on public.organizations for select to authenticated
  using ((select private.is_admin()) or id = (select p.organization_id from public.profiles p where p.id = (select auth.uid())));
create policy insert on public.organizations for insert to authenticated with check ((select private.is_admin()));
create policy update on public.organizations for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.organizations for delete to authenticated using ((select private.is_admin()));

-- payments
drop policy admin_all on public.payments;
drop policy own_read on public.payments;
create policy "select" on public.payments for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy insert on public.payments for insert to authenticated with check ((select private.is_admin()));
create policy update on public.payments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.payments for delete to authenticated using ((select private.is_admin()));

-- products
drop policy admin_all on public.products;
drop policy product_read on public.products;
create policy "select" on public.products for select to anon, authenticated
  using ((select private.is_admin()) or active);
create policy insert on public.products for insert to authenticated with check ((select private.is_admin()));
create policy update on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.products for delete to authenticated using ((select private.is_admin()));

-- profiles
drop policy admin_all on public.profiles;
drop policy own_profile_read on public.profiles;
drop policy own_profile_update on public.profiles;
create policy "select" on public.profiles for select to authenticated
  using ((select private.is_admin()) or id = (select auth.uid()) or (select private.is_staff()));
create policy insert on public.profiles for insert to authenticated with check ((select private.is_admin()));
create policy update on public.profiles for update to authenticated
  using ((select private.is_admin()) or id = (select auth.uid()))
  with check ((select private.is_admin()) or id = (select auth.uid()));
create policy delete on public.profiles for delete to authenticated using ((select private.is_admin()));

-- program_courses
drop policy admin_all on public.program_courses;
drop policy catalog_read on public.program_courses;
create policy "select" on public.program_courses for select to anon, authenticated using (true);
create policy insert on public.program_courses for insert to authenticated with check ((select private.is_admin()));
create policy update on public.program_courses for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.program_courses for delete to authenticated using ((select private.is_admin()));

-- programs
drop policy admin_all on public.programs;
drop policy catalog_read on public.programs;
create policy "select" on public.programs for select to anon, authenticated
  using ((select private.is_admin()) or status = 'published'::pub_status or (select private.is_staff()));
create policy insert on public.programs for insert to authenticated with check ((select private.is_admin()));
create policy update on public.programs for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.programs for delete to authenticated using ((select private.is_admin()));

-- progress
drop policy admin_all on public.progress;
drop policy own_rw on public.progress;
drop policy staff_read on public.progress;
create policy "select" on public.progress for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()) or user_id = (select auth.uid()));
create policy insert on public.progress for insert to authenticated
  with check ((select private.is_admin()) or user_id = (select auth.uid()));
create policy update on public.progress for update to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()))
  with check ((select private.is_admin()) or user_id = (select auth.uid()));
create policy delete on public.progress for delete to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));

-- resources
drop policy admin_all on public.resources;
drop policy content_read on public.resources;
create policy "select" on public.resources for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff())
    or private.has_course_access((select m.course_id from public.modules m where m.id = resources.module_id)));
create policy insert on public.resources for insert to authenticated with check ((select private.is_admin()));
create policy update on public.resources for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.resources for delete to authenticated using ((select private.is_admin()));

-- resume_submissions
drop policy admin_all on public.resume_submissions;
drop policy own_insert on public.resume_submissions;
drop policy own_read on public.resume_submissions;
create policy "select" on public.resume_submissions for select to authenticated
  using ((select private.is_admin()) or user_id = (select auth.uid()));
create policy insert on public.resume_submissions for insert to authenticated
  with check ((select private.is_admin()) or user_id = (select auth.uid()));
create policy update on public.resume_submissions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.resume_submissions for delete to authenticated using ((select private.is_admin()));

-- settings
drop policy admin_all on public.settings;
drop policy settings_read on public.settings;
create policy "select" on public.settings for select to authenticated using (true);
create policy insert on public.settings for insert to authenticated with check ((select private.is_admin()));
create policy update on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy delete on public.settings for delete to authenticated using ((select private.is_admin()));

-- user_preferences
drop policy "own prefs insert" on public.user_preferences;
drop policy "own prefs read" on public.user_preferences;
drop policy "own prefs update" on public.user_preferences;
create policy "select" on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy insert on public.user_preferences for insert to authenticated with check (user_id = (select auth.uid()));
create policy update on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Part B: leftovers from the content imports and the handoff (batch 3 §1 "Cleanup").
drop table if exists private.civics2025_staging;
drop table if exists private.teacher_guides_staging;
drop table if exists public.handoff_files;
