# Performance Optimizations

Date: 2025-11-21

## Overview
This document summarizes recent frontend performance improvements and provides guidance for ongoing bundle monitoring.

## Changes Implemented
1. Deep Import for date-fns
   - Replaced root import `{ format } from 'date-fns'` with `import format from 'date-fns/format'` to reduce incidental tree inclusion.
2. Bundle Baseline Capture
   - Added `bundle-baseline.json` storing initial core asset sizes (raw + gzip approximations from build output).
3. Bundle Analysis Script
   - Created `scripts/analyze-bundle.mjs` to diff current `dist/assets` against baseline and flag regressions (>5kB growth).
4. Service Worker Enhancements
   - Introduced version bump `v2`.
   - Added best-effort precache for hashed JS bundles referenced in `index.html`.
   - Switched app shell strategy from pure cache-first to **stale-while-revalidate** for fresher updates without blocking.
   - Retained specialized strategies (cache-first for images; network for Supabase and map tiles).

## How to Run Bundle Analysis
After any build:
```powershell
pnpm build
node scripts/analyze-bundle.mjs
```
Outputs `bundle-report.json` and console table of deltas.

## Updating Baseline
When intentionally reducing bundle size or after major refactors:
```powershell
Copy-Item bundle-report.json bundle-baseline.json
```
(Verify improvements are stable before overwriting.)

## Interpreting Report
- `deltaRawKB`: Positive indicates growth; investigate if >5kB.
- `regression: YES`: Automatic flag; check for large library additions or accidental eager imports.
- Common causes:
  - Importing entire libraries instead of modular deep imports.
  - Adding heavy visualization or mapping libraries to initial route.
  - Accidental polyfill duplication.

## Service Worker Strategy Notes
- Stale-while-revalidate ensures users get instant cached shell while background fetch refreshes assets.
- Precache step is best-effort; failures are logged but non-fatal.
- Increment `CACHE_VERSION` on strategy logic changes or when invalidating all caches.

## Future Opportunities
- Code-split admin dashboard charts further by route boundary.
- Replace chart.js with lighter alternatives for simple visualizations.
- Investigate tree-shaking of lucide-react icon imports (ensure only used icons bundled).
- Consider dynamic import for Supabase vendor chunk only after auth state resolution.

## Monitoring Suggestions
- Integrate script into CI (fail build on regression >10kB):
```powershell
node scripts/analyze-bundle.mjs; if (Select-String -Path bundle-report.json -Pattern '"regression": true') { Write-Error 'Bundle regression detected'; exit 1 }
```

## Rollback Procedure
If a performance change causes issues:
1. Revert commit touching `service-worker.js` or analysis tooling.
2. Increment `CACHE_VERSION` again to force clients to fresh cache state.
3. Rebuild and redeploy.

---
Maintained by: Performance Engineering
