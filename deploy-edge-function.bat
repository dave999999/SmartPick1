@echo off
REM Deploy mark-pickup Edge Function to Supabase
REM Using project: ggzhtpaxnhwcilomswtm

echo Deploying mark-pickup Edge Function...
echo.

REM Set environment variables
set SUPABASE_URL=https://ggzhtpaxnhwcilomswtm.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnemh0cGF4bmh3Y2lsb21zd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODA3MzksImV4cCI6MjA3NjQ1NjczOX0.OVZw-sdqFcAHLupCumm4pVF-2CPmMSWdBUCc7RQHRYA

REM Deploy using Supabase CLI
npx supabase functions deploy mark-pickup --project-ref ggzhtpaxnhwcilomswtm --no-verify-jwt

echo.
echo Done!
pause
