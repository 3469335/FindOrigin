"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Candidate = {
  url: string;
  title: string;
  snippet: string;
  sourceType: string;
};

type Entities = {
  claims: string[];
  dates: string[];
  numbers: string[];
  names: string[];
  links: string[];
};

type SearchData = {
  text: string;
  queries: string[];
  entities: Entities;
  candidates: Candidate[];
};

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchData | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const text = input.trim();
    if (!text) {
      setError("Введите текст или ссылку для поиска источников.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as { success: boolean; data?: SearchData; error?: string };
      if (!json.success) {
        setError(json.error ?? "Ошибка поиска.");
        return;
      }
      if (json.data) setResult(json.data);
    } catch {
      setError("Ошибка сети. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>FindOrigin</h1>
        <p className={styles.subtitle}>
          Введите текст или ссылку на пост — найдём возможные источники.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            className={styles.input}
            placeholder="Текст новости, цитата или ссылка на Telegram-пост…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Поиск…" : "Найти источники"}
          </button>
        </form>

        {error && (
          <div className={`${styles.message} ${styles.message_error}`}>
            {error}
          </div>
        )}

        {result && (
          <section className={styles.results}>
            <h2 className={styles.results_title}>Результаты</h2>
            <p className={styles.results_meta}>
              Запрос: «{result.text.slice(0, 80)}
              {result.text.length > 80 ? "…" : ""}»
            </p>

            <h3 className={styles.results_subtitle}>Извлечённые элементы</h3>
            <ul className={styles.entities_list}>
              {result.entities.claims.length > 0 && (
                <li>Утверждения: {result.entities.claims.slice(0, 3).join("; ")}</li>
              )}
              {result.entities.dates.length > 0 && (
                <li>Даты: {result.entities.dates.slice(0, 5).join(", ")}</li>
              )}
              {result.entities.numbers.length > 0 && (
                <li>Числа: {result.entities.numbers.slice(0, 5).join(", ")}</li>
              )}
              {result.entities.names.length > 0 && (
                <li>Имена: {result.entities.names.slice(0, 5).join(", ")}</li>
              )}
              {result.entities.links.length > 0 && (
                <li>Ссылки: {result.entities.links.slice(0, 3).join(", ")}</li>
              )}
              {!result.entities.claims.length &&
                !result.entities.dates.length &&
                !result.entities.numbers.length &&
                !result.entities.names.length &&
                !result.entities.links.length && <li>(не выделено)</li>}
            </ul>

            <h3 className={styles.results_subtitle}>Источники и тип</h3>
            {result.candidates.length === 0 ? (
              <p className={styles.message}>
                Кандидатов не найдено. Попробуйте другой запрос или добавьте
                SEARCH_API_KEY (SerpAPI) для поиска через Google.
              </p>
            ) : (
              <ul className={styles.list}>
                {result.candidates.map((c, i) => (
                  <li key={i} className={styles.item}>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.item_link}
                    >
                      {c.title || c.url}
                    </a>
                    <span className={styles.item_type}>[{c.sourceType}]</span>
                    {c.snippet && (
                      <p className={styles.item_snippet}>{c.snippet}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <p className={styles.ai_note}>
              AI-анализ будет выполнен на следующем этапе.
            </p>
          </section>
        )}

        <footer className={styles.footer}>
          <p>
            Также работает как Telegram-бот. Webhook:{" "}
            <code>/api/webhook/telegram</code>
          </p>
        </footer>
      </div>
    </main>
  );
}
