# Remove Old Penalty System - Complete Cleanup

## Files to completely remove:
1. `src/lib/penalty-system.ts` - Old penalty logic
2. `src/lib/api/penalties.ts` - Old penalty API

## Code to remove from existing files:

### src/lib/types.ts
Remove from User interface:
- `penalty_count?: number;`
- `penalty_until?: Date | null;`
- `is_banned?: boolean;`
- `penalty_warning_shown?: boolean;`

Remove interface:
- `PenaltyInfo` interface

### src/lib/api.ts
Remove export:
- `export { checkUserPenalty } from './penalty-system';`

### src/pages/ReserveOffer.tsx
- Remove `PenaltyInfo` from imports
- Remove `penaltyInfo` state
- Remove `loadPenaltyInfo()` function
- Remove `penaltyInfo?.isUnderPenalty` checks
- Remove old countdown logic

### src/pages/ReservationDetail.tsx
- Remove old penalty check querying `penalty_count, penalty_until, is_banned`
- Remove `userPenaltyInfo` state if only used for old system

### src/pages/UserProfile.tsx
- Remove `penalty_count` displays
- Remove penalty warnings/notifications based on old columns

### src/lib/admin-api.ts
- Remove `penalty_count: 0` from user creation

### src/components/admin/BannedUsers.tsx
- Update to use new penalty system or remove penalty_count display

## Database cleanup (run in Supabase SQL Editor):

```sql
-- Optionally drop old penalty columns (CAREFUL - data loss!)
-- Only run this after confirming new penalty system works
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS penalty_count,
  DROP COLUMN IF EXISTS penalty_until,
  DROP COLUMN IF EXISTS is_banned,
  DROP COLUMN IF EXISTS penalty_warning_shown;
```
