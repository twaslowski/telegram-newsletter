import type {
  Env,
  TelegramMessage,
  Subscriber,
  BroadcastResult,
} from "../types";
import { sendMessage, copyMessage } from "../telegram";

function hasMedia(message: TelegramMessage): boolean {
  return !!(
    message.photo ||
    message.video ||
    message.document ||
    message.audio ||
    message.voice ||
    message.animation
  );
}

export async function handleBroadcast(
  message: TelegramMessage,
  broadcastText: string | null,
  env: Env,
): Promise<void> {
  const adminChatId = message.chat.id;
  const isMedia = hasMedia(message);

  // List all subscriber keys
  const list = await env.SUBSCRIBERS.list({ prefix: "subscriber:" });
  const results: BroadcastResult = {
    sent: 0,
    failed: 0,
    total: list.keys.length,
  };

  for (const key of list.keys) {
    const raw = await env.SUBSCRIBERS.get(key.name);
    if (!raw) continue;

    const subscriber = JSON.parse(raw) as Subscriber;

    // Send to admin as well for debugging purposes
    if (subscriber.chatId === adminChatId) {
      results.total--;
      // continue;
    }

    try {
      if (isMedia) {
        // Copy the media message with modified caption
        const success = await copyMessage(
          env.BOT_TOKEN,
          adminChatId,
          subscriber.chatId,
          message.message_id,
          broadcastText ?? undefined,
        );
        if (success) results.sent++;
        else results.failed++;
      } else {
        // Send text message
        await sendMessage(
          env.BOT_TOKEN,
          subscriber.chatId,
          broadcastText!,
          "Markdown",
        );
        results.sent++;
      }
    } catch {
      results.failed++;
    }
  }

  // Send statistics back to admin
  await sendMessage(
    env.BOT_TOKEN,
    adminChatId,
    `📊 *Broadcast Complete*\n\n✅ Sent: ${results.sent}\n❌ Failed: ${results.failed}\n📬 Total subscribers: ${results.total}`,
    "Markdown",
  );
}
