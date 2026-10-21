// Состояние игры. Всё, что нужно сохранить, лежит здесь; Game только читает и меняет его.

import { DEPTS, DEPT_COUNT, DESKS } from './config';
import { newDirector, type DirectorState } from './director';

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
  /** Открыты ли кабинет директора, зона отдыха и туалет. */
  rooms: { director: boolean; rest: boolean; toilet: boolean };
  /** Уровни открытых кабинок туалета: 0 = закрыта, 1 = открыта. Длина 4, порядок слева направо. */
  toilet: number[];
  /** Кабинет директора: уровни стола, стула, монитора, клавиатуры (0..3) и украшения. */
  dir: DirFurn;
}

export interface DirFurn {
  desk: number;
  chair: number;
  monitor: number;
  keyboard: number;
  flower: boolean;
  picture: boolean;
  carpet: boolean;
}

export function newDirFurn(): DirFurn {
  return { desk: 0, chair: 0, monitor: 0, keyboard: 0, flower: false, picture: false, carpet: false };
}

export interface GameState {
  v: 3;
  company: number;
  run: RunState;
  grants: number;
  grantsEarned: number;
  /** Гранты, полученные в текущей компании, — с ними сравнивается подсказка «выгодно». */
  companyGrants: number;
  /** Количество реорганизаций в текущей компании. */
  companyReorgs: number;
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
  director: DirectorState;
}

function grid<T>(fill: () => T): T[][] {
  return Array.from({ length: DEPT_COUNT }, () => Array.from({ length: DESKS }, fill));
}

export function newRun(startCoins = 0): RunState {
  const levels = grid(() => 0);
  levels[0][0] = 1; // в начале: один сисадмин
  return {
    coins: startCoins,
    earned: 0,
    levels,
    depts: DEPTS.map((_, d) => d === 0),
    managers: DEPTS.map(() => false),
    furn: DEPTS.map((def) => Array.from({ length: DESKS }, () => def.items.map(() => 0))),
    singles: DEPTS.map((def) => Array.from({ length: DESKS }, () => def.singles.map(() => false))),
    rest: { coffee: 0, fridge: 0, games: 0 },
    rooms: { director: false, rest: false, toilet: false },
    toilet: [0, 0, 0, 0],
    dir: newDirFurn(),
  };
}

export function newStats(): Stats {
  return { tickets: 0, avrals: 0, levelsBought: 0, hires: 0, furnBought: 0, restBought: 0, reorgs: 0, earned: 0 };
}

export function newState(now = Date.now()): GameState {
  return {
    v: 3,
    company: 1,
    run: newRun(),
    grants: 0,
    grantsEarned: 0,
    companyGrants: 0,
    companyReorgs: 0,
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
    director: newDirector(),
  };
}

/** До 19.10 отделы шли поддержка, разработка, тестирование, аналитики, сисадмины; новый номер по старому. */
const OLD_TO_NEW = [1, 3, 4, 2, 0];

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
    // этап 1: только монеты; отделы с тех пор переставлены, поэтому начинаем офис заново
    base.run.coins = num(r.coins);
    base.totalEarned = num(r.lifetime);
    base.lastSeen = num(r.savedAt, now);
    base.createdAt = 0;
    return base;
  }
  if (r.v !== 2 && r.v !== 3) return null;

  const s = r as unknown as Partial<GameState>;
  const out: GameState = { ...base, ...s, v: 3 } as GameState;
  // v2: другой порядок отделов и другая экономика — текущий офис начинается заново,
  // а Гранты, улучшения, достижения, фразы и задания остаются.
  const fromV2 = r.v === 2;
  const run = (fromV2 ? {} : (s.run ?? {})) as Partial<RunState>;
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
    rooms: {
      director: Boolean(run.rooms?.director),
      rest: Boolean(run.rooms?.rest),
      toilet: Boolean(run.rooms?.toilet),
    },
    toilet: run.toilet
      ? (run.toilet as number[]).slice()
      : run.rooms?.toilet ? [1, 0, 0, 0] : [0, 0, 0, 0],
    dir: {
      desk: Math.min(3, Math.max(0, Math.floor(num(run.dir?.desk)))),
      chair: Math.min(3, Math.max(0, Math.floor(num(run.dir?.chair)))),
      monitor: Math.min(3, Math.max(0, Math.floor(num(run.dir?.monitor)))),
      keyboard: Math.min(3, Math.max(0, Math.floor(num(run.dir?.keyboard)))),
      flower: Boolean(run.dir?.flower),
      picture: Boolean(run.dir?.picture),
      carpet: Boolean(run.dir?.carpet),
    },
  };
  if (out.run.levels[0][0] < 1) out.run.levels[0][0] = 1;
  out.company = Math.max(1, Math.floor(num(s.company, 1)));
  out.grants = num(s.grants);
  out.grantsEarned = num(s.grantsEarned);
  out.companyGrants = num(s.companyGrants, out.company === 1 ? out.grantsEarned : 0);
  out.companyReorgs = Math.max(0, Math.floor(num(s.companyReorgs)));
  out.companyCulture = num(s.companyCulture, out.company === 1 ? num(out.shop.culture) : 0);
  out.cultureBank = Math.max(1, num(s.cultureBank, 1));
  out.reorgs = Math.max(0, Math.floor(num(s.reorgs)));
  out.totalEarned = num(s.totalEarned);
  out.shop = typeof s.shop === 'object' && s.shop ? { ...s.shop } : {};
  if (fromV2) {
    // улучшения отделов за Гранты переезжают вместе с отделами
    const shop: Record<string, number> = {};
    for (const [k, v] of Object.entries(out.shop)) {
      const m = /^(speed|income)(\d)$/.exec(k);
      shop[m ? `${m[1]}${OLD_TO_NEW[Number(m[2])]}` : k] = v;
    }
    out.shop = shop;
    out.directorDesk = 0;
  }
  const dir = (s.director ?? {}) as Partial<DirectorState>;
  out.director = {
    task: dir.task && typeof dir.task === 'object' ? dir.task : null,
    nextOfferAt: num(dir.nextOfferAt),
    inventory: typeof dir.inventory === 'object' && dir.inventory ? { ...dir.inventory } : {},
    active: Array.isArray(dir.active) ? dir.active.filter((a) => a && typeof a.left === 'number') : [],
    done: num(dir.done),
  };
  out.stats = { ...base.stats, ...(s.stats ?? {}) };
  out.quests = { ...base.quests, ...(s.quests ?? {}) };
  out.achievements = Array.isArray(s.achievements) ? s.achievements.filter((x) => typeof x === 'string') : [];
  out.phrasesSeen = Array.isArray(s.phrasesSeen) ? s.phrasesSeen.filter((x) => typeof x === 'string') : [];
  out.settings = { ...base.settings, ...(s.settings ?? {}) };
  out.lastSeen = num(s.lastSeen, now);
  // нет даты — считаем сохранение старым (важно для сброса по списку public/resets.json)
  out.createdAt = num(s.createdAt, 0);
  return out;
}

/** Чем больше, тем дальше продвинулся игрок — для выбора между двумя сохранениями. */
export function progressScore(s: GameState): number {
  return s.company * 1e6 + s.reorgs * 1e3 + Math.log10(1 + s.totalEarned);
}
