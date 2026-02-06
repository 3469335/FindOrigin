import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram";
import { parseMessage } from "@/lib/telegram";
import { processUpdate } from "@/lib/pipeline";

/** Таймаут 60 с — пайплайн (AI) может выполняться до минуты. */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const auth = request.headers.get("x-telegram-bot-api-secret-token");
    if (auth !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseMessage(update);
  if (!parsed) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    await processUpdate(parsed.chatId, parsed.text);
  } catch (err) {
    console.error("[webhook] processUpdate error:", err);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json(
    { usage: "POST Telegram update to this URL (webhook)" },
    { status: 200 }
  );
}
