-- Additive only. Apply to a dedicated test database before any production review.
begin;
create table if not exists public.gym_commission_settings (
  id text primary key check (id = 'platform'),
  bps integer not null check (bps between 0 and 10000),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array')
);
alter table public.gym_commission_settings enable row level security;
revoke all on public.gym_commission_settings from anon, authenticated;
grant select, insert, update on public.gym_commission_settings to service_role;
-- 15% is the primary MVP specification. Administrator can change it; no historic backfill.
insert into public.gym_commission_settings (id, bps) values ('platform', 1500) on conflict (id) do nothing;

create or replace function public.gym_update_commission(new_bps integer, expected_version integer, actor text)
returns void language plpgsql security invoker set search_path = public as $$
declare previous public.gym_commission_settings;
begin
  if new_bps < 0 or new_bps > 10000 or new_bps is null or actor is null or length(actor) > 320 then
    raise exception 'invalid commission settings' using errcode = '22023';
  end if;
  select * into previous from public.gym_commission_settings where id = 'platform' for update;
  if previous.version is distinct from expected_version then
    raise sqlstate 'PT409' using message = 'Commission version conflict';
  end if;
  update public.gym_commission_settings set bps = new_bps, version = previous.version + 1, updated_at = now(),
    history = previous.history || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'fromBps', previous.bps,
      'toBps', new_bps, 'version', previous.version + 1, 'changedBy', actor, 'changedAt', now()))
    where id = 'platform';
end;
$$;
revoke all on function public.gym_update_commission(integer, integer, text) from public, anon, authenticated;
grant execute on function public.gym_update_commission(integer, integer, text) to service_role;

alter table public.gym_reservations add column if not exists financial_snapshot jsonb;
alter table public.gym_reservations add column if not exists refunded_platform_fee_cents bigint;
alter table public.gym_reservations add column if not exists stripe_checkout_session_id text;
create unique index if not exists gym_reservations_checkout_unique on public.gym_reservations(stripe_checkout_session_id) where stripe_checkout_session_id is not null;
create unique index if not exists gym_reservations_payment_intent_unique on public.gym_reservations(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

create or replace function public.gym_protect_financial_snapshot()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.financial_snapshot is not null and new.financial_snapshot is distinct from old.financial_snapshot then
    raise exception 'Historic financial snapshot is immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists gym_financial_snapshot_immutable on public.gym_reservations;
create trigger gym_financial_snapshot_immutable before update on public.gym_reservations
  for each row execute function public.gym_protect_financial_snapshot();
commit;
