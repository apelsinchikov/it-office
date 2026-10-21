# IT-Office — контекст проекта (OpenSpec)

Короткая выжимка, чтобы не читать весь код. Сначала — этот файл, потом только нужный `specs/<домен>/spec.md`,
и лишь затем файлы кода из карты ниже. Подробный дизайн — `docs/GDD.md` (длинный, читать по разделам).

## Что это

Idle-тайкун «IT-офис» в Telegram Mini App. Игрок прокачивает сотрудников 5 отделов, открывает комнаты,
делает реорганизации за Гранты и переезжает в новые компании.

- Бот `@it_office_game_bot`, Mini App https://apelsinchikov.github.io/it-office/ (`?debug` → `__game`, `__hud`, `__office`, `__focus`).
- Репозиторий `apelsinchikov/it-office`, ветка `main`; локальная копия на Mac: `/Users/evgeniy/it-office`.

## Стек

TypeScript, Vite 6, PixiJS 8 (сцена), HTML/CSS (интерфейс поверх canvas), vitest. Без сервера и БД.

## Карта кода

| Файл | Что внутри | Спека |
|---|---|---|
| `src/game/economy.ts` | формулы и константы экономики, `TUNING` | economy |
| `src/game/config.ts` | отделы, мебель, порядок открытия `SEQUENCE`, компании, магазин Грантов | progression, meta |
| `src/game/game.ts` | класс `Game`: состояние забега, покупки, тики, события `GameEvent` | все игровые |
| `src/game/state.ts` | схема сохранения v3, `newState`, `normalize` (миграции v1/v2), `completionFromState()`, `progressScore()` | saves |
| `src/game/save.ts` | localStorage + Telegram CloudStorage | saves |
| `src/game/remote.ts`, `supabase/migrations/` | Supabase: прогресс и рейтинг (RPC с проверкой initData, `company_progress`, `company_reorgs`) | saves, hud |
| `src/game/resets.ts`, `public/resets.json`, `scripts/reset-player.mjs` | сброс отдельного игрока по списку | saves |
| `src/game/director.ts` | задания директора IT, перки, инвентарь | director |
| `src/game/advisor.ts` | «Быстрее окупится»: лучшая покупка по окупаемости | hud |
| `src/game/quests.ts` | ежедневные, цепочка, долгие задания | quests |
| `src/game/achievements.ts` | 24 достижения | quests |
| `src/game/events.ts` | календарные события (МСК) | active-play |
| `src/game/phrases.ts` | 365 фраз по группам, редкие | office-scene |
| `src/game/format.ts` | короткая запись чисел (1,2K, 3,4M…) | hud |
| `src/scene/layout.ts` | изометрия 2:1, сетка 3×3, размеры комнат | office-scene |
| `src/scene/office.ts` | `OfficeView`: пол, стены, поле вокруг, замки, столы, значки комнат | office-scene |
| `src/scene/walkers.ts` | прохожие: сетка, A*, места, обход друг друга | office-scene |
| `src/scene/camera.ts` | перетаскивание, щипок, пределы зума и мира | office-scene |
| `src/scene/characters.ts`, `furniture.ts`, `draw.ts`, `theme.ts` | рисовка персонажей, мебели, темы компаний | office-scene |
| `src/ui/hud.ts` | верхняя полоса, «Аврал», меню, панель на весь экран, перки | hud |
| `src/ui/panels.ts` | содержимое панелей (отдел, комнаты, директор, Гранты, задания, коллекция, настройки) | hud |
| `src/ui/fx.ts` | пузыри фраз, тикеты, «?/!», значки над комнатами | hud, office-scene |
| `src/ui/tutorial.ts` | обучение из 8 шагов | hud |
| `src/i18n.ts` | все тексты ru/en, имена сотрудников | — |
| `src/telegram.ts` | WebApp API, полноэкранный режим, safe area | platform |
| `src/main.ts` | сборка всего вместе, циклы, сохранения | — |
| `sim/` | симулятор игроков (профили A–F, BOT) | economy |

## Правила проекта (кратко, полностью — `CLAUDE.md`)

- Общение, комментарии в коде, коммиты — по-русски.
- Коммиты только от `apelsinchikov <324604926+apelsinchikov@users.noreply.github.com>`, без `Co-Authored-By` и `Claude-Session`.
- Выкладка: push в `main` → GitHub Actions (`npm test`, `npm run build`) → GitHub Pages. Cloudflare не использовать.
- Правила игры меняются в трёх местах: код, `docs/GDD.md` + копия GDD в Claude Docs, и `openspec/specs/*`.

## Как проверять в облачном контейнере

npm там недоступен, поэтому:

- типы — `tsc` с заглушками pixi (`tsc -p <scratch>/tc/tsconfig.json`, игнорировать TS7006);
- тесты экономики — `tsc` в CommonJS + шим vitest, `node economy.test.js`;
- симулятор — `tsc --ignoreConfig --module commonjs … sim/run.ts`, затем `node sim/run.js <профиль> <дни> <компаний>`;
- картинку — после push смотреть Pages в браузере Mac (`?debug`).
- Синхронизация Mac: `git bundle` с уникальным именем → `.sync.bundle` в папке → `git fetch` + `reset --hard`.

## Работа с OpenSpec

- `specs/` — как игра устроена сейчас (источник правды для поведения).
- Крупное изменение правил: `changes/<имя>/proposal.md`, `tasks.md`, дельта `specs/<домен>/spec.md`
  (`## ADDED | MODIFIED | REMOVED Requirements`); после выкладки — перенести в `specs/` и сдвинуть папку в `changes/archive/ГГГГ-ММ-ДД-<имя>`.
- Мелкая правка — сразу обновить нужную спеку в том же коммите, что и код.
