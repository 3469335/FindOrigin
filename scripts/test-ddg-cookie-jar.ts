/**
 * Тест: решает ли cookie jar (переиспользование cookies между VQD и d.js) проблему с DDG.
 * Запуск: npm run test:ddg-cookies
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

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function run() {
  const query = "DuckDuckGo cookie jar test";
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

  log(`   VQD: ${vqd ? "ok" : "FAIL"}, cookies: ${Object.keys(cookies).length} (${Object.keys(cookies).join(", ") || "—"})`);

  if (!vqd) {
    console.error("   Не удалось извлечь VQD.");
    process.exit(1);
  }

  log("2. Пауза 5 с");
  await new Promise((r) => setTimeout(r, 5000));

  const qs = new URLSearchParams({
    q: query,
    t: "D",
    l: "en-us",
    kl: "wt-wt",
    s: "0",
    dl: "en",
    ct: "US",
    bing_market: "en-US",
    df: "a",
    vqd,
    ex: "-1",
    sp: "1",
    bpa: "1",
    biaexp: "b",
    msvrtexp: "b",
    nadse: "b",
    eclsexp: "b",
    tjsexp: "b",
  }).toString();

  log("3. GET links.duckduckgo.com/d.js (с теми же cookies)");
  const opts2 = {
    headers: { ...HEADERS, Referer: "https://duckduckgo.com/", "sec-fetch-site": "same-origin" },
    cookies,
    parse_response: false,
    timeout: 15000,
  };

  const res2 = await needle(
    "get",
    `https://links.duckduckgo.com/d.js?${qs}`,
    opts2
  );

  const body2 = String(res2.body ?? "");
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (body2.includes("DDG.deep.anomalyDetectionBlock")) {
    log(`4. Ошибка за ${elapsed} с: DDG anomaly (cookie jar не помог)`);
    process.exit(1);
  }
  if (body2.includes("DDG.deep.is506")) {
    log(`4. Ошибка за ${elapsed} с: DDG is506`);
    process.exit(1);
  }

  const match = /DDG\.pageLayout\.load\('d',(\[.+\])\);DDG\.duckbar\.load/.exec(body2);
  if (match) {
    const arr = JSON.parse(match[1].replace(/\t/g, "    ")) as { t?: string; u?: string }[];
    const count = arr.filter((x) => !("n" in x)).length;
    log(`4. Успех за ${elapsed} с. Результатов: ${count}`);
    if (count) log(`   Пример: ${arr.find((x) => x.t)?.t?.slice(0, 50) ?? "—"}`);
  } else {
    log(`4. Ответ за ${elapsed} с получен, но не удалось распарсить результаты.`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
