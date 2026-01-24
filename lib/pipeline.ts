/**
 * Пайплайн: ввод → анализ → поиск. Этапы 3–5.
 * Ответ пользователю через sendMessage (Telegram) или JSON (веб).
 */

import { sendMessage } from "@/lib/telegram";
import { extractTextFromInput } from "@/lib/input";
import { extractEntities, buildSearchQueries, type ExtractedEntities } from "@/lib/analyze";
import { collectCandidates, type SearchCandidate } from "@/lib/search";

export interface SearchResult {
  text: string;
  queries: string[];
  entities: ExtractedEntities;
  candidates: SearchCandidate[];
}

/**
 * Выполнить поиск по введённому тексту. Используется и в Telegram, и в веб-API.
 */
export async function runSearch(rawInput: string): Promise<SearchResult> {
  const text = await extractTextFromInput(rawInput);
  if (!text) {
    throw new Error("Отправьте текст или ссылку на пост Telegram.");
  }

  const entities = extractEntities(text);
  const queries = buildSearchQueries(entities, text);

  if (!queries.length) {
    throw new Error("Не удалось выделить поисковые запросы. Попробуйте более развёрнутый текст.");
  }

  const candidates = await collectCandidates(queries, {
    limitPerQuery: 5,
    maxTotal: 15,
  });

  return { text, queries, entities, candidates };
}

export async function processUpdate(chatId: number, rawInput: string): Promise<void> {
  try {
    const { text, entities, candidates } = await runSearch(rawInput);
    const reply = formatCandidatesReply(text, entities, candidates);
    await sendMessage(chatId, reply);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка обработки.";
    await sendMessage(chatId, `Ошибка: ${escapeHtml(msg)}`).catch(() => {});
  }
}

function formatEntitiesBlock(entities: ExtractedEntities): string {
  const parts: string[] = [];
  if (entities.claims.length)
    parts.push(`• Утверждения: ${entities.claims.slice(0, 3).map(escapeHtml).join("; ")}`);
  if (entities.dates.length)
    parts.push(`• Даты: ${entities.dates.slice(0, 5).map(escapeHtml).join(", ")}`);
  if (entities.numbers.length)
    parts.push(`• Числа: ${entities.numbers.slice(0, 5).map(escapeHtml).join(", ")}`);
  if (entities.names.length)
    parts.push(`• Имена: ${entities.names.slice(0, 5).map(escapeHtml).join(", ")}`);
  if (entities.links.length)
    parts.push(`• Ссылки: ${entities.links.slice(0, 3).map(escapeHtml).join(", ")}`);
  if (!parts.length) return "• (не выделено)";
  return parts.join("\n");
}

function formatCandidatesReply(
  inputPreview: string,
  entities: ExtractedEntities,
  candidates: SearchCandidate[]
): string {
  const pre = inputPreview.slice(0, 100) + (inputPreview.length > 100 ? "…" : "");
  const entitiesBlock = formatEntitiesBlock(entities);
  let sourcesBlock: string;
  if (candidates.length === 0) {
    sourcesBlock =
      "Кандидатов не найдено. Попробуйте другой запрос или добавьте SEARCH_API_KEY (SerpAPI) для поиска через Google.";
  } else {
    const list = candidates
      .slice(0, 10)
      .map(
        (c) =>
          `• <a href="${c.url.replace(/&/g, "&amp;")}">${escapeHtml(c.title || c.url)}</a> [${c.sourceType}]`
      )
      .join("\n");
    sourcesBlock = `Найдено: ${candidates.length}\n\n${list}`;
  }
  const aiNote = "AI-анализ будет выполнен на следующем этапе.";
  return (
    `<b>Запрос:</b> ${escapeHtml(pre)}\n\n` +
    `<b>Извлечённые элементы:</b>\n${entitiesBlock}\n\n` +
    `<b>Источники и тип:</b>\n${sourcesBlock}\n\n` +
    aiNote
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
