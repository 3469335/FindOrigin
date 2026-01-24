/**
 * Этап 4: анализ текста и выделение сущностей.
 * Утверждения, даты, числа, имена, ссылки → поисковые запросы.
 */

export interface ExtractedEntities {
  claims: string[];
  dates: string[];
  numbers: string[];
  names: string[];
  links: string[];
}

const ORDINAL = /\b(\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+\d{4})\b/gi;
const NUMBERS = /\b\d+(?:[.,]\d+)?(?:\s*%|₽|\$|€|тыс|млн|млрд)?\b/gi;
const URL = /https?:\/\/[^\s]+/gi;
const NAME_CAP = /\b[А-ЯA-Z][а-яa-z]+(?:\s+[А-ЯA-Z][а-яa-z]+)+\b/g;

export function extractEntities(text: string): ExtractedEntities {
  const claims: string[] = [];
  const dates: string[] = [];
  const numbers: string[] = [];
  const names: string[] = [];
  const links: string[] = [];

  const d = text.match(ORDINAL);
  if (d) dates.push(...d.map((x) => x.trim()));

  const n = text.match(NUMBERS);
  if (n) numbers.push(...n.map((x) => x.trim()));

  const u = text.match(URL);
  if (u) links.push(...u.map((x) => x.trim()));

  const cap = text.match(NAME_CAP);
  if (cap) {
    const seen = new Set<string>();
    for (const x of cap) {
      const t = x.trim();
      if (!seen.has(t)) {
        seen.add(t);
        names.push(t);
      }
    }
  }

  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (s.length > 20 && s.length < 300) claims.push(s);
  }
  if (claims.length > 5) {
    claims.splice(5);
  }

  return { claims, dates, numbers, names, links };
}

/**
 * Формирование поисковых запросов из сущностей и исходного текста.
 */
export function buildSearchQueries(
  entities: ExtractedEntities,
  rawText: string,
  maxQueries = 3
): string[] {
  const parts: string[] = [];
  const added = new Set<string>();

  const add = (q: string) => {
    const n = normalize(q);
    if (n.length > 5 && !added.has(n)) {
      added.add(n);
      parts.push(q);
    }
  };

  for (const c of entities.claims) {
    if (parts.length >= maxQueries) break;
    add(c);
  }
  for (const name of entities.names) {
    if (parts.length >= maxQueries) break;
    add(name);
  }
  if (entities.dates.length) {
    const withDate = [entities.claims[0], entities.names[0], entities.dates[0]]
      .filter(Boolean)
      .join(" ");
    if (withDate) add(withDate);
  }
  if (parts.length < maxQueries && rawText.length > 10) {
    const short = rawText.slice(0, 150).trim();
    if (short) add(short);
  }

  return parts.slice(0, maxQueries);
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
