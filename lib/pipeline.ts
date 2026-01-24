/**
 * Пайплайн: ввод → анализ → поиск. Этапы 3–5.
 * Ответ пользователю через sendMessage.
 */

import { sendMessage } from "@/lib/telegram";
import { extractTextFromInput } from "@/lib/input";
import { extractEntities, buildSearchQueries } from "@/lib/analyze";
import { collectCandidates, type SearchCandidate } from "@/lib/search";

export async function processUpdate(chatId: number, rawInput: string): Promise<void> {
  try {
    const text = await extractTextFromInput(rawInput);
    if (!text) {
      await sendMessage(chatId, "Отправьте текст или ссылку на пост Telegram.");
      return;
    }

    const entities = extractEntities(text);
    const queries = buildSearchQueries(entities, text);

    if (!queries.length) {
      await sendMessage(chatId, "Не удалось выделить поисковые запросы. Попробуйте более развёрнутый текст.");
      return;
    }

    const candidates = await collectCandidates(queries, {
      limitPerQuery: 5,
      maxTotal: 15,
    });

    const reply = formatCandidatesReply(text, candidates);
    await sendMessage(chatId, reply);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка обработки.";
    await sendMessage(chatId, `Ошибка: ${escapeHtml(msg)}`).catch(() => {});
  }
}

function formatCandidatesReply(inputPreview: string, candidates: SearchCandidate[]): string {
  const pre = inputPreview.slice(0, 100) + (inputPreview.length > 100 ? "…" : "");
  let body: string;
  if (candidates.length === 0) {
    body =
      "Кандидатов не найдено. Проверьте SEARCH_API_KEY (например, SerpAPI) в настройках.";
  } else {
    const list = candidates
      .slice(0, 10)
      .map(
        (c) =>
          `• <a href="${c.url.replace(/&/g, "&amp;")}">${escapeHtml(c.title || c.url)}</a> [${c.sourceType}]`
      )
      .join("\n");
    body = `Найдено кандидатов: ${candidates.length}\n\n${list}`;
  }
  return `<b>Запрос:</b> ${escapeHtml(pre)}\n\n${body}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
