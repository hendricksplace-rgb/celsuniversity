create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and (new.role is distinct from old.role or new.organization_id is distinct from old.organization_id) then
    raise exception 'Only administrators can change role or organization';
  end if;
  return new;
end $$;
create trigger t_guard_profile before update on public.profiles for each row execute function public.guard_profile_update();

do $$
declare t text;
begin
  foreach t in array array['organizations','profiles','programs','courses','program_courses','modules','lessons',
    'content_blocks','resources','media_files','classes','class_members','class_courses','enrollments','progress',
    'gamification','offline_downloads','evaluations','evaluation_questions','evaluation_attempts','leads','products',
    'orders','resume_submissions','settings','import_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy admin_all on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

create policy own_org on public.organizations for select to authenticated
  using (id = (select organization_id from public.profiles where id = (select auth.uid())));
create policy own_profile_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy own_profile_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy catalog_read on public.programs for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy catalog_read on public.courses for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy catalog_read on public.program_courses for select to anon, authenticated using (true);
create policy catalog_read on public.modules for select to anon, authenticated
  using (status = 'published' or (select public.is_staff()));
create policy catalog_read on public.lessons for select to authenticated
  using ((status = 'published' and not teacher_only) or (select public.is_staff()));

create policy content_read on public.content_blocks for select to authenticated
  using ((select public.is_staff()) or (
    not teacher_only
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.status = 'published' and not l.teacher_only)
    and public.has_course_access(public.lesson_course(lesson_id))));
create policy content_read on public.resources for select to authenticated
  using ((select public.is_staff()) or public.has_course_access((select m.course_id from public.modules m where m.id = module_id)));
create policy content_read on public.media_files for select to authenticated
  using ((select public.is_staff()) or public.has_course_access(course_id));

create policy member_read on public.classes for select to authenticated
  using ((select public.is_staff()) or exists (select 1 from public.class_members m where m.class_id = classes.id and m.user_id = (select auth.uid())));
create policy member_read on public.class_members for select to authenticated
  using ((select public.is_staff()) or user_id = (select auth.uid()));
create policy member_read on public.class_courses for select to authenticated
  using ((select public.is_staff()) or exists (select 1 from public.class_members m where m.class_id = class_courses.class_id and m.user_id = (select auth.uid())));

create policy own_read on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy own_rw on public.progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy staff_read on public.progress for select to authenticated using ((select public.is_staff()));
create policy own_read on public.gamification for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy own_rw on public.offline_downloads for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy eval_read on public.evaluations for select to authenticated using (true);
create policy eval_read on public.evaluation_questions for select to authenticated using (true);
create policy own_rw on public.evaluation_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));
create policy own_insert on public.evaluation_attempts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy product_read on public.products for select to anon, authenticated using (active);
create policy own_read on public.orders for select to authenticated using (user_id = (select auth.uid()));
create policy own_read on public.resume_submissions for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.resume_submissions for insert to authenticated with check (user_id = (select auth.uid()));
create policy settings_read on public.settings for select to authenticated using (true);

insert into storage.buckets (id, name, public) values
  ('course-media', 'course-media', false),
  ('public-assets', 'public-assets', true),
  ('user-uploads', 'user-uploads', false)
on conflict (id) do nothing;

create or replace function public.path_course(p_name text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin return split_part(p_name, '/', 1)::uuid; exception when others then return null; end $$;

create policy course_media_read on storage.objects for select to authenticated
  using (bucket_id = 'course-media' and ((select public.is_staff()) or public.has_course_access(public.path_course(name))));
create policy course_media_admin on storage.objects for all to authenticated
  using (bucket_id in ('course-media','public-assets') and (select public.is_admin()))
  with check (bucket_id in ('course-media','public-assets') and (select public.is_admin()));
create policy user_uploads_own on storage.objects for all to authenticated
  using (bucket_id = 'user-uploads' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'user-uploads' and split_part(name, '/', 1) = (select auth.uid())::text);
create policy user_uploads_staff on storage.objects for select to authenticated
  using (bucket_id = 'user-uploads' and (select public.is_staff()));

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.guard_profile_update() from public, anon, authenticated;
revoke execute on function public.renew_offline_downloads(text) from public, anon;
