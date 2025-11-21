@echo off
echo 🚀 Deploying send-announcement Edge Function to Supabase...
echo.

REM Deploy the edge function
supabase functions deploy send-announcement --project-ref ggzhipaxnhwcilomswtn

if %errorlevel% equ 0 (
    echo.
    echo ✅ Edge function deployed successfully!
    echo.
    echo 📋 Next steps:
    echo 1. Make sure RESEND_API_KEY is set in Supabase dashboard
    echo 2. Run RECREATE_ANNOUNCEMENTS_TABLE.sql in SQL Editor
    echo 3. Test sending an announcement from Admin Dashboard
) else (
    echo.
    echo ❌ Deployment failed. Please check the error above.
    pause
)

pause
