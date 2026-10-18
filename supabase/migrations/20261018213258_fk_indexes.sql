-- Supabase advisor "unindexed foreign keys" (2026-10-18): one covering index per foreign key.
create index if not exists class_assignments_created_by_idx on public.class_assignments (created_by);
create index if not exists class_assignments_module_id_idx on public.class_assignments (module_id);
create index if not exists email_outbox_lead_id_idx on public.email_outbox (lead_id);
create index if not exists email_outbox_order_id_idx on public.email_outbox (order_id);
create index if not exists email_outbox_user_id_idx on public.email_outbox (user_id);
create index if not exists eval_sessions_user_id_idx on public.eval_sessions (user_id);
create index if not exists lesson_answers_block_id_idx on public.lesson_answers (block_id);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists submissions_reviewed_by_idx on public.submissions (reviewed_by);
