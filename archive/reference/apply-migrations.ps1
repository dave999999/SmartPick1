# Apply Security Migrations to Supabase
# This script applies the rate_limits and csrf_tokens tables

$SUPABASE_URL = "https://***REMOVED_PROJECT_ID***.supabase.co"
$SERVICE_ROLE_KEY = "***REMOVED_SERVICE_KEY***"

Write-Host "🚀 Applying Security Migrations to Supabase..." -ForegroundColor Green
Write-Host ""

# Read the SQL file
$sql = Get-Content -Path "APPLY_SECURITY_MIGRATIONS.sql" -Raw

Write-Host "📄 SQL Migration loaded ($($sql.Length) characters)" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: This script uses PostgREST API which has limitations." -ForegroundColor Yellow
Write-Host "   For best results, please:" -ForegroundColor Yellow
Write-Host "   1. Open Supabase Dashboard: https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql" -ForegroundColor Yellow
Write-Host "   2. Copy contents of APPLY_SECURITY_MIGRATIONS.sql" -ForegroundColor Yellow
Write-Host "   3. Paste into SQL Editor and click 'Run'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to open the SQL Editor in your browser..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open browser
Start-Process "https://supabase.com/dashboard/project/***REMOVED_PROJECT_ID***/sql/new"

Write-Host ""
Write-Host "✅ Browser opened! Please apply the migration manually." -ForegroundColor Green
Write-Host ""
Write-Host "After applying migrations, test with: node test-security-features.js" -ForegroundColor Cyan
