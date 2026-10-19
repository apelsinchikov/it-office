// Прогресс и рейтинг через Supabase Edge Function.
// Edge Function принимает telegram_id напрямую — не нужна проверка HMAC initData.
// Работает и на мобильных, и на десктопных Telegram.
// Нет сети или Supabase недоступен — игра продолжает работать на локальном и облачном сохранении Telegram.

import { normalize, progressScore, type GameState } from './state';

const URL = 'https://fytodyhctsidtqssolds.supabase.co';
const FUNCTION_URL = `${URL}/functions/v1/progress`;

let telegram_id = 0;

export function setRemoteAuth(data: { init_data: string; telegram_id: number }): void {
  telegram_id = data.telegram_id;
  console.log('[remote] telegram_id =', telegram_id);
}

export function remoteAvailable(): boolean {
  const available = telegram_id > 0;
  console.log('[remote] available =', available);
  return available;
}

async function postProgress(body: Record<string, unknown>): Promise<unknown> {
  console.log('[remote] calling', FUNCTION_URL, 'with telegram_id =', telegram_id);
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, ...body }),
  });
  console.log('[remote] response status =', res.status);
  if (!res.ok) throw new Error(`progress: ${res.status}`);
  return res.json();
}

/** Сохранение с сервера; null — его нет или сервер недоступен (тогда `failed`). */
export async function loadRemote(): Promise<{ state: GameState | null; saveCreatedAt: number; failed: boolean }> {
  if (!remoteAvailable()) return { state: null, saveCreatedAt: 0, failed: true };
  try {
    console.log('[remote] calling loadRemote...');
    const raw = await postProgress({ action: 'load' });
    console.log('[remote] loadRemote raw =', JSON.stringify(raw).substring(0, 100));
    if (!raw || typeof raw !== 'object') return { state: null, saveCreatedAt: 0, failed: false };
    const r = raw as { state: unknown; save_created_at: number };
    if (!r.state) return { state: null, saveCreatedAt: 0, failed: false };
    return { state: normalize(r.state), saveCreatedAt: r.save_created_at, failed: false };
  } catch (e) {
    console.error('[remote] loadRemote error:', e);
    return { state: null, saveCreatedAt: 0, failed: true };
  }
}

let saving = false;

/** Записать прогресс. force — после сброса, иначе сервер не примет сохранение «отсталее» своего. */
export async function saveRemote(s: GameState, force = false): Promise<boolean> {
  if (!remoteAvailable() || (saving && !force)) return false;
  saving = true;
  try {
    s.lastSeen = Date.now();
    const r = await postProgress({
      action: 'save',
      state: s,
      company_no: s.company,
      lifetime: Number.isFinite(s.totalEarned) ? s.totalEarned : 0,
      score: progressScore(s),
      save_created_at: Math.floor(s.createdAt),
      force,
    }) as { success: boolean };
    console.log('[remote] saveRemote result =', r);
    return !!r?.success;
  } catch (e) {
    console.error('[remote] saveRemote error:', e);
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
  console.log('[remote] calling loadLeaderboard...');
  const r = await postProgress({ action: 'leaderboard', p_limit: limit });
  console.log('[remote] leaderboard result =', JSON.stringify(r).substring(0, 200));
  if (!r || typeof r !== 'object') return { top: [], me: null };
  const data = r as { top: RatingRow[]; me: RatingRow | null };
  return { top: data.top || [], me: data.me || null };
}
