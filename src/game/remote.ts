// Прогресс и рейтинг через Supabase Edge Function `progress`.
// Вместе с telegram_id отправляем подписанную строку Telegram (initData): сервер проверяет подпись
// и записывает итог (мягкий режим — пока только записывает, не блокирует). Имя для рейтинга берётся из подписи,
// а если её нет — из данных Telegram на устройстве.
// Нет сети или Supabase недоступен — игра продолжает работать на локальном и облачном сохранении Telegram.

import { completionFromState, normalize, progressScore, type GameState } from './state';

const URL = 'https://fytodyhctsidtqssolds.supabase.co';
const FUNCTION_URL = `${URL}/functions/v1/progress`;

let telegram_id = 0;

export function setRemoteAuth(data: { init_data: string; telegram_id: number }): void {
  telegram_id = data.telegram_id;
}

export function remoteAvailable(): boolean {
  return telegram_id > 0;
}

/** Данные Telegram для сервера. Читаем при каждом запросе: на некоторых клиентах они приходят не сразу. */
function telegramFields(): Record<string, unknown> {
  const wa = window.Telegram?.WebApp;
  // именно исходная строка Telegram: только в ней есть подпись hash
  const u = wa?.initDataUnsafe?.user;
  return {
    init_data: wa?.initData ?? '',
    platform: wa?.platform ?? '',
    first_name: u?.first_name ?? '',
    last_name: u?.last_name ?? '',
    username: u?.username ?? '',
  };
}

async function postProgress(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id, ...telegramFields(), ...body }),
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

/** Процент компании для рейтинга (0–100) — всегда считаем здесь из самого сохранения, чтобы не перепутать долю и проценты. */
function companyPercent(s: GameState): number {
  return Math.max(0, Math.min(100, Math.floor(completionFromState(s.run) * 100)));
}

/**
 * Реорганизации в текущей компании для рейтинга. Счётчик companyReorgs появился позже самих реорганизаций,
 * поэтому в первой компании берём общий счётчик reorgs (там они совпадают). Само сохранение не меняем.
 */
function companyReorgCount(s: GameState): number {
  return s.company === 1 ? Math.max(s.reorgs, s.companyReorgs) : s.companyReorgs;
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
      company_progress: companyPercent(s),
      company_reorgs: companyReorgCount(s),
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
