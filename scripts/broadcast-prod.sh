#!/usr/bin/env bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load production environment variables
if [ ! -f .env.prod ]; then
    echo -e "${RED}Error: .env.prod file not found${NC}"
    exit 1
fi

export $(cat .env.prod | xargs)

# Check if a message file was provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No message file specified${NC}"
    echo -e "${YELLOW}Usage: $0 <message-file.md>${NC}"
    echo -e "${YELLOW}Example: $0 messages/newsletter.md${NC}"
    exit 1
fi

MESSAGE_FILE="$1"

if [ ! -f "$MESSAGE_FILE" ]; then
    echo -e "${RED}Error: File '$MESSAGE_FILE' not found${NC}"
    exit 1
fi

echo -e "${RED}⚠️  WARNING: Broadcasting to PRODUCTION environment!${NC}"
echo -e "${YELLOW}Worker URL:${NC} $WORKER_URL"
echo -e "${YELLOW}Message file:${NC} $MESSAGE_FILE"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Broadcast cancelled${NC}"
    exit 0
fi

echo -e "${GREEN}📨 Broadcasting to production...${NC}"
node broadcast/index.mjs "$MESSAGE_FILE"

