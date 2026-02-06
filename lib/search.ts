/**
 * Классификация источников по URL (для AI-ранжирования).
 * Поиск через SerpAPI и DuckDuckGo удалён.
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
