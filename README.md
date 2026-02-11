# FindOrigin

Telegram-бот для AI-анализа источников: ввод текста со ссылками → извлечение сущностей → AI-ранжирование ссылок → 1–3 рекомендованных источника.

## Требования

- Node.js 18+
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
- `OPENAI_API_KEY` — (опционально) для AI-ранжирования. Без ключа — топ-3 по типу источника

## Локальный запуск

```bash
npm run dev
```

Для работы webhook нужен публичный HTTPS‑URL (например, [ngrok](https://ngrok.com)).

## Деплой на Vercel

1. Подключите репозиторий к [Vercel](https://vercel.com).
2. В настройках проекта добавьте переменные окружения:  
   `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, при необходимости `TELEGRAM_WEBHOOK_SECRET`.
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

## Telegram Mini App

UI-слой для бота: `/miniapp` — тот же функционал (текст со ссылками → AI-анализ) в виде Mini App внутри Telegram.

**Установка кнопки меню** (открывает Mini App):

```bash
MINIAPP_URL=https://ваш-проект.vercel.app npm run menu:set
```

Или в BotFather: @BotFather → Bot Settings → Menu Button → Configure menu button → URL: `https://ваш-проект.vercel.app/miniapp`.

## Бот не отвечает?

1. **Webhook на прод:** `WEBHOOK_URL=https://ваш-проект.vercel.app npm run webhook:set` (после деплоя).
2. **Переменные на Vercel:** `TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY` (опционально).
3. **Текст со ссылками:** бот отвечает только если в сообщении есть URL (https://...).
4. **Логи:** Vercel Dashboard → Logs — смотреть ошибки `[webhook]` или `[FindOrigin]`.

## Структура

- `app/api/webhook/telegram` — приём updates от Telegram, быстрый 200, фоновая обработка
- `lib/telegram` — `sendMessage`, разбор `update`
- `lib/input` — ввод (текст / ссылка), нормализация
- `lib/analyze` — сущности (утверждения, даты, числа, имена, ссылки)
- `lib/search` — классификация источников по URL (для AI)
- `lib/ai` — AI-ранжирование (OpenAI), выбор 1–3 лучших источников
- `lib/pipeline` — пайплайн ввод → анализ ссылок → AI → ответ

## Тестирование

```bash
npm run test              # юнит-тесты (extractEntities, parseMessage)
npm run test:integration  # интеграция: runSearch (текст со ссылками)
```

## Логи и мониторинг

Ошибки логируются в `console.error` (пайплайн, API, AI). На Vercel логи доступны в Dashboard → Logs.

## План

См. [PLAN.md](./PLAN.md). Реализованы этапы 1–8.
