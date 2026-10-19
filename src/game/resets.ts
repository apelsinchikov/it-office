// Сброс прогресса отдельных игроков без сервера: список лежит в public/resets.json на GitHub Pages.
// Игрок узнаётся по хешу ника или id из Telegram, поэтому в открытом репозитории нет самих ников.
// Прогресс, начатый раньше `before`, стирается при следующем входе один раз: новое сохранение уже моложе.

export interface ResetRule {
  h: string;
  before: string;
}

export interface TgIdentity {
  id?: number;
  username?: string;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Ключи игрока: по нику и по id. */
export async function identityHashes(user: TgIdentity | undefined): Promise<string[]> {
  if (!user) return [];
  const keys: string[] = [];
  if (user.username) keys.push(`u:${user.username.toLowerCase()}`);
  if (user.id) keys.push(`id:${user.id}`);
  return Promise.all(keys.map((k) => sha256(`it-office:${k}`)));
}

/** Самая поздняя отметка сброса для этого игрока (мс) или 0. */
export function resetBefore(rules: ResetRule[], hashes: string[]): number {
  let at = 0;
  for (const r of rules) {
    if (!hashes.includes(r.h)) continue;
    const t = Date.parse(r.before);
    if (Number.isFinite(t)) at = Math.max(at, t);
  }
  return at;
}

/** Скачать список и найти отметку для текущего игрока. Нет сети или файла — 0, игра идёт как обычно. */
export async function fetchResetBefore(user: TgIdentity | undefined, url: string, timeoutMs = 3000): Promise<number> {
  try {
    const hashes = await identityHashes(user);
    if (!hashes.length) return 0;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return 0;
    const data = (await res.json()) as { resets?: ResetRule[] };
    return resetBefore(Array.isArray(data.resets) ? data.resets : [], hashes);
  } catch {
    return 0;
  }
}
