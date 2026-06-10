export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  parseMode: "Markdown" | "HTML" | undefined = undefined,
): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (parseMode) body.parse_mode = parseMode;

  const result = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!result.ok) {
    const errorText = await result.text();
    console.error(`Failed to send message to ${chatId}: ${errorText}`);
    throw new Error(`Telegram API error: ${errorText}`);
  }
}

export async function copyMessage(
  token: string,
  fromChatId: number,
  toChatId: number,
  messageId: number,
  caption?: string,
): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: toChatId,
    from_chat_id: fromChatId,
    message_id: messageId,
  };
  if (caption !== undefined) {
    body.caption = caption;
    body.parse_mode = "Markdown";
  }

  const result = await fetch(
    `https://api.telegram.org/bot${token}/copyMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!result.ok) {
    const errorText = await result.text();
    console.error(`Failed to copy message to ${toChatId}: ${errorText}`);
    return false;
  }

  return true;
}
