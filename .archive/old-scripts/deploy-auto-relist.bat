@echo off
echo ========================================
echo Deploying Auto-Relist Edge Function
echo ========================================
echo.

echo Checking Supabase CLI...
supabase --version
if errorlevel 1 (
    echo ERROR: Supabase CLI not found!
    echo Please install it: npm install -g supabase
    pause
    exit /b 1
)

echo.
echo Deploying auto-relist-offers function...
supabase functions deploy auto-relist-offers

if errorlevel 1 (
    echo.
    echo ERROR: Deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Successful!
echo ========================================
echo.
echo Next steps:
echo 1. Set up cron job in Supabase Dashboard
echo 2. Test the function manually
echo 3. Enable auto-relist on offers in Admin Panel
echo.
echo See AUTO_RELIST_SETUP_GUIDE.md for details
echo.
pause
