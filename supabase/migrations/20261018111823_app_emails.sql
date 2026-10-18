-- App emails through Resend (send-email edge function).
alter table public.email_outbox
  add column if not exists template text,
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists order_id uuid references public.orders(id) on delete set null,
  add column if not exists dedupe_key text,
  add column if not exists resend_id text;
create unique index if not exists email_outbox_dedupe_key on public.email_outbox (dedupe_key);

-- Set by the Stripe webhook with the payment; shown on the receipt.
alter table public.orders add column if not exists card_last4 text check (card_last4 ~ '^[0-9]{4}$');

insert into public.job_tokens (name, token) values ('send-email', gen_random_uuid()) on conflict (name) do nothing;

-- Templates (emails/app + manifest.json) are uploaded here by scripts/upload-email-templates.mjs.
insert into storage.buckets (id, name, public) values ('email-templates', 'email-templates', false) on conflict (id) do nothing;
