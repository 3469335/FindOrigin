/**
 * Этап 6: AI-сравнение и ранжирование источников.
 * OpenAI: сравнение смысла исходного текста с кандидатами, выбор 1–3 лучших.
 */

import OpenAI from "openai";
import type { SearchCandidate } from "@/lib/search";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface RankedSource {
  url: string;
  title: string;
  confidence: ConfidenceLevel;
  reason?: string;
}

const CONFIDENCE_ORDER: Record<ConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function buildPrompt(
  originalText: string,
  candidates: SearchCandidate[]
): string {
  const candidatesStr = candidates
    .slice(0, 12)
    .map(
      (c, i) =>
        `${i + 1}. [${c.sourceType}] ${c.title}\n   URL: ${c.url}\n   ${c.snippet ? `Сниппет: ${c.snippet.slice(0, 150)}` : ""}`
    )
    .join("\n\n");

  return `Ты — эксперт по проверке источников. Сравни исходный текст с кандидатами по СМЫСЛУ (не по буквальному совпадению). Выбери 1–3 лучших источника, которые наиболее вероятно содержат или подтверждают информацию из исходного текста.

Исходный текст:
"""
${originalText.slice(0, 1500)}
"""

Кандидаты:
${candidatesStr}

Ответь ТОЛЬКО валидным JSON в формате:
{"sources":[{"url":"...","title":"...","confidence":"high|medium|low","reason":"кратко почему"}]}
- url и title должны точно совпадать с одним из кандидатов
- confidence: high (явно подтверждает), medium (частично/косвенно), low (слабая связь)
- Выбери 1–3 источника. Если ни один не подходит — пустой массив.`;
}

function parseAiResponse(body: string): RankedSource[] {
  const trimmed = body.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      sources?: Array<{
        url?: string;
        title?: string;
        confidence?: string;
        reason?: string;
      }>;
    };
    const sources = parsed?.sources;
    if (!Array.isArray(sources)) return [];

    return sources
      .filter((s) => s?.url && s?.title)
      .map((s) => ({
        url: String(s.url).trim(),
        title: String(s.title).trim(),
        confidence: ["high", "medium", "low"].includes(String(s.confidence).toLowerCase())
          ? (String(s.confidence).toLowerCase() as ConfidenceLevel)
          : "medium",
        reason: s.reason ? String(s.reason).slice(0, 100) : undefined,
      }))
      .slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Ранжирование кандидатов с помощью AI.
 * При отсутствии OPENAI_API_KEY возвращает топ-3 по приоритету типа источника.
 */
export async function rankSources(
  originalText: string,
  candidates: SearchCandidate[]
): Promise<{ ranked: RankedSource[]; usedAi: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!candidates.length) {
    return { ranked: [], usedAi: false };
  }

  if (!apiKey) {
    const byPriority = [...candidates]
      .sort((a, b) => {
        const pa = { official: 4, research: 3, news: 2, blog: 1, other: 0 }[a.sourceType];
        const pb = { official: 4, research: 3, news: 2, blog: 1, other: 0 }[b.sourceType];
        return (pb ?? 0) - (pa ?? 0);
      })
      .slice(0, 3);
    return {
      ranked: byPriority.map((c) => ({
        url: c.url,
        title: c.title,
        confidence: "medium" as ConfidenceLevel,
      })),
      usedAi: false,
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = buildPrompt(originalText, candidates);
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) return fallbackRank(candidates);

    const ranked = parseAiResponse(content);
    if (ranked.length === 0) return fallbackRank(candidates);

    const urlSet = new Set(candidates.map((c) => c.url));
    const valid = ranked.filter((r) => urlSet.has(r.url));
    if (valid.length === 0) return fallbackRank(candidates);

    return {
      ranked: valid.sort(
        (a, b) => CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence]
      ),
      usedAi: true,
    };
  } catch (e) {
    console.error("[AI rankSources]", e);
    return fallbackRank(candidates);
  }
}

function fallbackRank(candidates: SearchCandidate[]): {
  ranked: RankedSource[];
  usedAi: boolean;
} {
  const byPriority = [...candidates]
    .sort((a, b) => {
      const pa = { official: 4, research: 3, news: 2, blog: 1, other: 0 }[a.sourceType];
      const pb = { official: 4, research: 3, news: 2, blog: 1, other: 0 }[b.sourceType];
      return (pb ?? 0) - (pa ?? 0);
    })
    .slice(0, 3);
  return {
    ranked: byPriority.map((c) => ({
      url: c.url,
      title: c.title,
      confidence: "medium" as ConfidenceLevel,
    })),
    usedAi: false,
  };
}
