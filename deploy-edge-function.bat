@echo off
REM Deploy mark-pickup Edge Function to Supabase
REM Using project: ***REMOVED_PROJECT_ID***

echo Deploying mark-pickup Edge Function...
echo.

REM Set environment variables
set SUPABASE_URL=https://***REMOVED_PROJECT_ID***.supabase.co
set SUPABASE_ANON_KEY=***REMOVED_ANON_KEY_2***

REM Deploy using Supabase CLI
npx supabase functions deploy mark-pickup --project-ref ***REMOVED_PROJECT_ID*** --no-verify-jwt

echo.
echo Done!
pause
