const TELEGRAM_API = "https://api.telegram.org";

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
    caption?: string;
    entities?: { type: string; offset: number; length: number }[];
  };
};

function getBotToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

export async function sendMessage(
  chatId: number,
  text: string,
  options?: { parse_mode?: "HTML" | "Markdown"; disable_web_page_preview?: boolean }
): Promise<unknown> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parse_mode ?? "HTML",
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(data.description ?? "Telegram API error");
  return data;
}

export function parseMessage(update: TelegramUpdate): { chatId: number; text: string } | null {
  const msg = update.message;
  if (!msg?.chat) return null;
  const text = msg.text ?? msg.caption ?? "";
  if (!text.trim()) return null;
  return { chatId: msg.chat.id, text: text.trim() };
}
