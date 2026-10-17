// Сохранение: на устройстве (localStorage) и в Telegram CloudStorage — без своего сервера.
// CloudStorage хранит строки до 4096 символов, поэтому сохранение режется на части.

import { newState, normalize, progressScore, type GameState } from './state';

const KEY = 'it-office.save.v2';
const OLD_KEY = 'it-office.save.v1';
const CHUNK = 3800;
const META = 'save_meta';

export function loadLocal(now = Date.now()): GameState {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (!raw) return newState(now);
    return normalize(JSON.parse(raw), now) ?? newState(now);
  } catch {
    return newState(now);
  }
}

export function saveLocal(s: GameState): void {
  try {
    s.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // приватный режим — играем без сохранения
  }
}

export function clearLocal(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(OLD_KEY);
  } catch {
    // ничего
  }
}

interface CloudStorage {
  setItem(key: string, value: string, cb?: (err: string | null, ok?: boolean) => void): void;
  getItem(key: string, cb: (err: string | null, value?: string) => void): void;
  getItems(keys: string[], cb: (err: string | null, values?: Record<string, string>) => void): void;
  removeItems(keys: string[], cb?: (err: string | null, ok?: boolean) => void): void;
}

function cloud(): CloudStorage | null {
  const wa = (window as unknown as { Telegram?: { WebApp?: { CloudStorage?: CloudStorage; isVersionAtLeast?: (v: string) => boolean; initData?: string } } })
    .Telegram?.WebApp;
  if (!wa?.initData || !wa.CloudStorage) return null;
  if (wa.isVersionAtLeast && !wa.isVersionAtLeast('6.9')) return null;
  return wa.CloudStorage;
}

export function cloudAvailable(): boolean {
  return cloud() !== null;
}

function setItem(cs: CloudStorage, k: string, v: string): Promise<boolean> {
  return new Promise((res) => {
    try {
      cs.setItem(k, v, (err) => res(!err));
    } catch {
      res(false);
    }
  });
}

let saving = false;

export async function saveCloud(s: GameState): Promise<boolean> {
  const cs = cloud();
  if (!cs || saving) return false;
  saving = true;
  try {
    const json = JSON.stringify(s);
    const parts: string[] = [];
    for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
    for (let i = 0; i < parts.length; i++) if (!(await setItem(cs, `save_${i}`, parts[i]))) return false;
    return await setItem(cs, META, JSON.stringify({ n: parts.length, score: progressScore(s), at: Date.now() }));
  } finally {
    saving = false;
  }
}

export function loadCloud(): Promise<GameState | null> {
  const cs = cloud();
  if (!cs) return Promise.resolve(null);
  return new Promise((res) => {
    try {
      cs.getItem(META, (err, value) => {
        if (err || !value) return res(null);
        let n = 0;
        try {
          n = Number(JSON.parse(value).n) || 0;
        } catch {
          return res(null);
        }
        if (n <= 0 || n > 200) return res(null);
        const keys = Array.from({ length: n }, (_, i) => `save_${i}`);
        cs.getItems(keys, (e2, values) => {
          if (e2 || !values) return res(null);
          try {
            const json = keys.map((k) => values[k] ?? '').join('');
            res(normalize(JSON.parse(json)));
          } catch {
            res(null);
          }
        });
      });
    } catch {
      res(null);
    }
  });
}

export function clearCloud(): void {
  const cs = cloud();
  if (!cs) return;
  try {
    cs.getItem(META, (err, value) => {
      const n = !err && value ? Number(JSON.parse(value).n) || 0 : 0;
      cs.removeItems([META, ...Array.from({ length: n }, (_, i) => `save_${i}`)]);
    });
  } catch {
    // ничего
  }
}

/** Из двух сохранений выбираем то, где игрок продвинулся дальше. */
export function better(a: GameState, b: GameState | null): GameState {
  if (!b) return a;
  return progressScore(b) > progressScore(a) + 1e-6 ? b : a;
}
