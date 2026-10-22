// Режим отладки (?debug): заметки, доступ из консоли и 999Qa монет на старте.
// В нём НИЧЕГО не сохраняется — ни на устройстве, ни в Telegram CloudStorage, ни в Supabase:
// иначе отладочные деньги попали бы в настоящий прогресс и в рейтинг. Проверка стоит в самих функциях записи
// (save.ts, remote.ts), поэтому обойти её случайно нельзя.

export const DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

/** Сколько монет добавить в режиме отладки: 999Qa. */
export const DEBUG_COINS = 999e15;
