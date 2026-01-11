# Supabase Deployment Script
# Run these scripts in order in the Supabase SQL Editor

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  SUPABASE SQL DEPLOYMENT SCRIPT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will guide you through deploying SQL to Supabase." -ForegroundColor Yellow
Write-Host "Open Supabase SQL Editor at: https://supabase.com/dashboard/project/YOUR_PROJECT/sql" -ForegroundColor Yellow
Write-Host ""

# Define scripts in deployment order
$scripts = @(
    @{
        Order = 1
        File = "CREATE_REALTIME_PRESENCE_TRACKING.sql"
        Description = "Presence tracking system (online users)"
        EstimatedTime = "10 seconds"
    },
    @{
        Order = 2
        File = "CREATE_AUDIT_LOGS_TABLE.sql"
        Description = "Audit logging infrastructure"
        EstimatedTime = "15 seconds"
    },
    @{
        Order = 3
        File = "CREATE_AUDIT_LOG_FUNCTION.sql"
        Description = "Audit logging functions"
        EstimatedTime = "10 seconds"
    },
    @{
        Order = 4
        File = "CREATE_PENALTY_SYNC_TRIGGER.sql"
        Description = "Penalty auto-sync trigger"
        EstimatedTime = "5 seconds"
    },
    @{
        Order = 5
        File = "CREATE_UNIFIED_BAN_VIEW.sql"
        Description = "Unified ban view (manual + auto)"
        EstimatedTime = "5 seconds"
    },
    @{
        Order = 6
        File = "UPDATE_ADMIN_FUNCTIONS_WITH_AUDIT.sql"
        Description = "Admin functions with audit logging"
        EstimatedTime = "15 seconds"
    }
)

Write-Host "📋 Deployment Order:" -ForegroundColor Green
Write-Host ""
foreach ($script in $scripts) {
    Write-Host "  $($script.Order). " -NoNewline -ForegroundColor Cyan
    Write-Host "$($script.File)" -ForegroundColor White
    Write-Host "     └─ $($script.Description)" -ForegroundColor Gray
    Write-Host "     └─ Est. time: $($script.EstimatedTime)" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  MANUAL DEPLOYMENT STEPS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

foreach ($script in $scripts) {
    $filePath = "D:\v3\workspace\shadcn-ui\$($script.File)"
    
    if (Test-Path $filePath) {
        Write-Host "[$($script.Order)/$($scripts.Count)] " -NoNewline -ForegroundColor Yellow
        Write-Host $script.File -ForegroundColor White
        Write-Host ""
        Write-Host "    📄 File: " -NoNewline -ForegroundColor Gray
        Write-Host $filePath -ForegroundColor Cyan
        Write-Host "    📝 Description: " -NoNewline -ForegroundColor Gray
        Write-Host $script.Description -ForegroundColor White
        Write-Host "    ⏱️  Estimated time: " -NoNewline -ForegroundColor Gray
        Write-Host $script.EstimatedTime -ForegroundColor Green
        Write-Host ""
        Write-Host "    ✅ STEPS:" -ForegroundColor Yellow
        Write-Host "       1. Open file in VS Code" -ForegroundColor White
        Write-Host "       2. Copy entire contents (Ctrl+A, Ctrl+C)" -ForegroundColor White
        Write-Host "       3. Paste into Supabase SQL Editor" -ForegroundColor White
        Write-Host "       4. Click RUN button" -ForegroundColor White
        Write-Host "       5. Wait for success message" -ForegroundColor White
        Write-Host ""
        
        $response = Read-Host "    Press Enter when complete, or type 'skip' to skip"
        
        if ($response -eq 'skip') {
            Write-Host "    ⏭️  Skipped" -ForegroundColor Yellow
        } else {
            Write-Host "    ✔️  Completed!" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "    ─────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host ""
    } else {
        Write-Host "    ❌ FILE NOT FOUND: $filePath" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  POST-DEPLOYMENT TASKS" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📅 Set up Supabase Cron Jobs:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Go to Supabase Dashboard → Database → Cron" -ForegroundColor White
Write-Host ""
Write-Host "   2. Add job: cleanup_stale_presence()" -ForegroundColor Green
Write-Host "      - Schedule: " -NoNewline -ForegroundColor Gray
Write-Host "*/10 * * * *" -ForegroundColor Cyan
Write-Host "        (every 10 minutes)" -ForegroundColor DarkGray
Write-Host "      - Command: " -NoNewline -ForegroundColor Gray
Write-Host "SELECT cleanup_stale_presence();" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. Add job: cleanup_old_audit_logs()" -ForegroundColor Green
Write-Host "      - Schedule: " -NoNewline -ForegroundColor Gray
Write-Host "0 2 * * *" -ForegroundColor Cyan
Write-Host "        (daily at 2 AM)" -ForegroundColor DarkGray
Write-Host "      - Command: " -NoNewline -ForegroundColor Gray
Write-Host "SELECT cleanup_old_audit_logs(90);" -ForegroundColor Cyan
Write-Host ""

Write-Host "📊 Monitor Usage:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Go to Supabase Dashboard → Settings → Usage" -ForegroundColor White
Write-Host "   2. Check daily for 1 week:" -ForegroundColor White
Write-Host "      - Database Queries" -ForegroundColor Gray
Write-Host "      - Bandwidth" -ForegroundColor Gray
Write-Host "      - Storage" -ForegroundColor Gray
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION QUERIES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Run these in Supabase SQL Editor to verify:" -ForegroundColor Yellow
Write-Host ""

$verificationQueries = @"
-- Check presence tracking
SELECT * FROM user_presence LIMIT 5;

-- Check audit logs table
SELECT * FROM audit_logs LIMIT 5;

-- Test online stats function
SELECT * FROM get_online_stats();

-- Check functions exist
SELECT proname, prosrc FROM pg_proc 
WHERE proname IN ('update_user_presence', 'get_online_stats', 'cleanup_stale_presence', 'cleanup_old_audit_logs');
"@

Write-Host $verificationQueries -ForegroundColor Cyan
Write-Host ""

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT COMPLETE! 🎉" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Rebuild and deploy your app (pnpm build)" -ForegroundColor White
Write-Host "  2. Test admin dashboard Live Monitoring tab" -ForegroundColor White
Write-Host "  3. Check online user counts (should see real numbers)" -ForegroundColor White
Write-Host "  4. Monitor Supabase usage for 24 hours" -ForegroundColor White
Write-Host ""
Write-Host "For optimization details, see: SUPABASE_OPTIMIZATION_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
