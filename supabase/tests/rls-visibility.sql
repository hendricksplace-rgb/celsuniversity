-- RLS check: how many rows each kind of user can see, per table. Run it before and after a policy
-- change (SQL editor or MCP execute_sql) and compare: the counts must not change unless the change
-- meant them to. Users: a visitor (anon), the test student, the test administrator and the super admin.
-- The result comes back as an error message ("SNAPSHOT …"), so nothing is ever committed.
set statement_timeout = '40s';
do $$
declare
  u record; t text; c int; res text := '';
  tables text[] := array['account_deletion_requests','class_assignments','class_courses','class_members','classes',
    'content_blocks','courses','ebooks','enrollments','evaluation_attempts','evaluation_questions','evaluations',
    'gamification','lessons','media_files','modules','offline_downloads','orders','organizations','payments','products',
    'profiles','program_courses','programs','progress','resources','resume_submissions','settings','user_preferences'];
begin
  for u in select * from (values ('anon','anon',null::uuid),
      ('student','authenticated','6d9c7368-7b17-4d7b-af0d-ac6194c264c3'::uuid),   -- celsu-smoke-kit@example.com
      ('admin','authenticated','25b1369e-2d7b-4ffd-9bd8-e39b430d8529'::uuid),     -- celsu-smoke-coach@example.com
      ('super','authenticated','bcce5a84-703a-4063-8fa5-8145ff6f12bf'::uuid)) v(who, role, id)
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', u.id, 'role', u.role)::text, true);
    execute format('set local role %I', u.role);
    res := res || E'\n' || u.who || ': ';
    foreach t in array tables loop
      begin execute format('select count(*) from public.%I', t) into c;
      exception when insufficient_privilege then c := -1; end;
      res := res || t || '=' || c || ' ';
    end loop;
    reset role;
  end loop;
  raise exception 'SNAPSHOT%', res;
end $$;
