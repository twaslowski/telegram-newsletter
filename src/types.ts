export interface Env {
  SUBSCRIBERS: KVNamespace;
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
  ADMIN_CHAT_ID: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  text?: string;
  caption?: string;
  photo?: unknown[];
  video?: unknown;
  document?: unknown;
  audio?: unknown;
  voice?: unknown;
  animation?: unknown;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface Subscriber {
  chatId: number;
  firstName: string;
  username: string | null;
  subscribedAt: string;
}

export interface BroadcastResult {
  sent: number;
  failed: number;
  total: number;
}
