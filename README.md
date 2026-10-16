# IT-Office

Idle-tycoon про IT-отдел: вы директор компании и растите один стол техподдержки в большой IT-департамент. Игра запускается как Telegram Mini App.

- Дизайн-документ: [docs/GDD.md](docs/GDD.md)
- Игра в браузере: https://apelsinchikov.github.io/it-office/

## Технологии

- TypeScript + Vite + PixiJS 8 (сцена), HTML поверх сцены (интерфейс)
- GitHub Pages — хостинг, выкладка через GitHub Actions при каждом push в `main`
- Telegram Mini App — запуск через бота
- Supabase — сохранения и рейтинг (этап 5)

## Запуск у себя

```bash
npm install
npm run dev
```

Откроется http://localhost:5173/it-office/
