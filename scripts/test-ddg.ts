/**
 * Диагностика DuckDuckGo: почему срабатывает «anomaly» / ограничение запросов.
 * Запуск: npm run test:ddg
 *
 * Итоги тестов см. docs/DDG_DIAGNOSTICS.md
 */

import { search as ddgSearch, SafeSearchType } from "duck-duck-scrape";

function log(msg: string, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`, extra ?? "");
}

async function run() {
  const query = "DuckDuckGo search test";

  log("1. Запуск одного поиска DDG (пауза 5 с между VQD и d.js, таймаут 20 с)");
  const t0 = Date.now();

  try {
    const result = await Promise.race([
      ddgSearch(query, { safeSearch: SafeSearchType.MODERATE }),
      new Promise<never>((_, rej) =>
        setTimeout(() => rej(new Error("DuckDuckGo: таймаут")), 20_000)
      ),
    ]);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log(`2. Успех за ${elapsed} с. Результатов: ${result.results?.length ?? 0}`);
    if (result.results?.length) {
      console.log("   Пример:", result.results[0]?.title?.slice(0, 60));
    }
  } catch (e) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const msg = e instanceof Error ? e.message : String(e);
    log(`2. Ошибка за ${elapsed} с: ${msg}`);

    if (/anomaly|too quickly/i.test(msg)) {
      console.log("\n   => Сработала антибот-защита DDG. Подробнее: docs/DDG_DIAGNOSTICS.md");
    }
    if (/таймаут/i.test(msg)) {
      console.log("\n   => Таймаут. Убедитесь, что таймаут > 25 с + время обоих запросов.");
    }
    process.exit(1);
  }

  log("3. Готово.");
}

run();
