# Сохранения

## Purpose

`src/game/state.ts`, `src/game/save.ts`, `src/game/remote.ts` (Supabase), вызовы в `src/main.ts`. База — `supabase/migrations/`.

## Requirements

### Requirement: Где хранится
Состояние (схема v3) MUST сохраняться в localStorage (`it-office.save.v2`) каждые 5 с, при сворачивании и закрытии, и раз в 45 с в Telegram CloudStorage частями по 4096 символов.
Раз в 45 с, при сворачивании и закрытии прогресс MUST также уходить в Supabase (Edge Function `progress`, действие `save`).
При запуске сверяются три копии (устройство, CloudStorage, Supabase) и берётся самая продвинутая по `progressScore`; если дальше не локальная — она записывается во все копии и страница перезагружается. Если дальше локальная — она отправляется на сервер (так существующий прогресс переезжает в Supabase при первом входе).

### Requirement: Supabase
Браузер MUST обращаться только к Edge Function `progress` (`supabase/functions/progress`) с действиями `load`, `save`, `leaderboard`, `auth_stats`; та вызывает функции базы `srv_*` секретным ключом (их может выполнять только `service_role`, прямой вызов `ef_*`/`srv_*` из браузера закрыт). Таблицы лежат в неоткрытой схеме `game`.
Клиент отправляет `telegram_id`, исходную строку `initData`, `platform` и имя из `initDataUnsafe`. Сервер проверяет подпись `initData` токеном бота (`game.config`, ключ `bot_token`) и срок 7 дней и записывает итог в `auth_kind` (`verified`, `missing`, `bad`, `expired`, `no_token`, `mismatch`).
Мягкий режим (сейчас): запись и чтение не блокируются, кроме `mismatch` (подпись верная, но другого игрока). Имя — из подписи, иначе из присланного; пустое имя не затирает сохранённое. Строгий режим (только `verified`) включается, когда `auth_stats` покажет подпись на всех устройствах.
Сервер MUST не принимать сохранение с `progressScore` меньше своего, кроме `force` (сброс из настроек и по `resets.json`). Нет сети — игра идёт на локальном и облачном сохранении.

#### Scenario: v2
- GIVEN сохранение v2 с `speed0` (старая поддержка)
- WHEN оно загружается
- THEN становится `speed1` (поддержка теперь отдел 1), монеты забега 0

### Requirement: Рейтинг
Рейтинг (leaderboard) MUST возвращать: топ-100 игроков `{place, name, company, company_progress, company_reorgs, lifetime, me}` и позицию игрока `{...}`.
`company_progress` — процент построенности офиса (0–100, `Math.floor(completion × 100)`); `company_reorgs` — количество реорганизаций в текущей компании (счётчик с 1, сбрасывается при `changeCompany`).
На клиенте рейтинг отображается в `src/ui/panels.ts`: строка рейтингового списка показывает "Компания №N · M%" и "Реорганизаций: K" для каждого игрока из топа, а также отдельно для игрока вне топ-100.

#### Scenario: данные с сервера
- GIVEN игрок в топ-100 или вне его
- WHEN рейтинг загружается
- THEN `company_progress` и `company_reorgs` приходят из `loadLeaderboard()` с сервера

### Requirement: Сохранение прогресса в рейтинг
Каждые 45 с, при сворачивании/закрытии и при запуске (если локальный прогресс дальше) MUST отправляться в Supabase `saveRemote` с полями `company_progress` (0–100) и `company_reorgs` (инт).
`company_progress` вычисляется на клиенте функцией `game.completion()` или `completionFromState(run)`. `company_reorgs` хранится в `state.companyReorgs` и инкрементируется при `reorg()`, сбрасывается в 0 при `changeCompany()`.

### Requirement: Сброс
Сброс в настройках MUST требовать второго нажатия и стирать все три копии (на сервер пишется новая игра с `force`).

### Requirement: Сброс отдельного игрока
Без сервера сброс конкретного игрока MUST идти через список `public/resets.json` (на Pages: `/it-office/resets.json`): записи `{h, before}`, где `h = sha256('it-office:u:' + ник в нижнем регистре)` или `sha256('it-office:id:' + id)`.
При запуске игра скачивает список (до 3 с, без кэша); если ник или id игрока совпал и `createdAt` сохранения раньше `before` — сохранение заменяется новым, облачная и серверная копии перезаписываются. Сброс срабатывает один раз (новое сохранение моложе отметки) и на каждом устройстве игрока. Добавить игрока: `node scripts/reset-player.mjs @ник` и push в `main`.

#### Scenario: игрок в списке
- GIVEN в списке хеш ника игрока с `before` = сейчас
- WHEN он открывает игру
- THEN прогресс начинается заново, а старое облачное сохранение не возвращается
