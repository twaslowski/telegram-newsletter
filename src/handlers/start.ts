import type { Env, TelegramMessage } from "../types";
import { sendMessage } from "../telegram";

export async function handleStart(
  message: TelegramMessage,
  env: Env,
): Promise<void> {
  const chatId = message.chat.id;
  const key = `subscriber:${chatId}`;
  const existing = await env.SUBSCRIBERS.get(key);

  if (!existing) {
    await env.SUBSCRIBERS.put(
      key,
      JSON.stringify({
        chatId,
        firstName: message.from?.first_name ?? "unknown",
        username: message.from?.username ?? null,
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
}
