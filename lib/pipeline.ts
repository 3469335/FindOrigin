/**
 * Пайплайн: ввод → анализ → поиск → AI-ранжирование. Этапы 3–7.
 * Ответ пользователю через sendMessage (Telegram) или JSON (веб).
 */

import { sendMessage } from "@/lib/telegram";
import { extractTextFromInput } from "@/lib/input";
import { extractEntities, buildSearchQueries, type ExtractedEntities } from "@/lib/analyze";
import { collectCandidates, type SearchCandidate } from "@/lib/search";
import { rankSources, type RankedSource } from "@/lib/ai";

export interface SearchResult {
  text: string;
  queries: string[];
  entities: ExtractedEntities;
  candidates: SearchCandidate[];
  ranked: RankedSource[];
  usedAi: boolean;
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

  const { ranked, usedAi } = await rankSources(text, candidates);

  return { text, queries, entities, candidates, ranked, usedAi };
}

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export async function processUpdate(chatId: number, rawInput: string): Promise<void> {
  try {
    const result = await runSearch(rawInput);
    const { text, entities, candidates, ranked, usedAi } = result;
    const messages = formatFinalReply(text, entities, candidates, ranked, usedAi);
    for (const msg of messages) {
      await sendMessage(chatId, msg);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка обработки.";
    console.error("[FindOrigin processUpdate]", e);
    await sendMessage(chatId, `Ошибка: ${escapeHtml(msg)}`).catch((err) => {
      console.error("[FindOrigin sendMessage]", err);
    });
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

function formatConfidence(level: string): string {
  const map: Record<string, string> = {
    high: "Высокая",
    medium: "Средняя",
    low: "Низкая",
  };
  return map[level] ?? level;
}

function formatFinalReply(
  inputPreview: string,
  entities: ExtractedEntities,
  candidates: SearchCandidate[],
  ranked: RankedSource[],
  usedAi: boolean
): string[] {
  const pre = inputPreview.slice(0, 100) + (inputPreview.length > 100 ? "…" : "");
  const entitiesBlock = formatEntitiesBlock(entities);

  let body = `<b>Запрос:</b> ${escapeHtml(pre)}\n\n`;
  body += `<b>Извлечённые элементы:</b>\n${entitiesBlock}\n\n`;

  if (candidates.length === 0) {
    body +=
      "<b>Источники:</b>\nКандидатов не найдено. Попробуйте другой запрос или добавьте SEARCH_API_KEY (SerpAPI).";
  } else {
    body += `<b>Найдено кандидатов:</b> ${candidates.length}\n\n`;
    body += "<b>Рекомендованные источники</b>";
    if (usedAi) body += " (AI-анализ)";
    body += ":\n\n";

    if (ranked.length === 0) {
      body += "AI не выбрал источники. Топ по типу:\n";
      const fallback = candidates.slice(0, 3);
      for (const c of fallback) {
        body += `• <a href="${c.url.replace(/&/g, "&amp;")}">${escapeHtml(c.title || c.url)}</a> [${c.sourceType}] — Средняя\n`;
      }
    } else {
      for (const r of ranked) {
        body += `• <a href="${r.url.replace(/&/g, "&amp;")}">${escapeHtml(r.title)}</a>\n`;
        body += `  Уверенность: ${formatConfidence(r.confidence)}`;
        if (r.reason) body += ` — ${escapeHtml(r.reason)}`;
        body += "\n";
      }
    }
  }

  const chunks: string[] = [];
  if (body.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
    chunks.push(body);
  } else {
    const parts = body.split("\n\n");
    let current = "";
    for (const p of parts) {
      if (current.length + p.length + 2 > TELEGRAM_MAX_MESSAGE_LENGTH && current) {
        chunks.push(current.trim());
        current = "";
      }
      current += (current ? "\n\n" : "") + p;
    }
    if (current) chunks.push(current.trim());
  }
  return chunks;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
