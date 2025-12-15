#!/bin/bash

# Deploy send-push-notification Edge Function to Supabase

echo "🚀 Deploying send-push-notification Edge Function..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

# Deploy the function
supabase functions deploy send-push-notification \
  --project-ref $(supabase projects list | grep "SmartPick" | awk '{print $3}') \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Set environment variables in Supabase Dashboard:"
    echo "   - VAPID_PUBLIC_KEY"
    echo "   - VAPID_PRIVATE_KEY"
    echo "   - VAPID_SUBJECT (e.g., mailto:support@smartpick.ge)"
    echo ""
    echo "2. Generate VAPID keys using:"
    echo "   npx web-push generate-vapid-keys"
    echo ""
    echo "3. Update VITE_VAPID_PUBLIC_KEY in your .env file"
else
    echo "❌ Deployment failed"
    exit 1
fi
