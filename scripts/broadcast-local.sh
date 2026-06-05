#!/usr/bin/env bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load local environment variables
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    exit 1
fi

export $(cat .env.local | xargs)

# Check if a message file was provided
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No message file specified${NC}"
    echo -e "${YELLOW}Usage: $0 <message-file.md>${NC}"
    echo -e "${YELLOW}Example: $0 messages/test.md${NC}"
    exit 1
fi

MESSAGE_FILE="$1"

if [ ! -f "$MESSAGE_FILE" ]; then
    echo -e "${RED}Error: File '$MESSAGE_FILE' not found${NC}"
    exit 1
fi

echo -e "${GREEN}📨 Broadcasting to LOCAL environment${NC}"
echo -e "${YELLOW}Worker URL:${NC} $WORKER_URL"
echo -e "${YELLOW}Message file:${NC} $MESSAGE_FILE"
echo ""

node broadcast/index.mjs "$MESSAGE_FILE"

