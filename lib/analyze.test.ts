import { describe, it, expect } from "vitest";
import { extractEntities, buildSearchQueries } from "./analyze";

describe("extractEntities", () => {
  it("извлекает даты", () => {
    const e = extractEntities("Событие произошло 15.01.2024 и 2024-01-20.");
    expect(e.dates).toContain("15.01.2024");
    expect(e.dates).toContain("2024-01-20");
  });

  it("извлекает числа", () => {
    const e = extractEntities("Цена 1000 ₽ и 50% рост.");
    expect(e.numbers.length).toBeGreaterThan(0);
  });

  it("извлекает ссылки", () => {
    const e = extractEntities("Смотри https://example.com/news");
    expect(e.links).toContain("https://example.com/news");
  });

  it("извлекает имена (Cap)", () => {
    const e = extractEntities("Иван Петров и John Smith сообщили.");
    expect(e.names.length).toBeGreaterThan(0);
  });

  it("извлекает утверждения как предложения", () => {
    const e = extractEntities(
      "Курс доллара вырос на 5 процентов за последнюю неделю. Это значительное изменение."
    );
    expect(e.claims.length).toBeGreaterThan(0);
  });
});

describe("buildSearchQueries", () => {
  it("формирует запросы из сущностей", () => {
    const entities = {
      claims: ["Цена нефти выросла"],
      dates: ["2024-01-15"],
      numbers: ["100"],
      names: ["Иван Петров"],
      links: [],
    };
    const q = buildSearchQueries(entities, "Цена нефти выросла. Иван Петров.", 3);
    expect(q.length).toBeGreaterThan(0);
    expect(q[0].length).toBeGreaterThan(5);
  });

  it("ограничивает maxQueries", () => {
    const entities = {
      claims: ["Запрос один длинный текст", "Запрос два длинный текст", "Запрос три длинный текст"],
      dates: [],
      numbers: [],
      names: ["Имя Один", "Имя Два"],
      links: [],
    };
    const q = buildSearchQueries(entities, "текст", 2);
    expect(q.length).toBeLessThanOrEqual(2);
  });
});
