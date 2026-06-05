#!/usr/bin/env bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting local development environment...${NC}"

# Load environment variables from .env.local
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    exit 1
fi

source .env.local

# Create a temporary file for wrangler output
WRANGLER_LOG=$(mktemp)
trap "rm -f $WRANGLER_LOG" EXIT

# Start wrangler in the background
echo -e "${YELLOW}📦 Starting Cloudflare Workers...${NC}"
npx wrangler dev --tunnel > "$WRANGLER_LOG" 2>&1 &
WRANGLER_PID=$!

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping Cloudflare Workers...${NC}"
    kill $WRANGLER_PID 2>/dev/null || true
    wait $WRANGLER_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for the tunnel URL to appear in the logs
echo -e "${YELLOW}⏳ Waiting for tunnel URL...${NC}"
TUNNEL_URL=""
ATTEMPTS=0
MAX_ATTEMPTS=60  # 60 seconds timeout

while [ -z "$TUNNEL_URL" ] && [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    # Look for the tunnel URL in the wrangler output
    # The URL format is typically: https://xxxx.trycloudflare.com
    TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$WRANGLER_LOG" | head -1 || true)

    if [ -z "$TUNNEL_URL" ]; then
        sleep 1
        ATTEMPTS=$((ATTEMPTS + 1))
    fi
done

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}❌ Failed to obtain tunnel URL after ${MAX_ATTEMPTS} seconds${NC}"
    echo -e "${YELLOW}Wrangler output:${NC}"
    cat "$WRANGLER_LOG"
    exit 1
fi

echo -e "${GREEN}✅ Tunnel URL obtained: $TUNNEL_URL${NC}"

# Update .env.local with the new tunnel URL
echo -e "${YELLOW}📝 Updating .env.local with new tunnel URL...${NC}"
sed -i.bak "s|^WORKER_URL=.*|WORKER_URL=$TUNNEL_URL|" .env.local
rm -f .env.local.bak

# Re-source the updated environment
source .env.local

# Register the webhook with Telegram
echo -e "${YELLOW}🔗 Registering webhook with Telegram...${NC}"
WEBHOOK_RESPONSE=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/setWebhook?url=$TUNNEL_URL/webhook&secret_token=$WEBHOOK_SECRET")

if echo "$WEBHOOK_RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ Webhook registered successfully!${NC}"
    echo -e "${GREEN}📍 Webhook URL: $TUNNEL_URL/webhook${NC}"
else
    echo -e "${RED}❌ Failed to register webhook${NC}"
    echo -e "${YELLOW}Response: $WEBHOOK_RESPONSE${NC}"
fi

# Display the wrangler output
echo -e "\n${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Local development environment is ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Worker URL:${NC} $TUNNEL_URL"
echo -e "${YELLOW}Webhook URL:${NC} $TUNNEL_URL/webhook"
echo -e "${YELLOW}Broadcast endpoint:${NC} $TUNNEL_URL/broadcast"
echo -e "\n${YELLOW}To send a test broadcast, run:${NC}"
echo -e "  task broadcast:local -- messages/test.md"
echo -e "\n${YELLOW}Press Ctrl+C to stop the development server${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}\n"

# Tail the wrangler logs
tail -f "$WRANGLER_LOG"

