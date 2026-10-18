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
