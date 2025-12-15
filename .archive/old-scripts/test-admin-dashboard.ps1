# Admin Dashboard Testing Script
# Run these tests systematically to verify all functionality

Write-Host "🎯 SmartPick.ge Admin Dashboard Testing Guide" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 PRE-TESTING CHECKLIST" -ForegroundColor Cyan
Write-Host "-------------------------" -ForegroundColor Cyan
Write-Host "✓ Dev server running: pnpm dev" -ForegroundColor Yellow
Write-Host "✓ Navigate to: http://localhost:5173/admin-dashboard" -ForegroundColor Yellow
Write-Host "✓ Login with ADMIN role user" -ForegroundColor Yellow
Write-Host "✓ Open browser DevTools (F12)" -ForegroundColor Yellow
Write-Host "✓ Open Console tab" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔍 PHASE 1: CONSOLE ERROR CHECK" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan
Write-Host "1. Check console for errors immediately after page load" -ForegroundColor White
Write-Host "   Expected: No 'logger is not defined' errors" -ForegroundColor Gray
Write-Host "   Expected: May see intentional debug logs (Admin API:...)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Click each tab and check console:" -ForegroundColor White
Write-Host "   □ Overview" -ForegroundColor Gray
Write-Host "   □ Partners" -ForegroundColor Gray
Write-Host "   □ Pending" -ForegroundColor Gray
Write-Host "   □ Users" -ForegroundColor Gray
Write-Host "   □ New Users" -ForegroundColor Gray
Write-Host "   □ Banned" -ForegroundColor Gray
Write-Host "   □ Offers" -ForegroundColor Gray
Write-Host "   □ Moderation" -ForegroundColor Gray
Write-Host "   □ Financial" -ForegroundColor Gray
Write-Host "   □ Analytics" -ForegroundColor Gray
Write-Host "   □ Health" -ForegroundColor Gray
Write-Host "   □ Audit" -ForegroundColor Gray
Write-Host "   □ Config" -ForegroundColor Gray
Write-Host ""

Write-Host "🧪 PHASE 2: FUNCTIONAL TESTING" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "PARTNERS TAB:" -ForegroundColor Yellow
Write-Host "  □ Search for partner by business name" -ForegroundColor White
Write-Host "  □ Filter by status (ALL, PENDING, APPROVED, PAUSED, BLOCKED)" -ForegroundColor White
Write-Host "  □ Click 'View' to see partner details" -ForegroundColor White
Write-Host "  □ Test pagination (Next/Prev buttons)" -ForegroundColor White
Write-Host "  □ Select multiple partners (checkboxes)" -ForegroundColor White
Write-Host "  □ Test bulk actions (Approve All)" -ForegroundColor White
Write-Host ""
Write-Host "PENDING TAB:" -ForegroundColor Yellow
Write-Host "  □ View pending partners list" -ForegroundColor White
Write-Host "  □ Click 'Approve' on a partner" -ForegroundColor White
Write-Host "  □ Check toast notification appears" -ForegroundColor White
Write-Host "  □ Verify partner removed from pending list" -ForegroundColor White
Write-Host "  □ Check Partners tab shows approved partner" -ForegroundColor White
Write-Host ""
Write-Host "USERS TAB:" -ForegroundColor Yellow
Write-Host "  □ Search by name or email" -ForegroundColor White
Write-Host "  □ Filter by status (ACTIVE, DISABLED, BANNED)" -ForegroundColor White
Write-Host "  □ Filter by role (ADMIN, CUSTOMER, PARTNER)" -ForegroundColor White
Write-Host "  □ Click 'Edit' to modify user details" -ForegroundColor White
Write-Host "  □ Test disable/enable user" -ForegroundColor White
Write-Host ""
Write-Host "OFFERS TAB:" -ForegroundColor Yellow
Write-Host "  □ Search by title/description" -ForegroundColor White
Write-Host "  □ Filter by status (ACTIVE, PAUSED, EXPIRED)" -ForegroundColor White
Write-Host "  □ Filter by category" -ForegroundColor White
Write-Host "  □ Test enable/disable offer" -ForegroundColor White
Write-Host "  □ Test pagination" -ForegroundColor White
Write-Host ""
Write-Host "FINANCIAL TAB:" -ForegroundColor Yellow
Write-Host "  □ Verify revenue stats display correctly" -ForegroundColor White
Write-Host "  □ Check payouts list loads" -ForegroundColor White
Write-Host "  □ Test 'Create Payout' button" -ForegroundColor White
Write-Host "  □ Test 'Export Report' button (CSV downloads)" -ForegroundColor White
Write-Host "  □ Open CSV file and verify format" -ForegroundColor White
Write-Host ""
Write-Host "CONFIG TAB:" -ForegroundColor Yellow
Write-Host "  □ View all configuration tabs" -ForegroundColor White
Write-Host "  □ Change a setting (e.g., welcomePoints)" -ForegroundColor White
Write-Host "  □ Click 'Save Changes'" -ForegroundColor White
Write-Host "  □ Verify toast confirmation" -ForegroundColor White
Write-Host "  □ Refresh page and verify change persisted" -ForegroundColor White
Write-Host ""

Write-Host "🐛 PHASE 3: ERROR SCENARIOS" -ForegroundColor Cyan
Write-Host "---------------------------" -ForegroundColor Cyan
Write-Host "  □ Try to delete partner with active offers (should show error)" -ForegroundColor White
Write-Host "  □ Try invalid phone number when adding partner" -ForegroundColor White
Write-Host "  □ Try to ban yourself (should prevent)" -ForegroundColor White
Write-Host "  □ Test rate limiting (rapid API calls)" -ForegroundColor White
Write-Host "  □ Test with network offline (error messages)" -ForegroundColor White
Write-Host ""

Write-Host "📊 PHASE 4: PERFORMANCE CHECK" -ForegroundColor Cyan
Write-Host "-----------------------------" -ForegroundColor Cyan
Write-Host "  □ Check page load time (< 2 seconds)" -ForegroundColor White
Write-Host "  □ Check search response time (< 500ms)" -ForegroundColor White
Write-Host "  □ Check stats refresh time (< 1 second)" -ForegroundColor White
Write-Host "  □ Test with 1000+ records (pagination should help)" -ForegroundColor White
Write-Host ""

Write-Host "🔒 PHASE 5: SECURITY VERIFICATION" -ForegroundColor Cyan
Write-Host "----------------------------------" -ForegroundColor Cyan
Write-Host "  □ Logout and try to access /admin-dashboard (should redirect)" -ForegroundColor White
Write-Host "  □ Login as regular user, try /admin-dashboard (should deny)" -ForegroundColor White
Write-Host "  □ Check RLS policies block non-admin queries:" -ForegroundColor White
Write-Host "     • Open browser DevTools → Network tab" -ForegroundColor Gray
Write-Host "     • Filter by 'rest' (Supabase API calls)" -ForegroundColor Gray
Write-Host "     • Verify no 403 errors (RLS blocking)" -ForegroundColor Gray
Write-Host ""

Write-Host "✅ EXPECTED RESULTS" -ForegroundColor Green
Write-Host "-------------------" -ForegroundColor Green
Write-Host "Console: Clean (no 'logger is not defined' errors)" -ForegroundColor White
Write-Host "Console: May see debug logs like 'Admin API: Fetching...' (NORMAL)" -ForegroundColor White
Write-Host "Network: All Supabase requests return 200 (or 201 for inserts)" -ForegroundColor White
Write-Host "UI: Toast notifications on all actions" -ForegroundColor White
Write-Host "UI: Loading states during data fetch" -ForegroundColor White
Write-Host "UI: Confirmation dialogs for destructive actions" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  REPORT ISSUES" -ForegroundColor Red
Write-Host "-----------------" -ForegroundColor Red
Write-Host "If you find any errors, document:" -ForegroundColor White
Write-Host "  1. Tab where error occurred" -ForegroundColor Gray
Write-Host "  2. Action performed" -ForegroundColor Gray
Write-Host "  3. Exact error message (console + screenshot)" -ForegroundColor Gray
Write-Host "  4. Network request details (DevTools → Network)" -ForegroundColor Gray
Write-Host "  5. User role and permissions" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 DOCUMENTATION" -ForegroundColor Cyan
Write-Host "----------------" -ForegroundColor Cyan
Write-Host "Full Audit: ADMIN_DASHBOARD_AUDIT_REPORT.md" -ForegroundColor White
Write-Host "Quick Summary: ADMIN_DASHBOARD_QUICK_SUMMARY.md" -ForegroundColor White
Write-Host ""

Write-Host "🚀 READY TO TEST!" -ForegroundColor Green
Write-Host "Run: pnpm dev" -ForegroundColor Yellow
Write-Host "Open: http://localhost:5173/admin-dashboard" -ForegroundColor Yellow
Write-Host "Check: Browser console (F12)" -ForegroundColor Yellow
Write-Host ""
