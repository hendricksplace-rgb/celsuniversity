-- Receipt + program welcome as soon as an order is paid (send-email edge function).
create or replace function private.kick_order_emails(p_order uuid)
returns bigint language plpgsql security definer set search_path to '' as $$
declare anon text := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key');
begin
  if anon is null then raise exception 'Vault secret supabase_anon_key is missing'; end if;
  return net.http_post(url := 'https://pbpnhsgygwqxnkklhyuz.supabase.co/functions/v1/send-email',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||anon,'x-job-token',(select token::text from public.job_tokens where name='send-email')),
    body := jsonb_build_object('event','order_paid','order_id',p_order), timeout_milliseconds := 30000);
end $$;

create or replace function private.on_order_paid()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform private.kick_order_emails(new.id);
  end if;
  return new;
end $$;

create or replace trigger order_paid_emails after insert or update of status on public.orders
  for each row execute function private.on_order_paid();
