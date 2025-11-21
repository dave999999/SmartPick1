@echo off
REM Deploy mark-pickup Edge Function to Supabase
REM Using project: ***REMOVED_PROJECT_ID***

echo Deploying mark-pickup Edge Function...
echo.

REM Set environment variables
REM ⚠️ CREDENTIALS REMOVED FOR SECURITY - Set these in your local environment
REM set SUPABASE_URL=your_supabase_url
REM set SUPABASE_ANON_KEY=your_supabase_anon_key

REM Deploy using Supabase CLI
npx supabase functions deploy mark-pickup --project-ref ***REMOVED_PROJECT_ID*** --no-verify-jwt

echo.
echo Done!
pause
