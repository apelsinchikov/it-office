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
