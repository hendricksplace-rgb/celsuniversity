-- «Enviar invitación» (Matt, 2026-10-20): students imported from the old platform already have access but no
-- password. Staff send them the invite-celsglobal email; its button is ${SITE_URL}/activar?t=<token>, a durable
-- link (30 days) that the student-invite Edge Function turns into a fresh recovery session on each click.
-- Only the sha256 of the token is stored. Rows are written by the Edge Function (service role); staff read.
create table if not exists public.student_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  seq int not null,
  sent_at timestamptz not null default now(),
  sent_by uuid references public.profiles(id) on delete set null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'stubbed', 'failed')),
  error text,
  email_outbox_id bigint references public.email_outbox(id) on delete set null,
  redeemed_at timestamptz,
  redeem_count int not null default 0,
  activated_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  unique (user_id, seq)
);
create index if not exists student_invites_user_idx on public.student_invites (user_id, sent_at desc);

comment on table public.student_invites is 'Invitations to set a password (Admin → Estudiantes → «Enviar invitación»). token_hash = sha256 hex of the link token. redeemed_at: first click; activated_at: password set (public.mark_invite_activated).';

alter table public.student_invites enable row level security;
create policy staff_read on public.student_invites for select to authenticated using ((select private.is_staff()));
revoke insert, update, delete on public.student_invites from anon, authenticated;
revoke all on public.student_invites from anon;

-- Who may send invitations: whoever may give access (RLS on enrollments: admins). Called as the caller.
create or replace function public.can_send_invites() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin()
$$;
revoke execute on function public.can_send_invites() from public, anon;
grant execute on function public.can_send_invites() to authenticated;

-- Admin → Estudiantes: last sign-in comes from auth.users, which the app can't read. Admins only.
create or replace function public.admin_student_signins(p_ids uuid[])
returns table (user_id uuid, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query select u.id, u.last_sign_in_at from auth.users u where u.id = any(p_ids);
end $$;
revoke execute on function public.admin_student_signins(uuid[]) from public, anon;
grant execute on function public.admin_student_signins(uuid[]) to authenticated;

-- "Invitación pendiente": a student with active access who never signed in and was never sent an invitation.
create or replace function public.admin_invite_pending()
returns table (user_id uuid, email text, display_name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, p.email, p.display_name
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role in ('individual_student', 'student')
      and u.last_sign_in_at is null
      and p.email is not null
      and exists (select 1 from public.enrollments e where e.user_id = p.id and e.status = 'active' and (e.expires_at is null or e.expires_at > now()))
      and not exists (select 1 from public.student_invites i where i.user_id = p.id)
    order by p.created_at;
end $$;
revoke execute on function public.admin_invite_pending() from public, anon;
grant execute on function public.admin_invite_pending() to authenticated;

-- /nueva-contrasena calls this after the password is saved: the invitation link stops working
-- (until then, re-clicks are fine). No-op for people who weren't invited.
create or replace function public.mark_invite_activated() returns void
language sql volatile security definer set search_path = '' as $$
  update public.student_invites set activated_at = now()
  where user_id = (select auth.uid()) and activated_at is null and redeemed_at is not null
$$;
revoke execute on function public.mark_invite_activated() from public, anon;
grant execute on function public.mark_invite_activated() to authenticated;
