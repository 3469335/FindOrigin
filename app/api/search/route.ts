import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/pipeline";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json(
        { success: false, error: "Укажите текст для поиска." },
        { status: 400 }
      );
    }

    const result = await runSearch(text);
    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка обработки.";
    console.error("[FindOrigin /api/search]", e);
    return NextResponse.json({ success: false, error: msg }, { status: 200 });
  }
}
