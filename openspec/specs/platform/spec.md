# Платформа и выкладка

## Purpose

Telegram Mini App на GitHub Pages (`src/telegram.ts`, `.github/workflows`, `vite.config.ts`).

## Requirements

### Requirement: Хостинг
Игра MUST раздаваться только с GitHub Pages; Cloudflare не использовать (блокирует пользователей из России). Своего сервера и БД нет; рейтинг — позже.

### Requirement: Выкладка
Push в `main` MUST запускать GitHub Actions: `npm test`, `npm run build`, публикация на Pages. Коммиты — от `apelsinchikov`, без трейлеров Claude.

### Requirement: Полноэкранный режим Telegram
На iOS/Android при Bot API ≥ 8.0 MUST вызываться `requestFullscreen`; отступы берутся из `--tg-safe-area-inset-*` и `--tg-content-safe-area-inset-*`; при `fullscreenChanged`, `safeAreaChanged`, `contentSafeAreaChanged`, `viewportChanged` камера пересчитывается. Цвета шапки и нижней панели Telegram — под тему игры.

### Requirement: Размер холста
Холст MUST всегда совпадать с размером экрана: размер берётся у `#game`, сверяется через ResizeObserver, при возврате в игру (`visibilitychange`, `pageshow`, `focus`), при событиях Telegram и раз в 0,5 с. Потеря контекста WebGL — сохранение и перезапуск при восстановлении.

#### Scenario: долго в панели или в фоне
- GIVEN игрок долго был в панели заданий или Mini App сворачивался
- WHEN он возвращается в офис
- THEN холст снова на весь экран, без чёрной полосы
