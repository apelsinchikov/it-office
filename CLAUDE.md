# Правила проекта IT-Office

## Общение

- Всегда отвечать на русском языке: ответы в чате, вопросы, отчёты, комментарии в документах.
- Код, имена файлов и команд — как есть; комментарии в коде и тексты коммитов — по-русски.

## Коммиты

- Все коммиты — от имени владельца: `apelsinchikov <324604926+apelsinchikov@users.noreply.github.com>`.
- Без строк `Co-Authored-By` и `Claude-Session` в сообщениях коммитов.
- Выкладка: push в `main` → GitHub Actions (`npm test`, `npm run build`) → GitHub Pages.

## Инфраструктура

- Хостинг — только GitHub Pages; бот `@it_office_game_bot`, Mini App https://apelsinchikov.github.io/it-office/.
- Cloudflare не использовать: блокирует пользователей из России.
- Сервера и базы данных пока нет (рейтинг — позже). Сохранение — на устройстве и в Telegram CloudStorage.

## Документы

- Дизайн-документ: `docs/GDD.md` и его копия в Claude Docs — обновлять обе при изменении правил игры.
- Итоги симуляции — `sim/README.md`.

## OpenSpec (экономия контекста)

- Перед задачей читать `openspec/project.md` (карта кода и правила) и только нужные `openspec/specs/<домен>/spec.md`; код открывать точечно по карте, а не целиком.
- Домены: economy, progression, director, meta, active-play, quests, office-scene, hud, saves, platform.
- Изменил поведение игры — в том же коммите обновить соответствующую спеку (плюс `docs/GDD.md` и копию в Claude Docs, если меняются правила).
- Крупные изменения — через `openspec/changes/<имя>/` (proposal, tasks, дельта спек), после выкладки — в `changes/archive/`.
