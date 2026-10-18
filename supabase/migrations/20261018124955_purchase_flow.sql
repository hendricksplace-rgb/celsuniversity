-- Purchase flow (Stripe Checkout + stripe-webhook). Prices live here so Matt can change them.
alter table public.products
  add column if not exists program text,            -- celstv | celsbsns | celsus | celsglobal | bundle
  add column if not exists tier text,               -- standard | premium | single | plan
  add column if not exists access_label text,       -- "1 año", "6 meses"… (shown to buyers)
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists installments jsonb,      -- plan: cents per monthly charge, in order
  add column if not exists sort_order int not null default 0;
comment on column public.products.grants is 'What a purchase opens: [{"course": slug} or {"program": slug}, "months": n]';

insert into public.products (code, name, price_usd_cents, program, tier, access_label, grants, installments, sort_order) values
  ('celstv_standard', 'CelsTV Standard', 9900, 'celstv', 'standard', '1 año', '[{"course":"celstv-english-for-our-generation","months":12}]', null, 10),
  ('celstv_premium', 'CelsTV Premium', 14900, 'celstv', 'premium', '1 año', '[{"course":"celstv-english-for-our-generation","months":12}]', null, 11),
  ('celsbsns_standard', 'CelsBSNS Standard', 12000, 'celsbsns', 'standard', '6 meses', '[{"course":"english-for-business","months":6}]', null, 20),
  ('celsbsns_premium', 'CelsBSNS Premium', 19900, 'celsbsns', 'premium', '6 meses', '[{"course":"english-for-business","months":6}]', null, 21),
  ('celsus_estandar', 'CelsUS Estándar', 13900, 'celsus', 'standard', '9 meses', '[{"course":"celsus-para-ciudadania","months":9}]', null, 30),
  ('celsus_completo', 'CelsUS Paquete Completo', 19900, 'celsus', 'premium', '9 meses', '[{"course":"celsus-para-ciudadania","months":9}]', null, 31),
  ('celsglobal', 'CelsGLOBAL · un solo pago', 49900, 'celsglobal', 'single', '18 meses', '[{"program":"international-professional-development","months":18}]', null, 40),
  ('celsglobal_plan', 'CelsGLOBAL · 5 pagos mensuales', 49900, 'celsglobal', 'plan', '18 meses', '[{"program":"international-professional-development","months":18}]', '[10000,10000,10000,10000,9900]', 41),
  ('bundle_tv_bsns', 'CelsTV + CelsBSNS', 15000, 'bundle', 'single', 'CelsTV 1 año · CelsBSNS 6 meses', '[{"course":"celstv-english-for-our-generation","months":12},{"course":"english-for-business","months":6}]', null, 50),
  ('bundle_us_tvpremium', 'CelsUS + CelsTV Premium', 29900, 'bundle', 'single', 'CelsUS 9 meses · CelsTV 1 año', '[{"course":"celsus-para-ciudadania","months":9},{"course":"celstv-english-for-our-generation","months":12}]', null, 51)
on conflict (code) do update set name = excluded.name, price_usd_cents = excluded.price_usd_cents, program = excluded.program, tier = excluded.tier,
  access_label = excluded.access_label, grants = excluded.grants, installments = excluded.installments, sort_order = excluded.sort_order;

-- Paused: a CelsGLOBAL plan installment failed after every retry (access comes back on invoice.paid).
-- Refunded: access closed by a refund. Progress is never deleted in either case.
alter table public.enrollments drop constraint enrollments_status_check;
alter table public.enrollments add constraint enrollments_status_check check (status in ('active','completed','cancelled','paused','refunded'));
alter table public.enrollments add column if not exists order_id uuid references public.orders(id) on delete set null;
create index if not exists enrollments_order_idx on public.enrollments (order_id);

alter table public.orders
  add column if not exists buyer_name text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists paid_at timestamptz;
create index if not exists orders_subscription_idx on public.orders (stripe_subscription_id);

-- Every charge and refund, as Stripe reports it.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('checkout','installment','refund')),
  amount_usd_cents int not null,
  card_last4 text,
  stripe_payment_intent text,
  stripe_invoice_id text,
  stripe_charge_id text,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id);
alter table public.payments enable row level security;
create policy own_read on public.payments for select to authenticated using (user_id = (select auth.uid()));
create policy admin_all on public.payments for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Webhook idempotency: one row per Stripe event id.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

insert into public.settings (key, value) values ('whatsapp_url', 'null'::jsonb) on conflict (key) do nothing;
