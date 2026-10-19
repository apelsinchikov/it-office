// Задания директора IT и перки. Директор (когда его кабинет открыт) раз в несколько минут
// предлагает задание на время. За выполнение — перк в инвентарь; перк даёт временное усиление.
// За невыполнение ничего не бывает: задание просто пропадает, через пару минут будет новое.

import type { Game } from './game';
import type { Stats } from './state';

export type Tier = 0 | 1 | 2;
export type TaskKind = 'levels' | 'furn' | 'tickets' | 'avral' | 'hires' | 'earn';
export type PerkKind = 'speed' | 'income' | 'tickets' | 'cash';

export interface DirTask {
  kind: TaskKind;
  tier: Tier;
  target: number;
  /** Значение счётчика в момент принятия. */
  base: number;
  /** Длительность, секунды. */
  duration: number;
  /** Реальное время конца (мс), 0 — ещё не принято. */
  endsAt: number;
}

export interface ActivePerk {
  kind: PerkKind;
  tier: Tier;
  /** Сколько секунд игры ещё действует. */
  left: number;
}

export interface DirectorState {
  /** Предложенное или принятое задание. */
  task: DirTask | null;
  /** Когда предложить следующее (мс). */
  nextOfferAt: number;
  /** Инвентарь: ключ `${perk}:${tier}` → количество. */
  inventory: Record<string, number>;
  active: ActivePerk[];
  done: number;
}

export function newDirector(): DirectorState {
  return { task: null, nextOfferAt: 0, inventory: {}, active: [], done: 0 };
}

export const TIER_NAMES = [
  { ru: 'Лёгкое', en: 'Easy' },
  { ru: 'Среднее', en: 'Medium' },
  { ru: 'Сложное', en: 'Hard' },
] as const;

/** Время на задание: 5, 10, 20 минут. */
const DURATION = [300, 600, 1200];
/** Пауза перед следующим предложением. */
export const OFFER_PAUSE_SEC = 120;

interface TaskDef {
  kind: TaskKind;
  stat: keyof Stats;
  /** Цель по сложности. */
  target: (g: Game, tier: Tier) => number;
  /** Можно ли предложить сейчас. */
  ok?: (g: Game) => boolean;
}

const TASKS: TaskDef[] = [
  { kind: 'levels', stat: 'levelsBought', target: (_g, t) => [25, 80, 220][t] },
  { kind: 'furn', stat: 'furnBought', target: (_g, t) => [3, 8, 18][t] },
  { kind: 'tickets', stat: 'tickets', target: (_g, t) => [3, 9, 20][t] },
  { kind: 'avral', stat: 'avrals', target: (_g, t) => [1, 2, 5][t], ok: (g) => g.roomOpen('director') },
  { kind: 'hires', stat: 'hires', target: (_g, t) => [1, 2, 4][t], ok: (g) => hiresPossible(g) >= 1 },
  {
    kind: 'earn',
    stat: 'earned',
    // заработать столько, сколько офис сейчас даёт за 4 / 12 / 30 минут — нужно расти, а не просто ждать
    target: (g, t) => g.incomePerSec(true) * [240, 720, 1800][t],
  },
];

function hiresPossible(g: Game): number {
  let n = 0;
  for (let d = 0; d < g.run.depts.length; d++) if (g.isUnlocked(d) && g.nextDesk(d) >= 0) n++;
  return n;
}

/** Что даёт перк: сила и длительность по уровню. */
export const PERKS: Record<PerkKind, { power: number[]; duration: number[] }> = {
  // выплаты быстрее на 20 / 35 / 50 %
  speed: { power: [0.2, 0.35, 0.5], duration: [60, 120, 300] },
  // доход ×2 / ×3 / ×5
  income: { power: [2, 3, 5], duration: [60, 120, 180] },
  // тикеты чаще в 2 / 3 / 4 раза
  tickets: { power: [2, 3, 4], duration: [120, 180, 300] },
  // мгновенно: доход за 5 / 15 / 45 минут
  cash: { power: [300, 900, 2700], duration: [0, 0, 0] },
};
export const PERK_KINDS: PerkKind[] = ['speed', 'income', 'tickets', 'cash'];

const key = (kind: PerkKind, tier: Tier): string => `${kind}:${tier}`;

export function taskStat(kind: TaskKind): keyof Stats {
  return TASKS.find((t) => t.kind === kind)!.stat;
}

export function taskProgress(g: Game, task: DirTask): number {
  return Math.max(0, g.state.stats[taskStat(task.kind)] - task.base);
}

/** Раз в секунду: предложить задание, проверить выполнение и срок. Возвращает, что случилось. */
export function directorTick(g: Game, nowMs: number, rng: () => number = Math.random): 'offered' | 'done' | 'expired' | null {
  const s = g.state.director;
  if (!g.roomOpen('director')) return null;
  const task = s.task;
  if (task && task.endsAt > 0) {
    if (taskProgress(g, task) >= task.target) {
      s.task = null;
      s.done++;
      s.nextOfferAt = nowMs + OFFER_PAUSE_SEC * 1000;
      const perk = PERK_KINDS[Math.floor(rng() * PERK_KINDS.length)];
      s.inventory[key(perk, task.tier)] = (s.inventory[key(perk, task.tier)] ?? 0) + 1;
      return 'done';
    }
    if (nowMs >= task.endsAt) {
      s.task = null;
      s.nextOfferAt = nowMs + OFFER_PAUSE_SEC * 1000;
      return 'expired';
    }
    return null;
  }
  if (!task && nowMs >= s.nextOfferAt) {
    const pool = TASKS.filter((t) => !t.ok || t.ok(g));
    const def = pool[Math.floor(rng() * pool.length)];
    const r = rng();
    const tier: Tier = r < 0.5 ? 0 : r < 0.85 ? 1 : 2;
    s.task = { kind: def.kind, tier, target: Math.max(1, def.target(g, tier)), base: 0, duration: DURATION[tier], endsAt: 0 };
    return 'offered';
  }
  return null;
}

export function acceptTask(g: Game, nowMs: number): boolean {
  const t = g.state.director.task;
  if (!t || t.endsAt > 0) return false;
  t.base = g.state.stats[taskStat(t.kind)];
  // «заработать» считаем от нынешнего дохода в момент принятия
  if (t.kind === 'earn') t.target = Math.max(1, TASKS.find((x) => x.kind === 'earn')!.target(g, t.tier));
  t.endsAt = nowMs + t.duration * 1000;
  return true;
}

export function declineTask(g: Game, nowMs: number): void {
  g.state.director.task = null;
  g.state.director.nextOfferAt = nowMs + OFFER_PAUSE_SEC * 1000;
}

/** Применить перк из инвентаря. */
export function usePerk(g: Game, kind: PerkKind, tier: Tier): boolean {
  const s = g.state.director;
  const k = key(kind, tier);
  if (!(s.inventory[k] > 0)) return false;
  s.inventory[k]--;
  if (s.inventory[k] <= 0) delete s.inventory[k];
  if (kind === 'cash') {
    g.grant(g.incomePerSec(true) * PERKS.cash.power[tier], 'quest');
    return true;
  }
  // такой же уже действует — берём сильнейший уровень и складываем время
  const same = s.active.find((a) => a.kind === kind);
  const dur = PERKS[kind].duration[tier];
  if (same) {
    same.tier = Math.max(same.tier, tier) as Tier;
    same.left += dur;
  } else s.active.push({ kind, tier, left: dur });
  return true;
}

export function inventoryList(g: Game): { kind: PerkKind; tier: Tier; count: number }[] {
  const out: { kind: PerkKind; tier: Tier; count: number }[] = [];
  for (const kind of PERK_KINDS)
    for (const tier of [2, 1, 0] as Tier[]) {
      const n = g.state.director.inventory[key(kind, tier)] ?? 0;
      if (n > 0) out.push({ kind, tier, count: n });
    }
  return out;
}

export function perkPower(g: Game, kind: PerkKind): number {
  const a = g.state.director.active.find((x) => x.kind === kind);
  return a ? PERKS[kind].power[a.tier] : 0;
}

/** Таймеры действующих перков (идут только в игре). */
export function tickPerks(g: Game, dt: number): void {
  const list = g.state.director.active;
  for (let i = list.length - 1; i >= 0; i--) {
    list[i].left -= dt;
    if (list[i].left <= 0) list.splice(i, 1);
  }
}
