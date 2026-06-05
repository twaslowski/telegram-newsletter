# Newsletter Bot

A minimal Telegram newsletter bot running on Cloudflare Workers, with a KV-backed subscriber list and a CLI sender
script.

---

## Project structure

```
newsletter-bot/
├── src/
│   └── index.ts          # Cloudflare Worker — webhook + broadcast handler
├── sender/
│   └── send-update.mjs   # CLI tool to broadcast an update
├── widget.html           # Embeddable "Subscribe on Telegram" button
├── wrangler.jsonc         # Wrangler / Workers configuration
├── package.json
└── tsconfig.json
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

```bash
npm run dev
```

Wrangler starts a local server at `http://localhost:8787`.
To test the webhook locally you'll need a public tunnel (
e.g. [cloudflared tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)):

```bash
cloudflared tunnel --url http://localhost:8787
```

Point Telegram's webhook at the tunnel URL (step 6 above, using the tunnel URL instead).

---

## Sending an update

Set two environment variables in your shell:

```bash
export WORKER_URL="https://newsletter-bot.<your-subdomain>.workers.dev"
export WEBHOOK_SECRET="<your secret>"
```

Then broadcast a Markdown file:

```bash
node sender/send-update.mjs path/to/update.md
```

Or pipe content directly:

```bash
echo "**Hello subscribers!** New post is live." | node sender/send-update.mjs
cat update.md | node sender/send-update.mjs
```

The script prints a summary: `✅ Done — 42/42 sent, 0 failed.`

---

## Embeddable widget

Edit `widget.html` and replace `@YourBotUsername` with your bot's actual handle,
then paste the snippet wherever you want the subscribe button to appear.

---

## Bot commands

| Command  | Behaviour                                                    |
| -------- | ------------------------------------------------------------ |
| `/start` | Subscribes the user (idempotent) and shows a welcome message |
| `/stop`  | Removes the user from the subscriber list                    |

---

## Security notes

- The `/webhook` endpoint validates the `X-Telegram-Bot-Api-Secret-Token` header.
- The `/broadcast` endpoint requires an `Authorization: Bearer <WEBHOOK_SECRET>` header.
- Both secrets are stored as Cloudflare Worker secrets (encrypted at rest), never in source code or `wrangler.jsonc`.
