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
}

export function remoteAvailable(): boolean {
  return telegram_id > 0;
}

async function postProgress(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, ...body }),
  });
  if (!res.ok) throw new Error(`progress: ${res.status}`);
  return res.json();
}

/** Сохранение с сервера; null — его нет или сервер недоступен (тогда `failed`). */
export async function loadRemote(): Promise<{ state: GameState | null; saveCreatedAt: number; failed: boolean }> {
  if (!remoteAvailable()) return { state: null, saveCreatedAt: 0, failed: true };
  try {
    const raw = await postProgress({ action: 'load' });
    if (!raw || typeof raw !== 'object') return { state: null, saveCreatedAt: 0, failed: false };
    const r = raw as { state: unknown; save_created_at: number };
    if (!r.state) return { state: null, saveCreatedAt: 0, failed: false };
    return { state: normalize(r.state), saveCreatedAt: r.save_created_at, failed: false };
  } catch {
    return { state: null, saveCreatedAt: 0, failed: true };
  }
}

let saving = false;

/** Блокируем запись на сервер при активном чит-режиме (только localhost). */
function _isCheatActive(): boolean {
  if (!location.search.includes('cheat')) return false;
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.startsWith('127.');
}

/** Записать прогресс. force — после сброса, иначе сервер не примет сохранение «отсталее» своего. */
export async function saveRemote(s: GameState, force = false): Promise<boolean> {
  if (!remoteAvailable() || (saving && !force) || _isCheatActive()) return false;
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
    return !!r?.success;
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
  companyProgress: number;
  companyReorgs: number;
  lifetime: number;
  me: boolean;
}

export async function loadLeaderboard(limit = 100): Promise<{ top: RatingRow[]; me: RatingRow | null }> {
  const r = await postProgress({ action: 'leaderboard', p_limit: limit });
  if (!r || typeof r !== 'object') return { top: [], me: null };
  const data = r as { top: RatingRow[]; me: RatingRow | null };
  return { top: data.top || [], me: data.me || null };
}
