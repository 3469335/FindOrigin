/**
 * Интеграционный тест: runSearch → проверка структуры результата.
 * Запуск: npm run test:integration
 *
 * Требует: текст со ссылками, опционально OPENAI_API_KEY для AI-ранжирования.
 */

async function run() {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

  const { runSearch } = await import("../lib/pipeline");
  const text =
    "Новость о мобилизации. См. https://ria.ru/20220921/mobilizatsiya-1817875434.html и https://tass.ru/politika/15772735";

  console.log("[integration] runSearch: текст со ссылками");
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
    candidates: result.candidates.length,
    ranked: result.ranked.length,
    usedAi: result.usedAi,
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
