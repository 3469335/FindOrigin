/**
 * Установить кнопку меню бота для открытия Mini App.
 * Запуск: MINIAPP_URL=https://ваш-проект.vercel.app npm run menu:set
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const base = process.env.MINIAPP_URL || process.env.WEBHOOK_URL?.replace(/\/api\/webhook.*$/, "");
const url = base
  ? (base.replace(/\/$/, "").endsWith("/miniapp")
    ? base.replace(/\/$/, "")
    : base.replace(/\/$/, "") + "/miniapp")
  : "";

async function main() {
  if (!token) {
    console.error("Set TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }
  if (!url) {
    console.error("Set MINIAPP_URL (e.g. https://find-origin.vercel.app)");
    process.exit(1);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: {
        type: "web_app",
        text: "Открыть",
        web_app: { url },
      },
    }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    console.error("setChatMenuButton failed:", data.description);
    process.exit(1);
  }
  console.log("Menu button set:", url);
}

main();
