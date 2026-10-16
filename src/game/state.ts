// Состояние игры и сохранение в браузере (localStorage).
// Сохранение в Telegram CloudStorage добавится на этапе 5.

export const DEPTS = 5;
export const DESKS = 6;
const SAVE_KEY = 'it-office.save.v1';

export interface GameState {
  v: 1;
  coins: number;
  /** Заработано за всё время текущего забега (для Грантов). */
  lifetime: number;
  /** levels[отдел][место]: 0 — место пустое, 1+ — уровень сотрудника. */
  levels: number[][];
  savedAt: number;
}

export function newState(): GameState {
  const levels = Array.from({ length: DEPTS }, () => Array<number>(DESKS).fill(0));
  levels[0][0] = 1; // в начале игры: один стол и один сотрудник поддержки
  return { v: 1, coins: 0, lifetime: 0, levels, savedAt: Date.now() };
}

function isValid(s: unknown): s is GameState {
  if (typeof s !== 'object' || s === null) return false;
  const g = s as Partial<GameState>;
  return (
    g.v === 1 &&
    typeof g.coins === 'number' &&
    Number.isFinite(g.coins) &&
    typeof g.lifetime === 'number' &&
    Array.isArray(g.levels) &&
    g.levels.length === DEPTS &&
    g.levels.every((row) => Array.isArray(row) && row.length === DESKS && row.every((l) => Number.isInteger(l) && l >= 0))
  );
}

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return newState();
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : newState();
  } catch {
    return newState();
  }
}

export function saveState(state: GameState): void {
  try {
    state.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // приватный режим или запрет хранилища — игра продолжает работать без сохранения
  }
}

export function resetSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ничего
  }
}
