-- C-046: admins change a user's email (admin-change-email Edge Function). Each change is one row in
-- admin_audit_log: action 'change_email', table_name 'profiles', row_id = the user, before/after = { email, … }.
-- The detail page (Admin → Estudiantes → student) reads the latest one for "Correo cambiado {fecha}".
alter table public.admin_audit_log drop constraint admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action = any (array['insert', 'update', 'delete', 'reorder', 'duplicate', 'undo', 'change_email']));

alter table public.admin_audit_log drop constraint admin_audit_log_table_name_check;
alter table public.admin_audit_log add constraint admin_audit_log_table_name_check
  check (table_name = any (array['courses', 'modules', 'lessons', 'content_blocks', 'enrollments', 'profiles']));

-- "Correo cambiado {fecha}" looks rows up by user.
create index if not exists admin_audit_log_row_idx on public.admin_audit_log (row_id, id desc) where action = 'change_email';
