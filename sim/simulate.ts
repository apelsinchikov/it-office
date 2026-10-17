// Симуляция игроков на настоящем коде игры (src/game).
// Игрок заходит по расписанию, забирает офлайн (до 2 ч), пока в игре — ловит тикеты,
// жмёт «Аврал», покупает и делает реорганизацию по подсказке «выгодно».
// Запуск: см. sim/README.md.

import { apply, payback, purchases, type Purchase } from '../src/game/advisor';
import { HIRE_GATES } from '../src/game/economy';
import { Game } from '../src/game/game';
import { CHAIN, LONG, claimChain, claimDaily, claimLong, ensureDaily, dailyProgress } from '../src/game/quests';
import { newState } from '../src/game/state';

export interface Profile {
  id: string;
  name: string;
  /** Заходов в сутки. */
  sessions: number;
  /** Длина захода, минут. */
  minutes: number;
  /** Доля пойманных тикетов. */
  ticketCatch: number;
  /** Задержка реакции на готовый «Аврал», секунд (среднее). */
  avralDelay: number;
  /** Как часто игрок принимает решения о покупках, секунд. */
  decideEvery: number;
  /** Вероятность взять лучшую по окупаемости покупку из доступных (иначе — самую дешёвую). */
  smart: number;
  /** Офлайн между заходами (бот всегда в игре). */
  alwaysOn?: boolean;
  /** «Стена»: если до ближайшей полезной покупки дольше стольких часов дохода — реорганизация. */
  wallHours: number;
  /** Ждать самую окупаемую покупку, даже если на неё пока не хватает (политика идеальной модели из GDD). */
  wait?: boolean;
}

export const SIM_FLAGS = { quests: true };

export const PROFILES: Profile[] = [
  { id: 'A', name: '1 заход × 3 мин', sessions: 1, minutes: 3, ticketCatch: 0.9, avralDelay: 5, decideEvery: 10, smart: 0.7, wallHours: 4 },
  { id: 'B', name: '4 захода × 3 мин', sessions: 4, minutes: 3, ticketCatch: 0.9, avralDelay: 5, decideEvery: 10, smart: 0.7, wallHours: 4 },
  { id: 'C', name: '8 заходов × 5 мин', sessions: 8, minutes: 5, ticketCatch: 0.85, avralDelay: 8, decideEvery: 10, smart: 0.7, wallHours: 4 },
  { id: 'D', name: '6 заходов × 1 ч (≈6 ч)', sessions: 6, minutes: 60, ticketCatch: 0.7, avralDelay: 30, decideEvery: 15, smart: 0.7, wallHours: 4 },
  { id: 'E', name: '4 захода × 3 ч (≈12 ч)', sessions: 4, minutes: 180, ticketCatch: 0.7, avralDelay: 30, decideEvery: 15, smart: 0.7, wallHours: 4 },
  { id: 'F', name: '1 заход × 16 ч, тапает', sessions: 1, minutes: 960, ticketCatch: 0.75, avralDelay: 15, decideEvery: 15, smart: 0.7, wallHours: 4 },
  { id: 'BOT', name: 'Компьютер 24/7, идеально', sessions: 1, minutes: 1440, ticketCatch: 1, avralDelay: 0, decideEvery: 10, smart: 1, alwaysOn: true, wallHours: 3, wait: true },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Milestones {
  dept2?: number;
  reorg1?: number;
  dept3?: number;
  reorg5?: number;
  dept4?: number;
  dept5?: number;
  complete?: number;
}

export interface Result {
  profile: Profile;
  days: Milestones;
  reorgs: number;
  activeHours: number;
  grantsFromQuests: number;
  grantsTotal: number;
  finished: boolean;
}

const DAY = 86400;

/** Сотрудник, чей уровень держит следующий найм («нужен 25/50/… уровень, чтобы нанять»). */
function isGate(g: Game, x: Purchase): boolean {
  if (x.kind !== 'levels' || x.k >= 5) return false;
  return !g.isHired(x.d, x.k + 1) && g.level(x.d, x.k) < HIRE_GATES[x.k];
}

/** Как игрок оценивает покупку: окупаемость, но цели найма для него в 3 раза привлекательнее. */
function score(g: Game, x: Purchase): number {
  return isGate(g, x) ? payback(x) / 3 : payback(x);
}

/** До ближайшей полезной покупки дольше wallHours часов дохода. */
function hitWall(g: Game, wallHours: number): boolean {
  const inc = g.incomePerSec(true);
  if (!(inc > 0)) return false;
  let minCost = Infinity;
  for (const x of purchases(g)) if (x.gain > 0 && x.cost < minCost) minCost = x.cost;
  return (minCost - g.run.coins) / inc > wallHours * 3600;
}

/** Решение о покупках: покупает, пока есть что-то по карману. */
function shop(g: Game, p: Profile, rng: () => number): void {
  if (p.wait) {
    for (let guard = 0; guard < 200; guard++) {
      const all = purchases(g).filter((x) => x.gain > 0);
      if (all.length === 0) return;
      const best = all.reduce((a, b) => (payback(b) < payback(a) ? b : a));
      if (!g.canAfford(best.cost) || !apply(g, best)) return;
    }
    return;
  }
  for (let guard = 0; guard < 60; guard++) {
    const affordable = purchases(g).filter((x) => g.canAfford(x.cost) && x.gain > 0);
    if (affordable.length === 0) return;
    let pick: Purchase;
    if (rng() < p.smart) {
      pick = affordable.reduce((a, b) => (score(g, b) < score(g, a) ? b : a));
    } else {
      pick = affordable.reduce((a, b) => (b.cost < a.cost ? b : a));
    }
    if (!apply(g, pick)) return;
  }
}

function claimQuests(g: Game, nowMs: number): number {
  ensureDaily(g, nowMs);
  g.state.quests.daily.forEach((q, i) => {
    if (!q.claimed && dailyProgress(g, q) >= q.target) claimDaily(g, i);
  });
  for (let i = 0; i < CHAIN.length; i++) if (!claimChain(g)) break;
  let grants = 0;
  for (const l of LONG) grants += claimLong(g, l.id);
  return grants;
}

export function simulate(p: Profile, maxDays = 400, seed = 1, companies = 1, trace?: (day: number, g: Game) => void): Result & { companyDays: number[] } {
  const companyDays: number[] = [];
  const rng = mulberry32(seed);
  const state = newState(0);
  state.tutorialDone = true;
  const g = new Game(state, rng);
  const days: Milestones = {};
  let questGrants = 0;
  let active = 0;
  let reorgCount = 0;

  // Сессии в течение «бодрствования» 08:00–24:00
  const starts: number[] = [];
  if (p.alwaysOn) starts.push(0);
  else for (let i = 0; i < p.sessions; i++) starts.push(8 * 3600 + (i * 16 * 3600) / p.sessions);
  const len = Math.min(p.minutes * 60, p.alwaysOn ? DAY : DAY);

  let t = 0; // секунды с начала игры
  let lastEnd = 0;
  const startMs = Date.UTC(2026, 9, 5, 0, 0, 0); // понедельник; события выключены в симуляции

  const mark = (key: keyof Milestones): void => {
    if (days[key] === undefined) days[key] = t / DAY;
  };

  outer: for (let day = 0; day < maxDays; day++) {
    if (trace) trace(day, g);
    for (const s of starts) {
      const jitter = p.alwaysOn ? 0 : (rng() - 0.5) * 1200;
      const sessionStart = day * DAY + s + jitter;
      if (sessionStart > lastEnd) {
        g.applyOffline(sessionStart - lastEnd);
        t = sessionStart;
      }
      const end = t + len;
      let nextDecision = t;
      let avralAt = -1;
      const pendingTickets = new Map<number, number>(); // id → когда поймает
      const off = g.on((e) => {
        if (e.type === 'ticketSpawn' && rng() < p.ticketCatch) pendingTickets.set(e.ticket.id, t + 1 + rng() * 8);
      });
      while (t < end) {
        g.tick(1, true);
        t += 1;
        active += 1;
        for (const [id, at] of pendingTickets) {
          if (t >= at) {
            g.collectTicket(id);
            pendingTickets.delete(id);
          }
        }
        if (g.canAvral()) {
          if (avralAt < 0) avralAt = t + rng() * 2 * p.avralDelay;
          if (t >= avralAt) {
            g.startAvral();
            avralAt = -1;
          }
        }
        if (t >= nextDecision) {
          nextDecision = t + p.decideEvery;
          if (SIM_FLAGS.quests) questGrants += claimQuests(g, startMs + t * 1000);
          if (g.isComplete()) {
            mark('complete');
            companyDays.push(t / DAY);
            if (g.state.company >= companies) {
              off();
              break outer;
            }
            g.changeCompany();
            g.spendGrantsCheapest();
          }
          if (g.reorgIsGood() || (g.canReorg() && hitWall(g, p.wallHours))) {
            g.reorg();
            reorgCount++;
            g.spendGrantsCheapest();
            if (reorgCount === 1) mark('reorg1');
            if (reorgCount === 5) mark('reorg5');
          }
          shop(g, p, rng);
          if (g.isUnlocked(1)) mark('dept2');
          if (g.isUnlocked(2)) mark('dept3');
          if (g.isUnlocked(3)) mark('dept4');
          if (g.isUnlocked(4)) mark('dept5');
        }
      }
      off();
      lastEnd = t;
    }
  }
  return {
    profile: p,
    days,
    reorgs: reorgCount,
    activeHours: active / 3600,
    grantsFromQuests: questGrants,
    grantsTotal: g.state.grantsEarned,
    finished: days.complete !== undefined,
    companyDays,
  };
}
