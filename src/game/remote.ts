// Прогресс и рейтинг в Supabase. Браузер вызывает только функции базы (RPC) с publishable-ключом;
// каждая функция сама проверяет подпись Telegram initData, поэтому записать можно только своё сохранение.
// Нет сети или Supabase недоступен — игра продолжает работать на локальном и облачном сохранении Telegram.

import { normalize, progressScore, type GameState } from './state';

const URL = 'https://fytodyhctsidtqssolds.supabase.co';
// publishable-ключ можно показывать в браузере: доступ к данным закрыт, открыты только три функции
const KEY = 'sb_publishable_-HRsQ-R3KSI_66rWSBi2RA_o4S7Aek8';

let initData = '';

export function setRemoteAuth(data: string): void {
  initData = data;
}

export function remoteAvailable(): boolean {
  return initData.length > 0;
}

async function rpc<T>(fn: string, body: Record<string, unknown>, timeoutMs = 8000, keepalive = false): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: initData, ...body }),
      signal: ctrl.signal,
      keepalive,
    });
    if (!res.ok) throw new Error(`${fn}: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Сохранение с сервера; null — его нет или сервер недоступен (тогда `failed`). */
export async function loadRemote(): Promise<{ state: GameState | null; saveCreatedAt: number; failed: boolean }> {
  if (!remoteAvailable()) return { state: null, saveCreatedAt: 0, failed: true };
  try {
    const raw = await rpc<{ state: unknown; save_created_at: number }>('load_progress', {});
    if (!raw || !raw.state) return { state: null, saveCreatedAt: 0, failed: false };
    return { state: normalize(raw.state), saveCreatedAt: raw.save_created_at, failed: false };
  } catch {
    return { state: null, saveCreatedAt: 0, failed: true };
  }
}

let saving = false;

/** Записать прогресс. force — после сброса, иначе сервер не примет сохранение «отсталее» своего. */
export async function saveRemote(s: GameState, force = false, keepalive = false): Promise<boolean> {
  if (!remoteAvailable() || (saving && !force)) return false;
  saving = true;
  try {
    s.lastSeen = Date.now();
    return await rpc<boolean>(
      'save_progress',
      {
        state: s,
        company_no: s.company,
        lifetime: Number.isFinite(s.totalEarned) ? s.totalEarned : 0,
        score: progressScore(s),
        save_created_at: Math.floor(s.createdAt),
        force,
      },
      8000,
      keepalive,
    );
  } catch {
    return false;
  } finally {
    saving = false;
  }
}

export interface RatingRow {
  place: number;
  name: string;
  company: number;
  lifetime: number;
  me: boolean;
}

export async function loadLeaderboard(limit = 100): Promise<{ top: RatingRow[]; me: RatingRow | null }> {
  return rpc('leaderboard', { p_limit: limit });
}
