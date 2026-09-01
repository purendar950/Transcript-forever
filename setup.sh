#!/bin/bash
# ============================================================
#  Transcript Forever — One-Click Setup
# ============================================================

set -e

echo "🎬 Transcript Forever — Setup"
echo "=============================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi
echo "✅ Node.js $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm --version)"

# Install wrangler if missing
if ! command -v wrangler &> /dev/null; then
    echo ""
    echo "📦 Installing wrangler..."
    npm install -g wrangler
fi
echo "✅ wrangler ready"

# Install dependencies
echo ""
echo "📦 Installing project dependencies..."
npm install

# Login to Cloudflare
echo ""
echo "🔐 Login to Cloudflare (free account, no credit card)..."
wrangler login

# Get bot token
echo ""
echo "📱 Get your Telegram Bot Token:"
echo "   1. Open Telegram → message @BotFather"
echo "   2. Send /newbot → follow steps"
echo "   3. Copy the token"
echo ""
read -p "Paste your BOT_TOKEN: " BOT_TOKEN

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ No token provided"
    exit 1
fi

# Save token to Cloudflare
echo ""
echo "🔐 Saving bot token to Cloudflare..."
echo "$BOT_TOKEN" | wrangler secret put BOT_TOKEN

# Deploy
echo ""
echo "🚀 Deploying to Cloudflare Workers..."
DEPLOY_OUTPUT=$(wrangler deploy 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract worker URL
WORKER_URL=$(echo "$DEPLOY_OUTPUT" | grep -oP 'https://[^\s]+' | head -1)

if [ -z "$WORKER_URL" ]; then
    echo ""
    echo "⚠️ Could not extract worker URL. Check wrangler output above."
    echo "   Your worker is deployed. Set the webhook manually:"
    echo "   curl \"https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook\""
    exit 0
fi

echo ""
echo "✅ Worker deployed at: $WORKER_URL"

# Set Telegram webhook
echo ""
echo "🔗 Setting Telegram webhook..."
WEBHOOK_RESPONSE=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WORKER_URL}/webhook")
echo "$WEBHOOK_RESPONSE"

if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo ""
    echo "🎉 ============================================="
    echo "   TRANSCRIPT FOREVER IS LIVE!"
    echo "============================================="
    echo ""
    echo "📱 Telegram Bot: Open Telegram → find your bot → send a YouTube URL"
    echo ""
    echo "🌐 API Endpoint:"
    echo "   GET  ${WORKER_URL}/api/transcript?url=YOUTUBE_URL&format=plain"
    echo "   POST ${WORKER_URL}/api/transcript  {\"url\": \"YOUTUBE_URL\"}"
    echo ""
    echo "🏥 Health Check: ${WORKER_URL}/api/health"
    echo "📊 Formats: ${WORKER_URL}/api/formats"
    echo ""
    echo "Use in your other project:"
    echo "   fetch('${WORKER_URL}/api/transcript?url=https://youtube.com/watch?v=abc&format=plain')"
    echo ""
else
    echo ""
    echo "⚠️ Webhook setup may have failed. Set it manually:"
    echo "   curl \"https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WORKER_URL}/webhook\""
fi
