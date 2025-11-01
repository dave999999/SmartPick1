-- Ensure pg_cron is available (Supabase supports this extension)
create extension if not exists pg_cron;

-- Function: set SOLD_OUT when quantity_available <= 0
create or replace function public.set_offer_sold_out()
returns trigger language plpgsql as $$
begin
  if new.quantity_available is not null and new.quantity_available <= 0 then
    new.status := 'SOLD_OUT';
  elsif new.status = 'SOLD_OUT' and (new.quantity_available is null or new.quantity_available > 0) then
    -- If stock returns, mark ACTIVE again (optional; remove if undesired)
    new.status := 'ACTIVE';
  end if;
  return new;
end;$$;

drop trigger if exists trg_offer_sold_out on public.offers;
create trigger trg_offer_sold_out
before insert or update of quantity_available on public.offers
for each row execute function public.set_offer_sold_out();

-- Function: set EXPIRED when now >= expires_at
create or replace function public.set_offer_expired_on_write()
returns trigger language plpgsql as $$
begin
  if new.expires_at is not null and new.expires_at <= now() at time zone 'utc' then
    new.status := 'EXPIRED';
  end if;
  return new;
end;$$;

drop trigger if exists trg_offer_expired_on_write on public.offers;
create trigger trg_offer_expired_on_write
before insert or update of expires_at, pickup_end on public.offers
for each row execute function public.set_offer_expired_on_write();

-- Scheduled job: periodically expire offers that passed expires_at
-- Runs every 5 minutes; updates only non-expired rows
select cron.schedule(
  'expire_offers_every_5m',
  '*/5 * * * *',
  $$update public.offers
    set status = 'EXPIRED'
    where status <> 'EXPIRED'
      and expires_at is not null
      and now() at time zone 'utc' >= expires_at;$$
) on conflict (jobname) do update set schedule = excluded.schedule;

-- Helpful indexes
create index if not exists idx_offers_status_expires_at on public.offers(status, expires_at);
create index if not exists idx_offers_partner_id on public.offers(partner_id);
