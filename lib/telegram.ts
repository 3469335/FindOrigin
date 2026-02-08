const TELEGRAM_API = "https://api.telegram.org";

export type MessageEntity = {
  type: string;
  offset: number;
  length: number;
  url?: string;
};

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
    caption?: string;
    entities?: MessageEntity[];
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

/**
 * Извлечь URL из entities. Для text_link — entity.url; для url — подстрока текста.
 */
function extractUrlsFromEntities(
  text: string,
  entities?: MessageEntity[]
): string[] {
  if (!entities?.length) return [];
  const urls: string[] = [];
  for (const e of entities) {
    if (e.type === "text_link" && e.url) {
      urls.push(e.url.trim());
    } else if (e.type === "url") {
      const u = text.slice(e.offset, e.offset + e.length).trim();
      if (u.startsWith("http")) urls.push(u);
    }
  }
  return urls;
}

export function parseMessage(update: TelegramUpdate): { chatId: number; text: string } | null {
  const msg = update.message;
  if (!msg?.chat) return null;
  let text = msg.text ?? msg.caption ?? "";
  if (!text.trim()) return null;

  const entityUrls = extractUrlsFromEntities(text, msg.entities);
  if (entityUrls.length) {
    text = text.trim() + "\n" + entityUrls.join(" ");
  } else {
    text = text.trim();
  }

  return { chatId: msg.chat.id, text };
}
