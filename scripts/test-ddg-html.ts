/**
 * Тест: решает ли переход на html.duckduckgo.com/html (POST) проблему с DDG.
 * Запуск: npm run test:ddg-html
 *
 * Эндпоинт как в SearXNG: один POST с q, vqd, form params. Парсим HTML.
 */

import needle from "needle";

const HEADERS: Record<string, string> = {
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

const VQD_REGEX = /vqd=['"](\d+-\d+(?:-\d+)?)['"]/;
const HTML_URL = "https://html.duckduckgo.com/html/";

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function parseResults(html: string): { title: string; url: string }[] {
  const out: { title: string; url: string }[] = [];
  const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, "&").trim();
    const raw = m[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
    if (url.startsWith("http") && raw) out.push({ title: raw.slice(0, 80), url });
  }
  return out;
}

function hasCaptcha(html: string): boolean {
  return /challenge-form|not a robot|captcha/i.test(html);
}

function hasBlockMessage(html: string): boolean {
  return /your IP address|your user agent|rate limit|blocked/i.test(html);
}

async function run() {
  const query = "DuckDuckGo HTML test";
  const t0 = Date.now();

  log("1. GET duckduckgo.com (VQD + cookies)");
  const opts1 = {
    headers: HEADERS,
    parse_response: false,
    parse_cookies: true,
    timeout: 10000,
  };

  const res1 = await needle(
    "get",
    `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`,
    opts1
  );

  const body1 = String(res1.body ?? "");
  const vqdMatch = VQD_REGEX.exec(body1);
  const vqd = vqdMatch?.[1];
  const cookies = (res1 as { cookies?: Record<string, string> }).cookies ?? {};

  log(`   VQD: ${vqd ? "ok" : "FAIL"}, cookies: ${Object.keys(cookies).length}`);

  if (!vqd) {
    console.error("   Не удалось извлечь VQD.");
    process.exit(1);
  }

  log("2. Пауза 3 с");
  await new Promise((r) => setTimeout(r, 3000));

  const form = {
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
  };

  log("3. POST html.duckduckgo.com/html (form + cookies + Referer)");
  const opts2 = {
    headers: {
      ...HEADERS,
      Referer: HTML_URL,
      "Sec-Fetch-Site": "same-origin",
    },
    cookies,
    timeout: 15000,
  };

  const res2 = await needle("post", HTML_URL, form, opts2);

  const html = String(res2.body ?? "");
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (hasCaptcha(html)) {
    log(`4. Ошибка за ${elapsed} с: CAPTCHA (html эндпоинт не помог)`);
    process.exit(1);
  }
  if (hasBlockMessage(html)) {
    log(`4. Ошибка за ${elapsed} с: блок/ограничение в HTML`);
    process.exit(1);
  }

  const results = parseResults(html);
  if (results.length) {
    log(`4. Успех за ${elapsed} с. Результатов: ${results.length}`);
    log(`   Пример: ${results[0]?.title?.slice(0, 50) ?? "—"}`);
  } else {
    log(`4. Ответ за ${elapsed} с получен (${html.length} байт), результатов не найдено.`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
