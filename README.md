# FindOrigin

Telegram-бот для поиска источников информации: ввод текста или ссылки на пост → анализ → поиск → AI-ранжирование → 1–3 рекомендованных источника.

## Требования

- Node.js 18+
- (Опционально) [SerpAPI](https://serpapi.com) для поиска через Google; без ключа используется DuckDuckGo
- (Опционально) [OpenAI API](https://platform.openai.com) для AI-ранжирования; без ключа — топ-3 по типу источника

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
- `SEARCH_API_KEY` — (опционально) API‑ключ SerpAPI для поиска через Google. Без ключа — DuckDuckGo
- `OPENAI_API_KEY` — (опционально) для AI-ранжирования. Без ключа — топ-3 по типу источника

## Локальный запуск

```bash
npm run dev
```

Для работы webhook нужен публичный HTTPS‑URL (например, [ngrok](https://ngrok.com)).

## Деплой на Vercel

1. Подключите репозиторий к [Vercel](https://vercel.com).
2. В настройках проекта добавьте переменные окружения:  
   `TELEGRAM_BOT_TOKEN`, `SEARCH_API_KEY`, `OPENAI_API_KEY`, при необходимости `TELEGRAM_WEBHOOK_SECRET`.
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
- `lib/search` — SerpAPI (при наличии ключа) или DuckDuckGo, классификация источников, сбор кандидатов
- `lib/ai` — AI-ранжирование (OpenAI), выбор 1–3 лучших источников
- `lib/pipeline` — пайплайн ввод → анализ → поиск → AI → ответ в Telegram

## DuckDuckGo: почему «ограничил запросы»?

При поиске через DuckDuckGo (без `SEARCH_API_KEY`) используется эндпоинт **`html.duckduckgo.com/html`** (POST): GET VQD → пауза 2 с → POST с form. Эндпоинт `links.duckduckgo.com/d.js` часто блокирует («anomaly»); переход на HTML это обходит (см. `docs/DDG_DIAGNOSTICS.md`).

**Что сделано:**
- Поиск через **HTML** (не d.js): стабильно в тестах.
- **Rate limit**: не чаще одного поиска DuckDuckGo раз в **15 секунд** (cooldown).
- Один поисковый запрос на запуск при использовании DDG.

Если блокировки продолжаются, добавьте `SEARCH_API_KEY` (SerpAPI). Подробнее: [docs/DDG_DIAGNOSTICS.md](docs/DDG_DIAGNOSTICS.md). Тесты: `npm run test:ddg-html`, `npm run test:ddg-lib`.

## Тестирование

```bash
npm run test              # юнит-тесты (extractEntities, parseMessage)
npm run test:integration  # интеграция: runSearch → структура результата
npm run test:ddg-lib      # поиск через DDG HTML
```

## Логи и мониторинг

Ошибки логируются в `console.error` (пайплайн, API, AI). На Vercel логи доступны в Dashboard → Logs. При сбоях Telegram/Search/AI пользователь получает понятное сообщение об ошибке.

## План

См. [PLAN.md](./PLAN.md). Реализованы этапы 1–8.
