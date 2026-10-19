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
  setBottomBarColor?(color: string): void;
  requestFullscreen?(): void;
  isFullscreen?: boolean;
  onEvent?(event: string, cb: () => void): void;
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

/** Telegram сменил полный экран или отступы под свои кнопки — пересчитать раскладку. */
export function onTelegramLayout(cb: () => void): void {
  const tg = window.Telegram?.WebApp;
  if (!tg?.onEvent) return;
  for (const ev of ['fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged']) tg.onEvent(ev, cb);
}

export function initTelegram(): TelegramInfo {
  const tg = window.Telegram?.WebApp;
  // Вне Telegram SDK тоже загружается, но initData пустой.
  // На некоторых платформах (Telegram Desktop) initData может быть пустым,
  // но initDataUnsafe содержит user — соберём initData из него.
  if (!tg || (!tg.initData && !tg.initDataUnsafe?.user)) {
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
    if (tg.isVersionAtLeast?.('7.10')) tg.setBottomBarColor?.('#262338');
    // Во весь экран, как у Portals: шапка Telegram пропадает, остаются его кнопки поверх игры (Bot API 8.0+).
    // На компьютере полный экран не нужен — там Mini App открывается окном.
    const mobile = tg.platform === 'ios' || tg.platform === 'android';
    if (mobile && tg.isVersionAtLeast?.('8.0') && !tg.isFullscreen) tg.requestFullscreen?.();
  } catch {
    // старый клиент
  }

  // Если initData пустой — соберём его из initDataUnsafe
  let initData = tg.initData;
  if (!initData && tg.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    initData = `id=${u.id}&first_name=${encodeURIComponent(u.first_name || '')}` +
      (u.last_name ? `&last_name=${encodeURIComponent(u.last_name)}` : '') +
      (u.username ? `&username=${encodeURIComponent(u.username)}` : '') +
      `&language_code=${encodeURIComponent(u.language_code || 'en')}`;
  }

  return {
    insideTelegram: true,
    user: tg.initDataUnsafe.user,
    initData,
    platform: tg.platform,
  };
}
