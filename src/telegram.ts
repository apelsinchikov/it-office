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
  /** Bot API 8.0+: false, когда Mini App свёрнуто или закрыто другой вкладкой Telegram. */
  isActive?: boolean;
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
  /** Live-объект от Telegram SDK. Обновляется асинхронно, не снимок. */
  initDataUnsafe: { user?: TgUser };
  platform: string;
}

/** Telegram сменил полный экран или отступы под свои кнопки — пересчитать раскладку. */
export function onTelegramLayout(cb: () => void): void {
  const tg = window.Telegram?.WebApp;
  if (!tg?.onEvent) return;
  for (const ev of ['fullscreenChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'viewportChanged']) tg.onEvent(ev, cb);
}

/**
 * Свёрнуто ли Mini App (Bot API 8.0+: события activated / deactivated).
 * Свёрнутое приложение остаётся «видимым» для браузера, поэтому visibilitychange тут не помогает.
 */
export function onTelegramActive(cb: (active: boolean) => void): void {
  const tg = window.Telegram?.WebApp;
  if (!tg?.onEvent) return;
  tg.onEvent('activated', () => cb(true));
  tg.onEvent('deactivated', () => cb(false));
}

/**
 * Подписаться на получение initData от Telegram SDK.
 * На некоторых клиентах (особенно iOS) initDataUnsafe не заполняется синхронно —
 * SDK отправляет событие initDataUpdated, когда данные станут доступны.
 */
export function subscribeInitData(cb: (user: TgUser) => void): void {
  const tg = window.Telegram?.WebApp;
  if (!tg?.onEvent) return;
  // initDataUpdated — стандартное событие Telegram Bot API 7.2+
  // Срабатывает, когда initData/initDataUnsafe заполнены.
  tg.onEvent('initDataUpdated', () => {
    const user = tg?.initDataUnsafe?.user;
    if (user) cb(user);
  });
}

/**
 * Подождать появления tg.initDataUnsafe.user с таймаутом.
 * На десктопе Telegram SDK может подгрузить user через 100-500мс.
 * Если initDataUpdated не сработал — fallback на polling.
 */
export async function waitForUser(
  tg: TelegramInfo,
  timeout = 3000,
): Promise<TgUser | undefined> {
  if (tg.initDataUnsafe?.user) return tg.initDataUnsafe.user;

  return new Promise((resolve) => {
    const start = Date.now();

    // Подписываемся на событие от Telegram SDK — сработает, когда initData появится
    const unsubscribe = () => {
      resolve(user);
      pollingDone = true;
    };

    let user = tg.initDataUnsafe?.user;
    let pollingDone = false;

    if (user) return resolve(user);

    // Основной путь: событие initDataUpdated
    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp?.onEvent) {
      tgWebApp.onEvent('initDataUpdated', () => {
        const u = tgWebApp.initDataUnsafe?.user;
        if (u && !pollingDone) unsubscribe();
      });
    }

    // Fallback: polling каждые 500мс — на случай если событие не придёт
    const check = () => {
      if (pollingDone) return;
      const u = tg.initDataUnsafe?.user;
      if (u) {
        user = u;
        resolve(u);
        pollingDone = true;
      } else if (Date.now() - start > timeout) {
        resolve(undefined);
        pollingDone = true;
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

export function initTelegram(): TelegramInfo {
  const tg = window.Telegram?.WebApp;
  // Вне Telegram SDK тоже загружается, но tg не определён.
  // В Telegram Desktop initData может быть пустым, но tg.platform определён.
  if (!tg) {
    return { insideTelegram: false, initData: '', initDataUnsafe: {}, platform: 'browser' };
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

  // Извлечём telegram_id: сначала из initDataUnsafe, потом из initData (парсинг id=...)
  let user = tg.initDataUnsafe.user;
  if (!user && initData) {
    try {
      const params = new URLSearchParams(initData);
      const id = parseInt(params.get('id') || '0', 10);
      if (id > 0) {
        user = {
          id,
          first_name: params.get('first_name') || '',
          last_name: params.get('last_name') || undefined,
          username: params.get('username') || undefined,
          language_code: params.get('language_code') || undefined,
        };
      }
    } catch {
      // ignore
    }
  }

  return {
    insideTelegram: true,
    user,
    initData,
    initDataUnsafe: tg.initDataUnsafe,
    platform: tg.platform,
  };
}
