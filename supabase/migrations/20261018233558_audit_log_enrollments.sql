-- Batch 4 §3: "Dar acceso" (manual enrollments by staff) is logged in admin_audit_log too.
alter table public.admin_audit_log drop constraint admin_audit_log_table_name_check;
alter table public.admin_audit_log add constraint admin_audit_log_table_name_check
  check (table_name = any (array['courses', 'modules', 'lessons', 'content_blocks', 'enrollments']));
