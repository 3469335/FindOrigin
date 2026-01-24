/**
 * Установка Telegram webhook.
 * Использование: npm run webhook:set
 * Нужны TELEGRAM_BOT_TOKEN и WEBHOOK_URL (или NEXT_PUBLIC_VERCEL_URL + явный путь).
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const base =
  process.env.WEBHOOK_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "");

const path = "/api/webhook/telegram";
const url = base ? `${base.replace(/\/$/, "")}${path}` : "";

async function main() {
  if (!token) {
    console.error("Set TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }
  if (!url) {
    console.error("Set WEBHOOK_URL or deploy to Vercel (VERCEL_URL).");
    process.exit(1);
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const body: { url: string; secret_token?: string } = { url };
  if (secret) body.secret_token = secret;

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    console.error("setWebhook failed:", data.description);
    process.exit(1);
  }
  console.log("Webhook set:", url);
}

main();
