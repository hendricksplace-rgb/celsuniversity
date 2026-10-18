-- 'sending' while Resend is called, 'failed' when it refuses.
alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check check (status in ('stubbed', 'sending', 'sent', 'failed', 'error'));
