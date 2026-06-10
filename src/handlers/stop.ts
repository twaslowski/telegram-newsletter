import type { Env, TelegramMessage } from "../types";
import { sendMessage } from "../telegram";

export async function handleStop(
  message: TelegramMessage,
  env: Env,
): Promise<void> {
  const chatId = message.chat.id;

  await env.SUBSCRIBERS.delete(`subscriber:${chatId}`);
  await sendMessage(
    env.BOT_TOKEN,
    chatId,
    "You've been unsubscribed. You won't receive any further updates.\n\nSend /start at any time to resubscribe.",
  );
}
