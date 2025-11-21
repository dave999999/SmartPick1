# Apply Email Verification System Migration to Supabase
# Run this script to execute the migration in your Supabase database

Write-Host "🚀 Applying Email Verification System Migration..." -ForegroundColor Cyan
Write-Host ""

# Read the migration file
$migrationPath = "supabase/migrations/20251121_email_verification_system.sql"

if (-Not (Test-Path $migrationPath)) {
    Write-Host "❌ Error: Migration file not found at $migrationPath" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Reading migration file..." -ForegroundColor Yellow
$sqlContent = Get-Content $migrationPath -Raw

Write-Host "✅ Migration file loaded successfully" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Migration creates:" -ForegroundColor Cyan
Write-Host "  ✓ email_verification_tokens table" -ForegroundColor White
Write-Host "  ✓ password_reset_tokens table" -ForegroundColor White
Write-Host "  ✓ email_rate_limits table" -ForegroundColor White
Write-Host "  ✓ users.is_email_verified column" -ForegroundColor White
Write-Host "  ✓ RLS policies for security" -ForegroundColor White
Write-Host "  ✓ Rate limiting function (3 emails per 15 min)" -ForegroundColor White
Write-Host "  ✓ Token cleanup function" -ForegroundColor White
Write-Host ""

# Apply migration using Supabase CLI
Write-Host "🔄 Applying migration to Supabase..." -ForegroundColor Yellow

try {
    # Execute the migration
    $output = supabase db push 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🎉 Email Verification System is now active!" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Verify tables in Supabase Dashboard > Database > Tables" -ForegroundColor White
        Write-Host "  2. Test signup flow with email verification" -ForegroundColor White
        Write-Host "  3. Test password reset flow" -ForegroundColor White
        Write-Host ""
        Write-Host "📚 See DEPLOYMENT_CHECKLIST.md for testing guide" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ Warning: Migration may have issues. Check output above." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Alternative: Apply migration manually in Supabase SQL Editor" -ForegroundColor Yellow
        Write-Host "URL: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql/new" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error applying migration: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Manual Application Instructions:" -ForegroundColor Yellow
    Write-Host "  1. Go to: https://supabase.com/dashboard/project/ggzhtpaxnhwcilomswtm/sql/new" -ForegroundColor White
    Write-Host "  2. Copy the entire contents of: $migrationPath" -ForegroundColor White
    Write-Host "  3. Paste into SQL Editor" -ForegroundColor White
    Write-Host "  4. Click 'Run' button" -ForegroundColor White
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
