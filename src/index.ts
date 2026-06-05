export interface Env {
  SUBSCRIBERS: KVNamespace;
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
}

async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  parseMode: "Markdown" | "HTML" | undefined = undefined,
): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function handleUpdate(update: TelegramUpdate, env: Env): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  if (text === "/start") {
    const key = `subscriber:${chatId}`;
    const existing = await env.SUBSCRIBERS.get(key);

    if (!existing) {
      await env.SUBSCRIBERS.put(
        key,
        JSON.stringify({
          chatId,
          firstName: msg.from?.first_name ?? "unknown",
          username: msg.from?.username ?? null,
          subscribedAt: new Date().toISOString(),
        }),
      );
    }

    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "👋 *Welcome!*\n\nYou've successfully subscribed to our newsletter. You'll receive updates here as soon as they're published.\n\nStay tuned!",
      "Markdown",
    );
    return;
  }

  if (text === "/stop") {
    await env.SUBSCRIBERS.delete(`subscriber:${chatId}`);
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "You've been unsubscribed. You won't receive any further updates.\n\nSend /start at any time to resubscribe.",
    );
    return;
  } else {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "Sorry, I didn't understand that command. Please use /start to subscribe or /stop to unsubscribe.",
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Webhook endpoint — called by Telegram on every update
    if (request.method === "POST" && url.pathname === "/webhook") {
      const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (secret !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      let update: TelegramUpdate;
      try {
        update = (await request.json()) as TelegramUpdate;
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      await handleUpdate(update, env);
      return new Response("OK");
    }

    // Broadcast endpoint — called by the sender script
    if (request.method === "POST" && url.pathname === "/broadcast") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }

      let body: { text: string };
      try {
        body = (await request.json()) as { text: string };
      } catch {
        return new Response("Bad Request", { status: 400 });
      }

      if (!body.text || typeof body.text !== "string") {
        return new Response("Missing `text` field", { status: 422 });
      }

      // List all subscriber keys
      const list = await env.SUBSCRIBERS.list({ prefix: "subscriber:" });
      const results = { sent: 0, failed: 0, total: list.keys.length };

      for (const key of list.keys) {
        const raw = await env.SUBSCRIBERS.get(key.name);
        if (!raw) continue;

        const { chatId } = JSON.parse(raw) as { chatId: number };
        try {
          await sendMessage(env.BOT_TOKEN, chatId, body.text, "Markdown");
          results.sent++;
        } catch {
          results.failed++;
        }
      }

      return Response.json(results);
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
