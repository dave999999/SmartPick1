-- Admin Dashboard v2: Unified Stats RPC and admin audit view
-- Safe, additive migration — does not drop or rename existing objects

-- 1) Unified Stats RPC
-- Returns one row with key admin metrics
create or replace function public.get_admin_dashboard_stats()
returns table (
  total_users integer,
  total_partners integer,
  active_offers integer,
  reservations_today integer,
  revenue_today numeric
)
language sql
security definer
as $$
  select
    (select count(*) from public.users) as total_users,
    (select count(*) from public.partners) as total_partners,
    (select count(*) from public.offers where status = 'ACTIVE' and expires_at > now()) as active_offers,
    (select count(*) from public.reservations where created_at::date = now()::date) as reservations_today,
    coalesce((select sum(total_price) from public.reservations where status = 'PICKED_UP' and created_at::date = now()::date), 0)::numeric as revenue_today;
$$;

comment on function public.get_admin_dashboard_stats() is 'Unified admin dashboard stats';

-- 2) Compatibility view: admin_audit_logs -> maps to existing public.audit_logs
create or replace view public.admin_audit_logs as
  select * from public.audit_logs;

comment on view public.admin_audit_logs is 'Compatibility view over audit_logs for admin modules';

-- (Optional) Ensure only admins can select via base table policy; view inherits base RLS

