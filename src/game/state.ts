// Состояние игры. Всё, что нужно сохранить, лежит здесь; Game только читает и меняет его.

import { DEPTS, DEPT_COUNT, DESKS } from './config';

export { DEPT_COUNT as DEPTS_N, DESKS } from './config';

export interface Stats {
  tickets: number;
  avrals: number;
  levelsBought: number;
  hires: number;
  furnBought: number;
  restBought: number;
  reorgs: number;
  earned: number;
}

export interface DailyQuest {
  id: string;
  target: number;
  base: number;
  claimed: boolean;
}

export interface QuestState {
  dailyDate: string;
  daily: DailyQuest[];
  /** Индекс текущего задания в цепочке. */
  chain: number;
  /** Долгие задания, за которые уже выдана награда. */
  longClaimed: string[];
}

export interface Settings {
  sound: boolean;
  lang: 'ru' | 'en' | null;
}

export interface RunState {
  coins: number;
  /** Заработано за текущий забег — от него считаются Гранты. */
  earned: number;
  levels: number[][];
  depts: boolean[];
  managers: boolean[];
  /** furn[отдел][место][предмет] — уровень предмета 0..3. */
  furn: number[][][];
  /** singles[отдел][место][украшение] — куплено ли. */
  singles: boolean[][][];
  rest: { coffee: number; fridge: number; games: number };
}

export interface GameState {
  v: 2;
  company: number;
  run: RunState;
  grants: number;
  grantsEarned: number;
  /** Гранты, полученные в текущей компании, — с ними сравнивается подсказка «выгодно». */
  companyGrants: number;
  /** Уровни «Корпоративной культуры», купленные в текущей компании: от них считается цена. */
  companyCulture: number;
  /** Множитель культуры, накопленный в прошлых компаниях (произведение их бонусов). */
  cultureBank: number;
  reorgs: number;
  totalEarned: number;
  shop: Record<string, number>;
  directorDesk: number;
  lastSeen: number;
  stats: Stats;
  quests: QuestState;
  achievements: string[];
  phrasesSeen: string[];
  bonusPhrases: number;
  settings: Settings;
  tutorialDone: boolean;
  createdAt: number;
}

function grid<T>(fill: () => T): T[][] {
  return Array.from({ length: DEPT_COUNT }, () => Array.from({ length: DESKS }, fill));
}

export function newRun(startCoins = 0): RunState {
  const levels = grid(() => 0);
  levels[0][0] = 1; // в начале: один стол и один сотрудник поддержки
  return {
    coins: startCoins,
    earned: 0,
    levels,
    depts: DEPTS.map((_, d) => d === 0),
    managers: DEPTS.map(() => false),
    furn: DEPTS.map((def) => Array.from({ length: DESKS }, () => def.items.map(() => 0))),
    singles: DEPTS.map((def) => Array.from({ length: DESKS }, () => def.singles.map(() => false))),
    rest: { coffee: 0, fridge: 0, games: 0 },
  };
}

export function newStats(): Stats {
  return { tickets: 0, avrals: 0, levelsBought: 0, hires: 0, furnBought: 0, restBought: 0, reorgs: 0, earned: 0 };
}

export function newState(now = Date.now()): GameState {
  return {
    v: 2,
    company: 1,
    run: newRun(),
    grants: 0,
    grantsEarned: 0,
    companyGrants: 0,
    companyCulture: 0,
    cultureBank: 1,
    reorgs: 0,
    totalEarned: 0,
    shop: {},
    directorDesk: 0,
    lastSeen: now,
    stats: newStats(),
    quests: { dailyDate: '', daily: [], chain: 0, longClaimed: [] },
    achievements: [],
    phrasesSeen: [],
    bonusPhrases: 0,
    settings: { sound: true, lang: null },
    tutorialDone: false,
    createdAt: now,
  };
}

const num = (x: unknown, d = 0): number => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/**
 * Приводит загруженный объект к текущей схеме: недостающее берётся из нового состояния,
 * сохранение v1 (этап 1) переносится. Неподходящее — новая игра.
 */
export function normalize(raw: unknown, now = Date.now()): GameState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const base = newState(now);

  if (r.v === 1) {
    // этап 1: только монеты и уровни
    const levels = r.levels as number[][] | undefined;
    if (Array.isArray(levels) && Array.isArray(levels[0])) {
      base.run.levels[0] = base.run.levels[0].map((_, k) => Math.max(0, Math.floor(num(levels[0][k]))));
      if (base.run.levels[0][0] < 1) base.run.levels[0][0] = 1;
    }
    base.run.coins = num(r.coins);
    base.run.earned = num(r.lifetime);
    base.totalEarned = base.run.earned;
    base.lastSeen = num(r.savedAt, now);
    return base;
  }
  if (r.v !== 2) return null;

  const s = r as unknown as Partial<GameState>;
  const out: GameState = { ...base, ...s, v: 2 } as GameState;
  const run = (s.run ?? {}) as Partial<RunState>;
  const br = base.run;
  out.run = {
    coins: num(run.coins),
    earned: num(run.earned),
    levels: br.levels.map((row, d) => row.map((v, k) => Math.max(0, Math.floor(num(run.levels?.[d]?.[k], v))))),
    depts: br.depts.map((v, d) => (d === 0 ? true : Boolean(run.depts?.[d] ?? v))),
    managers: br.managers.map((v, d) => Boolean(run.managers?.[d] ?? v)),
    furn: br.furn.map((desks, d) =>
      desks.map((items, k) => items.map((v, i) => Math.min(3, Math.max(0, Math.floor(num(run.furn?.[d]?.[k]?.[i], v)))))),
    ),
    singles: br.singles.map((desks, d) => desks.map((items, k) => items.map((v, i) => Boolean(run.singles?.[d]?.[k]?.[i] ?? v)))),
    rest: {
      coffee: Math.min(3, Math.max(0, Math.floor(num(run.rest?.coffee)))),
      fridge: Math.min(3, Math.max(0, Math.floor(num(run.rest?.fridge)))),
      games: Math.min(10, Math.max(0, Math.floor(num(run.rest?.games)))),
    },
  };
  if (out.run.levels[0][0] < 1) out.run.levels[0][0] = 1;
  out.company = Math.max(1, Math.floor(num(s.company, 1)));
  out.grants = num(s.grants);
  out.grantsEarned = num(s.grantsEarned);
  out.companyGrants = num(s.companyGrants, out.company === 1 ? out.grantsEarned : 0);
  out.companyCulture = num(s.companyCulture, out.company === 1 ? num(out.shop.culture) : 0);
  out.cultureBank = Math.max(1, num(s.cultureBank, 1));
  out.reorgs = Math.max(0, Math.floor(num(s.reorgs)));
  out.totalEarned = num(s.totalEarned);
  out.shop = typeof s.shop === 'object' && s.shop ? { ...s.shop } : {};
  out.stats = { ...base.stats, ...(s.stats ?? {}) };
  out.quests = { ...base.quests, ...(s.quests ?? {}) };
  out.achievements = Array.isArray(s.achievements) ? s.achievements.filter((x) => typeof x === 'string') : [];
  out.phrasesSeen = Array.isArray(s.phrasesSeen) ? s.phrasesSeen.filter((x) => typeof x === 'string') : [];
  out.settings = { ...base.settings, ...(s.settings ?? {}) };
  out.lastSeen = num(s.lastSeen, now);
  out.createdAt = num(s.createdAt, now);
  return out;
}

/** Чем больше, тем дальше продвинулся игрок — для выбора между двумя сохранениями. */
export function progressScore(s: GameState): number {
  return s.company * 1e6 + s.reorgs * 1e3 + Math.log10(1 + s.totalEarned);
}
