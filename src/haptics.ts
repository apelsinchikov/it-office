// Вибрация через Telegram (HapticFeedback, Bot API 6.1+). Вне Telegram и на компьютере просто ничего не делает.

export type Haptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

let enabled = true;

export function setHaptics(on: boolean): void {
  enabled = on;
}

export function haptic(kind: Haptic): void {
  if (!enabled) return;
  const wa = window.Telegram?.WebApp;
  const hf = wa?.HapticFeedback;
  if (!hf || (wa?.isVersionAtLeast && !wa.isVersionAtLeast('6.1'))) return;
  try {
    if (kind === 'success' || kind === 'warning' || kind === 'error') hf.notificationOccurred(kind);
    else hf.impactOccurred(kind);
  } catch {
    // старый клиент
  }
}
