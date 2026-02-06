/**
 * Интеграционный тест: runSearch → проверка структуры результата.
 * Запуск: npm run test:integration
 *
 * Требует: сеть (поиск), опционально OPENAI_API_KEY для AI-ранжирования.
 */

async function run() {
  process.env.SEARCH_API_KEY = process.env.SEARCH_API_KEY ?? "";
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

  const { runSearch } = await import("../lib/pipeline");
  const text = "Путин подписал указ о мобилизации 21 сентября 2022 года";

  console.log("[integration] runSearch:", text.slice(0, 50) + "...");
  const t0 = Date.now();
  const result = await runSearch(text);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!result.text || !result.entities || !Array.isArray(result.candidates)) {
    throw new Error("Invalid result structure: missing text, entities or candidates");
  }
  if (!Array.isArray(result.ranked)) {
    throw new Error("Invalid result: ranked must be array");
  }
  if (typeof result.usedAi !== "boolean") {
    throw new Error("Invalid result: usedAi must be boolean");
  }

  console.log(`[integration] OK in ${elapsed}s:`, {
    queries: result.queries.length,
    candidates: result.candidates.length,
    ranked: result.ranked.length,
    usedAi: result.usedAi,
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
