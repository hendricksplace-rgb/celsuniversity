-- C-051: Admin → Clases writes its changes to admin_audit_log; allow its tables and actions.
alter table public.admin_audit_log drop constraint if exists admin_audit_log_table_name_check;
alter table public.admin_audit_log add constraint admin_audit_log_table_name_check
  check (table_name = any (array['courses','modules','lessons','content_blocks','enrollments','profiles','classes','class_members','class_courses']));
alter table public.admin_audit_log drop constraint if exists admin_audit_log_action_check;
alter table public.admin_audit_log add constraint admin_audit_log_action_check
  check (action = any (array['insert','update','delete','reorder','duplicate','undo','change_email','archive','unarchive','add_member','remove_member']));
