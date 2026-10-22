# Платформа и выкладка

## Purpose

Telegram Mini App на GitHub Pages (`src/telegram.ts`, `.github/workflows`, `vite.config.ts`).

## Requirements

### Requirement: Хостинг
Игра MUST раздаваться только с GitHub Pages; Cloudflare не использовать (блокирует пользователей из России). Прогресс и рейтинг — в Supabase (проект `fytodyhctsidtqssolds`, только RPC-функции, см. спеку saves); своего сервера нет.

### Requirement: Выкладка
Push в `main` MUST запускать GitHub Actions: `npm test`, `npm run build`, публикация на Pages. Коммиты — от `apelsinchikov`, без трейлеров Claude.

### Requirement: Полноэкранный режим Telegram
На iOS/Android при Bot API ≥ 8.0 MUST вызываться `requestFullscreen`; отступы берутся из `--tg-safe-area-inset-*` и `--tg-content-safe-area-inset-*`; при `fullscreenChanged`, `safeAreaChanged`, `contentSafeAreaChanged`, `viewportChanged` камера пересчитывается. Цвета шапки и нижней панели Telegram — под тему игры.

### Requirement: Частота кадров (нагрев телефона)
Офис MUST рисоваться 30 кадров в секунду в покое, 60 — пока двигают камеру (палец, щипок, колесо, подлёт), 10 — под панелью на весь экран (ширина < 640 px). Шаг экономики не режется (`ticker.minFPS = 1`, шаг ≤ 1 с).
Глубину идущих людей (`zIndex`) MUST менять только при сдвиге ≥ 3 px (`setDepth` в `draw.ts`), а детали персонажа не переставлять каждый кадр: в PixiJS 8 это пересобирает всю сцену. Сглаживание (`antialias`) выключено, `?aa=1` — включить для сравнения.

### Requirement: Размер холста
Холст MUST всегда совпадать с размером экрана: размер берётся у `#game`, сверяется через ResizeObserver, при возврате в игру (`visibilitychange`, `pageshow`, `focus`), при событиях Telegram и раз в 0,5 с. Потеря контекста WebGL — сохранение и перезапуск при восстановлении.

#### Scenario: долго в панели или в фоне
- GIVEN игрок долго был в панели заданий или Mini App сворачивался
- WHEN он возвращается в офис
- THEN холст снова на весь экран, без чёрной полосы
