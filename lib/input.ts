/**
 * Этап 3: ввод и извлечение данных.
 * Текст как есть; ссылки на t.me/... — определение и подготовка к извлечению контента.
 */

const TELEGRAM_LINK = /^https?:\/\/(www\.)?(t\.me|telegram\.me|telegram\.dog)\/[^\s]+/i;

export function isTelegramPostLink(s: string): boolean {
  const t = s.trim();
  return TELEGRAM_LINK.test(t) && !/\/s\//.test(t);
}

export function normalizeText(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();
}

/**
 * Извлечь контент из ввода пользователя.
 * Текст: нормализуем и возвращаем.
 * Ссылка на пост: Telegram Bot API не даёт содержимое чужих постов;
 * используем ссылку как есть (можно позже подключить MTProto/scraper).
 */
export async function extractTextFromInput(raw: string): Promise<string> {
  const normalized = normalizeText(raw);
  if (!normalized) return "";

  if (isTelegramPostLink(normalized)) {
    // TODO: при наличии MTProto/scraper — получать текст поста
    return normalized;
  }

  return normalized;
}
