# Newsletter Bot

A minimal Telegram newsletter bot running on Cloudflare Workers, with a KV-backed subscriber list and a CLI sender
script.

---

## Project structure

```
newsletter-bot/
├── src/
│   └── index.ts          # Cloudflare Worker — webhook + broadcast handler
├── broadcast/
│   └── index.mjs         # CLI tool to broadcast an update
├── package.json
├── Taskfile.yaml         # Various lifecycle tasks; task --list for help
├── tsconfig.json
├── widget.html           # Embeddable "Subscribe on Telegram" button
└── wrangler.jsonc        # Wrangler / Workers configuration
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier is fine)
- A Telegram bot token — create one with [@BotFather](https://t.me/BotFather)
- A random secret string for `WEBHOOK_SECRET` (e.g. `openssl rand -hex 32`)

---

## First-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

### 3. Create the KV namespace

```bash
# Production namespace
npx wrangler kv namespace create SUBSCRIBERS
# Preview namespace (used by `wrangler dev`)
npx wrangler kv namespace create SUBSCRIBERS --preview
```

Copy the printed `id` values into `wrangler.jsonc`:

```jsonc
"kv_namespaces": [
  {
    "binding": "SUBSCRIBERS",
    "id": "<paste production id here>",
    "preview_id": "<paste preview id here>"
  }
]
```

### 4. Store secrets

```bash
npx wrangler secret put BOT_TOKEN
# paste your Telegram bot token when prompted

npx wrangler secret put WEBHOOK_SECRET
# paste your random secret string when prompted
```

### 5. Deploy

```bash
npm run deploy
```

Note the Worker URL printed at the end — it looks like
`https://newsletter-bot.<your-subdomain>.workers.dev`.

### 6. Register the webhook with Telegram

Replace `<WORKER_URL>` and `<WEBHOOK_SECRET>` below, then open the URL in your browser (or run it with curl):

```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=<WORKER_URL>/webhook&secret_token=<WEBHOOK_SECRET>
```

You should get `{"ok":true,"result":true}`.

---

## Local development

### Setup

1. Create a development bot with [@BotFather](https://t.me/BotFather) (separate from production)
2. Create a `.env.local` file with your development bot credentials:

```bash
BOT_TOKEN="<your-dev-bot-token>"
WEBHOOK_SECRET="<same-secret-as-production>"
WORKER_URL=""  # This will be auto-updated by the dev script
```

### Start development server

The easiest way to start local development is with the automated script:

```bash
task dev
# or directly: ./dev-local.sh
```

This script will:

1. Start `wrangler dev --tunnel` in the background
2. Wait for and capture the tunnel URL
3. Update `.env.local` with the new tunnel URL
4. Automatically register the webhook with your development bot
5. Display the ready-to-use URLs

Press `Ctrl+C` to stop the development server.

### Manual setup (alternative)

If you prefer manual control:

```bash
# 1. Start wrangler with tunnel
npx wrangler dev --tunnel

# 2. Copy the tunnel URL (e.g., https://xxxx.trycloudflare.com)
# 3. Update .env.local with the WORKER_URL
# 4. Register the webhook
task register:local
```

---

## Sending an update

### Development (local)

```bash
task broadcast:local -- messages/test.md
# or directly: ./broadcast-local.sh messages/test.md
```

### Production

```bash
task broadcast:prod -- messages/newsletter.md
# or directly: ./broadcast-prod.sh messages/newsletter.md
```

The production script requires confirmation before sending.

The broadcast script will:

- Load the appropriate environment variables (`.env.local` or `.env.prod`)
- Send the message to all subscribers via the `/broadcast` endpoint
- Display a summary: `✅ Done — 42/42 sent, 0 failed.`

### Alternative: Direct usage

You can also use the broadcast script directly with environment variables:

```bash
export WORKER_URL="https://newsletter-bot.<your-subdomain>.workers.dev"
export WEBHOOK_SECRET="<your secret>"
node broadcast/index.mjs path/to/update.md
```

Or pipe content:

```bash
echo "**Hello subscribers!** New post is live." | node broadcast/index.mjs
cat update.md | node broadcast/index.mjs
```

---

## Embeddable widget

Edit `widget.html` and replace `@YourBotUsername` with your bot's actual handle,
then paste the snippet wherever you want the subscribe button to appear.

---

## Bot commands

| Command  | Behaviour                                                    |
|----------|--------------------------------------------------------------|
| `/start` | Subscribes the user (idempotent) and shows a welcome message |
| `/stop`  | Removes the user from the subscriber list                    |

---

## Security notes

- The `/webhook` endpoint validates the `X-Telegram-Bot-Api-Secret-Token` header.
- The `/broadcast` endpoint requires an `Authorization: Bearer <WEBHOOK_SECRET>` header.
- Both secrets are stored as Cloudflare Worker secrets (encrypted at rest), never in source code or `wrangler.jsonc`.
