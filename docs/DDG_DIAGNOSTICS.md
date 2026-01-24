# Диагностика: почему DuckDuckGo ограничивает запросы

## Что проверяли

Скрипт `npm run test:ddg` вызывает `duck-duck-scrape`: один поиск = два HTTP-запроса (getVQD → пауза → d.js).

## Результаты тестов

| Пауза VQD→d.js | Заголовки              | Результат |
|----------------|------------------------|-----------|
| 25 с           | свои (Chrome-like)     | `DDG detected an anomaly...` (~26 с) |
| 5 с            | свои + Referer         | `DDG detected an anomaly...` (~6 с)  |
| 5 с            | дефолт библиотеки      | `DDG detected an anomaly...` (~6 с)  |

Вывод: **ошибка воспроизводится при любой паузе (5 с и 25 с) и с любыми заголовками.** Сообщение «requests too quickly» приходит в ответе d.js, но пауза между запросами на результат не влияет.

## Вероятные причины

1. **Нет cookies**  
   getVQD отдаёт страницу, которая выставляет cookies. Мы их не сохраняем и не отправляем с запросом к d.js. В браузере d.js вызывается с теми же cookies — у нас их нет.

2. **Разные заголовки у двух запросов**  
   В `duck-duck-scrape` getVQD вызывается с `headers: COMMON_HEADERS`, а d.js — с `needleOptions` (если не передавать — `undefined`). У первого запроса «нормальные» заголовки, у второго могут быть дефолты needle — это может выглядеть как бот.

3. **IP**  
   Datacenter / облачный IP (Vercel, CI, хостинг) чаще попадают под антибот.

4. **Жёсткая защита d.js**  
   Эндпоинт `links.duckduckgo.com/d.js` может проверять не только скорость, но и cookies, Referer, согласованность заголовков и т.п.

## Что сделано в проекте

- **Поиск через `html.duckduckgo.com/html`** (POST): GET VQD → пауза 2 с → POST form. Обход блокировок d.js, тесты проходят.
- Cooldown 15 с между вызовами DuckDuckGo; один поисковый запрос на запуск.
- При наличии ключа используется SerpAPI (Google).

## Тесты: cookie jar и html.duckduckgo.com

### Cookie jar (npm run test:ddg-cookies)

- GET duckduckgo.com → извлекаем VQD, сохраняем `resp.cookies`.
- Пауза 5 с, затем GET d.js с теми же cookies и Referer.

**Результат:** От первой страницы пришло **0 cookies** (DDG не вернул их или needle не распарсил). d.js по‑прежнему вернул **anomaly**. Вывод: проверить «cookie jar» не удалось — cookies не было; повторный запрос к d.js с пустыми cookies снова блокируется.

### HTML-эндпоинт (npm run test:ddg-html)

- GET duckduckgo.com → VQD.
- Пауза 3 с.
- POST `https://html.duckduckgo.com/html/` с form (q, vqd, …), Referer, Sec-Fetch-Site: same-origin.
- Парсим HTML (ссылки с классом `result__a`).

**Результат:** **Успех.** ~4.6 с, 10 результатов, без anomaly и CAPTCHA.

**Вывод: переход на `html.duckduckgo.com/html` (POST) решает проблему.** В проекте для DuckDuckGo используется именно этот эндпоинт вместо d.js.

При желании можно экспериментировать с cookie jar (например, если DDG начнёт отдавать cookies) или с Lite (`lite.duckduckgo.com`).
