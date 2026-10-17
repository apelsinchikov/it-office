// Тонкая обёртка над Telegram Mini App SDK.
// Вне Telegram (обычный браузер) всё продолжает работать, просто без пользователя.

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: TgUser };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  isVersionAtLeast?(version: string): boolean;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export interface TelegramInfo {
  insideTelegram: boolean;
  user?: TgUser;
  /** Строка для проверки на сервере (Edge Function). Пустая вне Telegram. */
  initData: string;
  platform: string;
}

export function initTelegram(): TelegramInfo {
  const tg = window.Telegram?.WebApp;
  // Вне Telegram SDK тоже загружается, но initData пустой.
  if (!tg || !tg.initData) {
    return { insideTelegram: false, initData: '', platform: 'browser' };
  }

  tg.ready();
  tg.expand();
  // Чтобы свайп по офису вниз не закрывал игру (Bot API 7.7+).
  if (tg.disableVerticalSwipes && tg.isVersionAtLeast?.('7.7')) {
    tg.disableVerticalSwipes();
  }

  try {
    if (tg.isVersionAtLeast?.('6.1')) {
      tg.setHeaderColor?.('#262338');
      tg.setBackgroundColor?.('#262338');
    }
  } catch {
    // старый клиент
  }

  return {
    insideTelegram: true,
    user: tg.initDataUnsafe.user,
    initData: tg.initData,
    platform: tg.platform,
  };
}
