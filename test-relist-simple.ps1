# Simple Auto-Relist Test
Write-Host "Testing Auto-Relist Edge Function..." -ForegroundColor Cyan

# ⚠️ CREDENTIALS REMOVED FOR SECURITY - Set these from environment variables
$url = $env:VITE_SUPABASE_URL + "/functions/v1/auto-relist-offers"
$key = $env:VITE_SUPABASE_ANON_KEY

try {
    $headers = @{
        "Authorization" = "Bearer $key"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body "{}"
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Total offers: $($response.total_offers)"
    Write-Host "Relisted: $($response.relisted)"
    Write-Host "Failed: $($response.failed)"
    $response | ConvertTo-Json
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This is expected - function needs service_role key or cron setup" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Use test-auto-relist.sql in Supabase SQL Editor instead!" -ForegroundColor Cyan
}
