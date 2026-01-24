# FindOrigin

Telegram-бот для поиска источников информации: ввод текста или ссылки на пост → анализ → поиск кандидатов.

## Требования

- Node.js 18+
- Аккаунт [SerpAPI](https://serpapi.com) (поиск)

## Установка

```bash
npm install
```

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

- `TELEGRAM_BOT_TOKEN` — токен бота от [@BotFather](https://t.me/BotFather)
- `TELEGRAM_WEBHOOK_SECRET` — (опционально) секрет для проверки webhook
- `SEARCH_API_KEY` — API‑ключ SerpAPI. Без него поиск не выполняется, бот ответит «Кандидатов не найдено»

## Локальный запуск

```bash
npm run dev
```

Для работы webhook нужен публичный HTTPS‑URL (например, [ngrok](https://ngrok.com)).

## Деплой на Vercel

1. Подключите репозиторий к [Vercel](https://vercel.com).
2. В настройках проекта добавьте переменные окружения:  
   `TELEGRAM_BOT_TOKEN`, `SEARCH_API_KEY`, при необходимости `TELEGRAM_WEBHOOK_SECRET`.
3. Деплой из `main`.

## Установка webhook

После деплоя задайте URL webhook:

```bash
WEBHOOK_URL=https://ваш-проект.vercel.app npm run webhook:set
```

Или на Vercel добавьте `WEBHOOK_URL` в Environment Variables и вручную вызовите:

```bash
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ваш-проект.vercel.app/api/webhook/telegram
```

При использовании `TELEGRAM_WEBHOOK_SECRET` в `setWebhook` нужно передать `secret_token` (скрипт `webhook:set` делает это сам).

## Структура

- `app/api/webhook/telegram` — приём updates от Telegram, быстрый 200, фоновая обработка
- `lib/telegram` — `sendMessage`, разбор `update`
- `lib/input` — ввод (текст / ссылка), нормализация
- `lib/analyze` — сущности (утверждения, даты, числа, имена, ссылки), поисковые запросы
- `lib/search` — SerpAPI, классификация источников, сбор кандидатов
- `lib/pipeline` — пайплайн ввод → анализ → поиск → ответ в Telegram

## План

См. [PLAN.md](./PLAN.md). Реализованы этапы 1–5; этапы 6–8 (AI‑ранжирование, UX, деплой/мониторинг) — в планах.
