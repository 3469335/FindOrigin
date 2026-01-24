/**
 * Этап 5: поиск источников.
 * Интеграция поискового API, фильтрация по типу, сбор кандидатов.
 */

export interface SearchCandidate {
  url: string;
  title: string;
  snippet: string;
  sourceType: "official" | "news" | "blog" | "research" | "other";
}

const OFFICIAL = /\.(gov|gob|gouv|govt|mil|edu)(\.[a-z]{2})?(\/|$)/i;
const NEWS = /(rbc|ria|tass|interfax|reuters|apnews|bbc|cnn|meduza|novayagazeta|vedomosti|forbes|kommersant|rbc|ntv|ria|aif|kp\.ru|lenta|gazeta|mk\.ru)/i;
const BLOG = /(medium|habr|vc\.ru|dtf|pikabu|livejournal|blog|substack|ghost\.org)/i;
const RESEARCH = /(arxiv|doi\.org|ncbi|nih\.gov|nature\.com|sciencedirect|researchgate|scholar|pubmed|ssrn)/i;

export function classifySource(url: string): SearchCandidate["sourceType"] {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const full = u.origin + u.pathname;

    if (OFFICIAL.test(host) || OFFICIAL.test(full)) return "official";
    if (NEWS.test(host)) return "news";
    if (RESEARCH.test(host) || RESEARCH.test(full)) return "research";
    if (BLOG.test(host)) return "blog";
  } catch {
    /* ignore */
  }
  return "other";
}

const PRIORITY: Record<SearchCandidate["sourceType"], number> = {
  official: 4,
  research: 3,
  news: 2,
  blog: 1,
  other: 0,
};

export function sortCandidatesByType(candidates: SearchCandidate[]): SearchCandidate[] {
  return [...candidates].sort((a, b) => PRIORITY[b.sourceType] - PRIORITY[a.sourceType]);
}

async function serpApiSearch(query: string, apiKey: string): Promise<SearchCandidate[]> {
  const res = await fetch(
    "https://serpapi.com/search.json?" +
      new URLSearchParams({
        q: query,
        api_key: apiKey,
        engine: "google",
      }),
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`SerpAPI ${res.status}`);
  const data = (await res.json()) as {
    organic_results?: { link?: string; title?: string; snippet?: string }[];
  };
  const results = data.organic_results ?? [];
  return results
    .filter((r) => r.link)
    .map((r) => ({
      url: r.link!,
      title: r.title ?? "",
      snippet: r.snippet ?? "",
      sourceType: classifySource(r.link!),
    }));
}

/**
 * Поиск через SerpAPI. При отсутствии API key возвращает пустой массив.
 */
export async function search(
  query: string,
  options?: { apiKey?: string; limit?: number }
): Promise<SearchCandidate[]> {
  const apiKey = options?.apiKey ?? process.env.SEARCH_API_KEY;
  if (!apiKey) return [];

  const rows = await serpApiSearch(query, apiKey);
  const limit = options?.limit ?? 10;
  return sortCandidatesByType(rows).slice(0, limit);
}

/**
 * Сбор кандидатов по нескольким запросам, дедупликация по URL.
 */
export async function collectCandidates(
  queries: string[],
  options?: { apiKey?: string; limitPerQuery?: number; maxTotal?: number }
): Promise<SearchCandidate[]> {
  const limitPer = options?.limitPerQuery ?? 5;
  const maxTotal = options?.maxTotal ?? 15;
  const seen = new Set<string>();
  const out: SearchCandidate[] = [];

  for (const q of queries) {
    if (out.length >= maxTotal) break;
    const rows = await search(q, { apiKey: options?.apiKey, limit: limitPer });
    for (const c of rows) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      out.push(c);
    }
  }

  return sortCandidatesByType(out).slice(0, maxTotal);
}
