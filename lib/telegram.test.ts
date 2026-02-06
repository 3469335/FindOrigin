import { describe, it, expect } from "vitest";
import { parseMessage } from "./telegram";

describe("parseMessage", () => {
  it("извлекает chatId и text из message", () => {
    const update = {
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: 12345, type: "private" },
        date: 1700000000,
        text: "Привет, найди источники",
      },
    };
    const r = parseMessage(update);
    expect(r).toEqual({ chatId: 12345, text: "Привет, найди источники" });
  });

  it("использует caption если нет text", () => {
    const update = {
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: 999, type: "private" },
        date: 1700000000,
        caption: "Текст из подписи",
      },
    };
    const r = parseMessage(update);
    expect(r).toEqual({ chatId: 999, text: "Текст из подписи" });
  });

  it("возвращает null если нет message", () => {
    const r = parseMessage({ update_id: 1 });
    expect(r).toBeNull();
  });

  it("возвращает null если пустой text и caption", () => {
    const update = {
      update_id: 1,
      message: {
        message_id: 1,
        chat: { id: 1, type: "private" },
        date: 1700000000,
      },
    };
    const r = parseMessage(update);
    expect(r).toBeNull();
  });
});
