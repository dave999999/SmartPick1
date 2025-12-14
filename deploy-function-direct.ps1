param (
    [string]$functionName = "send-announcement"
)

# ⚠️ CREDENTIALS REMOVED FOR SECURITY - The exposed service role key must be rotated!
# Set these from environment variables: SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY
$projectRef = $env:SUPABASE_PROJECT_REF
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "🚀 Deploying $functionName function to Supabase..." -ForegroundColor Cyan

# --- Input Validation ---
if ([string]::IsNullOrEmpty($projectRef) -or [string]::IsNullOrEmpty($serviceRoleKey)) {
    Write-Host "❌ Error: SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY environment variables must be set." -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    return
}

Write-Host ""

# Read the function code
$functionCode = Get-Content "supabase\functions\$functionName\index.ts" -Raw

# Create the deployment payload
$payload = @{
    name = $functionName
    verify_jwt = $true
    body = $functionCode
} | ConvertTo-Json

# Deploy using Management API
$headers = @{
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

$url = "https://$projectRef.supabase.co/functions/v1/$functionName"

try {
    Write-Host "📤 Uploading function..." -ForegroundColor Yellow
    
    # First, let's try using the Supabase Management API
    $managementUrl = "https://api.supabase.com/v1/projects/$projectRef/functions/$functionName"
    
    $response = Invoke-RestMethod -Uri $managementUrl -Method Put -Headers $headers -Body $payload -ErrorAction Stop
    
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Function URL: https://$projectRef.supabase.co/functions/v1/$functionName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  Don't forget to set environment variables in Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   - RESEND_API_KEY (required for emails)" -ForegroundColor White
    Write-Host "   - TELEGRAM_BOT_TOKEN (should already exist)" -ForegroundColor White
}
catch {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Trying alternative method using Supabase CLI..." -ForegroundColor Yellow
    
    # Check if Supabase CLI is installed
    $supabaseCliExists = Get-Command supabase -ErrorAction SilentlyContinue
    if ($null -eq $supabaseCliExists) {
        Write-Host "❌ Supabase CLI not found. Please install it to use the fallback deployment method." -ForegroundColor Red
    } else {
        # Try CLI deployment
        & supabase functions deploy $functionName --project-ref $projectRef
    }
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
