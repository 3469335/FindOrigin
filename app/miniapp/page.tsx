"use client";

import { useState, useEffect } from "react";
import styles from "./miniapp.module.css";

type Candidate = {
  url: string;
  title: string;
  snippet: string;
  sourceType: string;
};

type RankedSource = {
  url: string;
  title: string;
  confidence: string;
  reason?: string;
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
  entities: Entities;
  candidates: Candidate[];
  ranked: RankedSource[];
  usedAi: boolean;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        initData: string;
        initDataUnsafe: {
          user?: { id: number; first_name?: string; username?: string };
          start_param?: string;
        };
        openLink: (url: string) => void;
        close: () => void;
      };
    };
  }
}

export default function MiniappPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchData | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      // применяем тему Telegram
      const root = document.documentElement;
      if (tg.themeParams?.bg_color) root.style.setProperty("--tg-bg", tg.themeParams.bg_color);
      if (tg.themeParams?.text_color) root.style.setProperty("--tg-text", tg.themeParams.text_color);
      if (tg.themeParams?.hint_color) root.style.setProperty("--tg-hint", tg.themeParams.hint_color);
      if (tg.themeParams?.link_color) root.style.setProperty("--tg-link", tg.themeParams.link_color);
      if (tg.themeParams?.button_color) root.style.setProperty("--tg-btn", tg.themeParams.button_color);
      if (tg.themeParams?.button_text_color) root.style.setProperty("--tg-btn-text", tg.themeParams.button_text_color);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const text = input.trim();
    if (!text) {
      setError("Введите текст со ссылками.");
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
        setError(json.error ?? "Ошибка анализа.");
        return;
      }
      if (json.data) setResult(json.data);
    } catch {
      setError("Ошибка сети.");
    } finally {
      setLoading(false);
    }
  }

  function openUrl(url: string) {
    const tg = window.Telegram?.WebApp;
    if (tg?.openLink) tg.openLink(url);
    else window.open(url, "_blank");
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>FindOrigin</h1>
        <p className={styles.subtitle}>
          Текст со ссылками → AI ранжирует источники
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            className={styles.input}
            placeholder="Вставьте текст с URL…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            disabled={loading}
          />
          <button type="submit" className={styles.btn} disabled={loading}>
            {loading ? "Анализ…" : "Анализировать"}
          </button>
        </form>

        {error && (
          <div className={styles.messageError}>{error}</div>
        )}

        {result && (
          <section className={styles.results}>
            <h2 className={styles.resultsTitle}>Результаты</h2>

            <h3 className={styles.subtitle}>Элементы</h3>
            <ul className={styles.entities}>
              {result.entities.claims.length > 0 && (
                <li>Утверждения: {result.entities.claims.slice(0, 2).join("; ")}</li>
              )}
              {result.entities.links.length > 0 && (
                <li>Ссылки: {result.entities.links.slice(0, 3).join(", ")}</li>
              )}
              {!result.entities.claims.length && !result.entities.links.length && (
                <li>(не выделено)</li>
              )}
            </ul>

            <h3 className={styles.subtitle}>
              Рекомендованные{result.usedAi ? " (AI)" : ""}
            </h3>
            {result.ranked.length > 0 ? (
              <ul className={styles.list}>
                {result.ranked.map((r, i) => (
                  <li key={i} className={styles.item}>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => openUrl(r.url)}
                    >
                      {r.title || r.url}
                    </button>
                    <span className={styles.confidence}>
                      {r.confidence === "high" ? "Высокая" : r.confidence === "low" ? "Низкая" : "Средняя"}
                    </span>
                    {r.reason && <p className={styles.reason}>{r.reason}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>Ссылок не найдено. Добавьте URL.</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
