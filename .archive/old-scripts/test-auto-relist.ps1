# Test Auto-Relist Edge Function
# This script invokes the Edge Function and shows the results

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Testing Auto-Relist Edge Function" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# ⚠️ CREDENTIALS REMOVED FOR SECURITY - Set these from environment variables
$projectUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY

Write-Host "Project URL: $projectUrl" -ForegroundColor Gray
Write-Host "Function: auto-relist-offers" -ForegroundColor Gray
Write-Host ""

Write-Host "Invoking Edge Function..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "$projectUrl/functions/v1/auto-relist-offers" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $anonKey"
            "Content-Type" = "application/json"
        } `
        -Body "{}" `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    
    if ($response.relisted) {
        Write-Host "📊 Results:" -ForegroundColor Cyan
        Write-Host "  • Total offers found: $($response.total_offers)" -ForegroundColor White
        Write-Host "  • Successfully relisted: $($response.relisted)" -ForegroundColor Green
        Write-Host "  • Failed: $($response.failed)" -ForegroundColor $(if ($response.failed -gt 0) { "Red" } else { "Gray" })
        Write-Host "  • Timestamp: $($response.timestamp)" -ForegroundColor Gray
        
        if ($response.errors -and $response.errors.Count -gt 0) {
            Write-Host ""
            Write-Host "❌ Errors:" -ForegroundColor Red
            $response.errors | ForEach-Object { Write-Host "  • $_" -ForegroundColor Red }
        }
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host ""
        Write-Host "⚠️  Note: 401 Unauthorized may occur if:" -ForegroundColor Yellow
        Write-Host "  • Function requires service_role key (not anon key)" -ForegroundColor Yellow
        Write-Host "  • RLS policies are blocking access" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "💡 Solution: Run the SQL test script instead:" -ForegroundColor Cyan
        Write-Host "  1. Open Supabase Dashboard → SQL Editor" -ForegroundColor Gray
        Write-Host "  2. Copy contents of test-auto-relist.sql" -ForegroundColor Gray
        Write-Host "  3. Run the script to test manually" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Test Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
