/**
 * Этап 5: поиск источников.
 * Интеграция поискового API (SerpAPI), fallback на DuckDuckGo (html.duckduckgo.com).
 * Фильтрация по типу, сбор кандидатов.
 */

/** Заголовки под Chrome. */
const DDG_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "Upgrade-Insecure-Requests": "1",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp;q=0.8,*/*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Несколько паттернов — DuckDuckGo может менять формат. */
const VQD_PATTERNS = [
  /vqd=['"](\d+-\d+(?:-\d+)?)['"]/,
  /vqd["']?\s*[:=]\s*["']?(\d+-\d+(?:-\d+)?)/,
  /"vqd"\s*:\s*"(\d+-\d+(?:-\d+)?)"/,
  /vqd\s*=\s*["'](\d+-\d+(?:-\d+)?)["']/,
  /name=["']vqd["']\s+value=["'](\d+-\d+(?:-\d+)?)["']/,
  /value=["'](\d+-\d+(?:-\d+)?)["']\s+name=["']vqd["']/,
];
const HTML_DDG_URL = "https://html.duckduckgo.com/html/";

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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Минимальный интервал между запросами к DuckDuckGo (чтобы избежать блокировки). */
const DDG_COOLDOWN_MS = 15_000;
let lastDdgCall = 0;

function ddgCooldownCheck(): void {
  const now = Date.now();
  const elapsed = now - lastDdgCall;
  if (lastDdgCall > 0 && elapsed < DDG_COOLDOWN_MS) {
    const waitSec = Math.ceil((DDG_COOLDOWN_MS - elapsed) / 1000);
    throw new Error(
      `Слишком частые запросы к DuckDuckGo. Подождите ${waitSec} сек. или добавьте SEARCH_API_KEY (SerpAPI) для поиска через Google.`
    );
  }
}

function extractVqd(html: string): string | null {
  for (const re of VQD_PATTERNS) {
    const m = re.exec(html);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function getVqd(query: string): Promise<string> {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
  const res = await fetch(url, {
    headers: DDG_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`VQD request ${res.status}`);
  const html = await res.text();

  if (/challenge-form|not a robot|captcha/i.test(html)) {
    throw new Error(
      "DuckDuckGo показал CAPTCHA. Подождите или добавьте SEARCH_API_KEY (SerpAPI) для поиска через Google."
    );
  }
  if (/your IP address|your user agent/i.test(html)) {
    throw new Error(
      "DuckDuckGo заблокировал запрос. Подождите или используйте SEARCH_API_KEY (SerpAPI)."
    );
  }

  const vqd = extractVqd(html);
  if (!vqd) {
    throw new Error(
      "Не удалось извлечь VQD. DuckDuckGo мог изменить страницу. Добавьте SEARCH_API_KEY (SerpAPI) для стабильного поиска."
    );
  }
  return vqd;
}

function parseHtmlResults(html: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, "&").trim();
    const raw = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .trim();
    if (url.startsWith("http") && raw) out.push({ url, title: raw.slice(0, 300) });
  }
  return out;
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

async function duckDuckGoSearch(query: string, limit: number): Promise<SearchCandidate[]> {
  ddgCooldownCheck();
  lastDdgCall = Date.now();

  const vqd = await getVqd(query);
  await new Promise((r) => setTimeout(r, 2000));

  const form = new URLSearchParams({
    q: query,
    b: "",
    s: "0",
    nextParams: "",
    v: "l",
    o: "json",
    dc: "1",
    api: "d.js",
    vqd,
    kl: "wt-wt",
    df: "",
  });

  const res = await fetch(HTML_DDG_URL, {
    method: "POST",
    headers: {
      ...DDG_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: HTML_DDG_URL,
      "Sec-Fetch-Site": "same-origin",
    },
    body: form.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`DuckDuckGo HTML ${res.status}`);
  const html = await res.text();
  if (/challenge-form|not a robot|captcha/i.test(html)) {
    throw new Error("DuckDuckGo: CAPTCHA. Подождите или используйте SEARCH_API_KEY (SerpAPI).");
  }
  if (/your IP address|rate limit|blocked/i.test(html)) {
    throw new Error("DuckDuckGo ограничил запросы. Подождите или используйте SEARCH_API_KEY (SerpAPI).");
  }

  const parsed = parseHtmlResults(html);
  const rows = parsed.map((r) => ({
    url: r.url,
    title: r.title,
    snippet: "",
    sourceType: classifySource(r.url),
  }));
  return sortCandidatesByType(rows).slice(0, limit);
}

/**
 * Поиск: SerpAPI при наличии SEARCH_API_KEY, иначе DuckDuckGo (без ключа).
 */
export async function search(
  query: string,
  options?: { apiKey?: string; limit?: number }
): Promise<SearchCandidate[]> {
  const apiKey = options?.apiKey ?? process.env.SEARCH_API_KEY;
  const limit = options?.limit ?? 10;

  if (apiKey) {
    const rows = await serpApiSearch(query, apiKey);
    return sortCandidatesByType(rows).slice(0, limit);
  }

  return duckDuckGoSearch(query, limit);
}

/** Пауза между несколькими DDG-запросами (при useDdg у нас 1 запрос, не используется). */
const DDG_DELAY_MS = 3000;

/**
 * Сбор кандидатов по нескольким запросам, дедупликация по URL.
 * При использовании DuckDuckGo (без API key) между запросами вставляется пауза.
 */
export async function collectCandidates(
  queries: string[],
  options?: { apiKey?: string; limitPerQuery?: number; maxTotal?: number }
): Promise<SearchCandidate[]> {
  const limitPer = options?.limitPerQuery ?? 5;
  const maxTotal = options?.maxTotal ?? 15;
  const apiKey = options?.apiKey ?? process.env.SEARCH_API_KEY;
  const useDdg = !apiKey;
  const qs = useDdg ? queries.slice(0, 1) : queries;
  const perQuery = useDdg ? Math.max(limitPer, 10) : limitPer;
  const seen = new Set<string>();
  const out: SearchCandidate[] = [];

  for (let i = 0; i < qs.length; i++) {
    if (out.length >= maxTotal) break;
    if (useDdg && i > 0) {
      await delay(DDG_DELAY_MS + Math.random() * 500);
    }
    const rows = await search(qs[i], { apiKey: options?.apiKey, limit: perQuery });
    for (const c of rows) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      out.push(c);
    }
  }

  return sortCandidatesByType(out).slice(0, maxTotal);
}
