import type { Env, TelegramUpdate } from "./types";
import { sendMessage } from "./telegram";
import { handleStart } from "./handlers/start";
import { handleStop } from "./handlers/stop";
import { handleBroadcast } from "./handlers/broadcast";
import { serveWidget } from "./widget";

export type { Env };

function isAdmin(chatId: number, env: Env): boolean {
  const adminId = parseInt(env.ADMIN_CHAT_ID, 10);
  if (isNaN(adminId)) {
    console.warn(
      `Invalid ADMIN_CHAT_ID: ${env.ADMIN_CHAT_ID}. Admin features not available.`,
    );
    return false;
  }
  return chatId === parseInt(env.ADMIN_CHAT_ID, 10);
}

async function handleUpdate(update: TelegramUpdate, env: Env): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Handle commands
  if (text === "/start") {
    await handleStart(msg, env);
    return;
  }

  if (text === "/stop") {
    await handleStop(msg, env);
    return;
  }

  // Admin broadcast: /broadcast command fans out the rest of the message
  // Works for both text messages and media with captions
  const caption = msg.caption?.trim();
  const content = text || caption;

  if (content?.startsWith("/broadcast") && isAdmin(chatId, env)) {
    const broadcastText = content.slice("/broadcast".length).trim();
    const hasMedia = !!(msg.photo || msg.video || msg.document || msg.audio || msg.voice || msg.animation);

    if (!broadcastText && !hasMedia) {
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        "Usage:\n• Text: /broadcast <message>\n• Media: Send photo/video with caption starting with /broadcast",
      );
      return;
    }
    await handleBroadcast(msg, broadcastText || null, env);
    return;
  }

  // Non-admin, non-command message
  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    "Sorry, I didn't understand that command. Please use /start to subscribe or /stop to unsubscribe.",
  );
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

    if (request.method === "GET" && url.pathname === "/widget") {
      return new Response(serveWidget(), {
        headers: {
          "Content-Type": "text/html;charset=UTF-8",
          "X-Frame-Options": "ALLOWALL",
          "Content-Security-Policy": "frame-ancestors *",
        },
    });
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
