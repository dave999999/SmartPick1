# Audit Logging

Date: 2025-11-21

## Purpose
Provide an immutable trail of security-relevant and administrative actions (points awards, payment webhooks, referral reviews) to support incident response, compliance, and debugging.

## Schema
Table: `public.audit_log`
```sql
id UUID PK DEFAULT gen_random_uuid()
event_type TEXT NOT NULL
actor_id UUID REFERENCES users(id) ON DELETE SET NULL
target_id UUID
metadata JSONB DEFAULT '{}'::jsonb
ip_address TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Indexes
- `event_type`
- `actor_id`
- `target_id`
- `created_at DESC`

### RLS Policies
- Select: Allowed for roles `admin` & `super_admin` or `service_role` (other authenticated users see zero rows)
- Insert: Only `service_role`
- Update/Delete: Blocked (append-only)

## Event Types
| Event | Description | Metadata Keys |
|-------|-------------|---------------|
| `POINTS_AWARDED` | Points credited or debited | amount, reason, tx_id, caller_role |
| `PAYMENT_WEBHOOK_CONFIRMED` | Payment webhook processed successfully | amount, currency, reference, status |
| `REFERRAL_REVIEW` | Manual referral fraud review | action, reason, referrer_id, suspicious_score |

## Insert Sources
1. `add_user_points` function (SECURITY DEFINER) adds `POINTS_AWARDED`.
2. `bog-webhook` Edge Function adds `PAYMENT_WEBHOOK_CONFIRMED`.
3. `admin_review_referral` function adds `REFERRAL_REVIEW`.

## Admin Dashboard Integration
Component: `AuditLogPanel` under the `Audit` tab shows latest entries with:
- Event type badge
- Actor and target IDs
- IP address (when available)
- Raw JSON metadata (truncated)
- Filters: text search (metadata/IP), event type, limit

## Adding New Events
1. Decide unique `event_type` string (UPPER_SNAKE_CASE).
2. Insert within server-side function or Edge Function using service role:
```ts
await supabase.from('audit_log').insert({
  event_type: 'ACHIEVEMENT_CLAIMED',
  actor_id: userId,
  target_id: achievementId,
  metadata: { points: 50, achievement_code: 'STREAK_7' },
  ip_address: req.headers.get('cf-connecting-ip')
});
```
3. Update `AuditLogPanel` color map if custom styling required.

## Query Examples
Recent events:
```sql
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50;
```
Specific user:
```sql
SELECT * FROM audit_log WHERE target_id = '00000000-0000-0000-0000-000000000000' ORDER BY created_at DESC;
```
Points changes:
```sql
SELECT metadata->>'amount' AS amount, created_at FROM audit_log WHERE event_type = 'POINTS_AWARDED' ORDER BY created_at DESC;
```

## Considerations
- Actor attribution: `add_user_points` currently logs `actor_id` as NULL (system operation). Extend function signature if end-user attribution is needed.
- Storage growth: Periodically archive old rows (>180 days) to cold storage if volume grows significantly.
- Integrity: Application logic prevents updates/deletes; for cryptographic integrity you could add a hash chain later.

## Future Enhancements
- Add `user_agent` column if browser-origin events are logged.
- Provide export endpoint restricted to super-admin.
- Add anomaly detection jobs (e.g., spike in POINTS_AWARDED).

## Rollback
To remove audit logging:
1. Drop policies and table:
```sql
DROP TABLE IF EXISTS audit_log CASCADE;
```
2. Remove insert statements from functions/Edge Functions.

---
Maintainer: Security Engineering
