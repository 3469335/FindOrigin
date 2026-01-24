/**
 * Интеграционный тест: поиск через lib/search (HTML DDG) без SEARCH_API_KEY.
 * Запуск: npm run test:ddg-lib
 */

async function run() {
  process.env.SEARCH_API_KEY = "";
  const { collectCandidates } = await import("../lib/search");
  const t0 = Date.now();
  const results = await collectCandidates(["DuckDuckGo HTML search test"], {
    limitPerQuery: 10,
    maxTotal: 10,
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[${new Date().toISOString()}] Результатов: ${results.length} за ${elapsed} с`);
  if (results.length) console.log("   Пример:", results[0]?.url?.slice(0, 60));
  if (!results.length) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
