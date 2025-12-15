# PowerShell script to deploy edge function using Supabase REST API

$projectRef = "ggzhipaxnhwcilomswtn"
$accessToken = "sbp_4c00dfad6a52e30fd3e52ffb3cf72e71d66f9bf2"
$functionName = "send-announcement"

Write-Host "🚀 Deploying $functionName to Supabase..." -ForegroundColor Cyan

# Read and encode the function
$functionPath = "supabase\functions\$functionName\index.ts"
$functionCode = Get-Content $functionPath -Raw -Encoding UTF8

# Create multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = (
    "--$boundary",
    "Content-Disposition: form-data; name=`"name`"$LF",
    $functionName,
    "--$boundary",
    "Content-Disposition: form-data; name=`"verify_jwt`"$LF",
    "true",
    "--$boundary",
    "Content-Disposition: form-data; name=`"import_map`"$LF",
    "false",
    "--$boundary",
    "Content-Disposition: form-data; name=`"entrypoint_path`"; filename=`"index.ts`"",
    "Content-Type: application/typescript$LF",
    $functionCode,
    "--$boundary--$LF"
) -join $LF

try {
    $uri = "https://api.supabase.com/v1/projects/$projectRef/functions"
    
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    Write-Host "📤 Uploading function code..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bodyLines -ContentType "multipart/form-data; boundary=$boundary"
    
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Function details:" -ForegroundColor Cyan
    Write-Host "   Name: $functionName"
    Write-Host "   URL: https://$projectRef.supabase.co/functions/v1/$functionName"
    Write-Host ""
    Write-Host "⚠️  Important: Set these environment variables in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://supabase.com/dashboard/project/$projectRef/functions/$functionName/details"
    Write-Host "   2. Click 'Secrets' tab"
    Write-Host "   3. Add: RESEND_API_KEY = <your_resend_api_key>"
    Write-Host "   4. Verify: TELEGRAM_BOT_TOKEN is already set"
}
catch {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "Press Enter to continue"
