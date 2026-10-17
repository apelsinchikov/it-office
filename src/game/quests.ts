// Задания: ежедневные (3 в день, сброс в полночь по Москве), цепочка открытий, долгие.

import { DEPT_COUNT, DESKS } from './config';
import { moscowDayKey } from './events';
import type { Game } from './game';
import type { DailyQuest, Stats } from './state';

export interface Text {
  ru: string;
  en: string;
}

const t = (ru: string, en: string): Text => ({ ru, en });

interface DailyDef {
  id: string;
  stat: keyof Stats;
  title: Text;
  target: (g: Game) => number;
}

export const DAILY: DailyDef[] = [
  { id: 'tickets', stat: 'tickets', title: t('Соберите {n} тикетов', 'Collect {n} tickets'), target: () => 10 },
  { id: 'levels', stat: 'levelsBought', title: t('Купите {n} уровней сотрудникам', 'Buy {n} employee levels'), target: () => 25 },
  { id: 'avral', stat: 'avrals', title: t('Объявите «Аврал» {n} раза', 'Call a «Crunch» {n} times'), target: () => 2 },
  { id: 'furn', stat: 'furnBought', title: t('Купите {n} предмета мебели', 'Buy {n} pieces of furniture'), target: () => 3 },
  { id: 'hire', stat: 'hires', title: t('Наймите {n} сотрудника', 'Hire {n} employee'), target: () => 1 },
  {
    id: 'earn',
    stat: 'earned',
    title: t('Заработайте {n} techCoin', 'Earn {n} techCoin'),
    target: (g) => Math.max(100 * g.company().costMult, Math.round(g.incomePerSec(true) * 1200)),
  },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Три разных ежедневных задания на дату. */
export function pickDaily(dayKey: string): DailyDef[] {
  const pool = [...DAILY];
  let seed = hash(dayKey);
  const out: DailyDef[] = [];
  while (out.length < 3) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    out.push(pool.splice(seed % pool.length, 1)[0]);
  }
  return out;
}

export function ensureDaily(g: Game, nowMs: number): boolean {
  const key = moscowDayKey(nowMs);
  const q = g.state.quests;
  if (q.dailyDate === key && q.daily.length === 3) return false;
  q.dailyDate = key;
  q.daily = pickDaily(key).map((def) => ({ id: def.id, target: def.target(g), base: g.state.stats[def.stat], claimed: false }));
  return true;
}

export function dailyDef(id: string): DailyDef | undefined {
  return DAILY.find((d) => d.id === id);
}

export function dailyProgress(g: Game, q: DailyQuest): number {
  const def = dailyDef(q.id);
  if (!def) return 0;
  return Math.max(0, Math.min(q.target, g.state.stats[def.stat] - q.base));
}

export function dailyReward(g: Game): number {
  return Math.max(50 * g.company().costMult, g.incomePerSec(true) * 450);
}

export function claimDaily(g: Game, i: number): number {
  const q = g.state.quests.daily[i];
  if (!q || q.claimed || dailyProgress(g, q) < q.target) return 0;
  q.claimed = true;
  const reward = dailyReward(g);
  g.grant(reward, 'quest');
  return reward;
}

// ---------- цепочка открытий ----------

interface ChainDef {
  id: string;
  title: Text;
  check: (g: Game) => boolean;
}

const anyLevel = (g: Game, min: number): boolean => g.run.levels.some((row) => row.some((l) => l >= min));
const anySingle = (g: Game, j: number): boolean => g.run.singles[0].some((s) => s[j]);

export const CHAIN: ChainDef[] = [
  { id: 'lvl5', title: t('Прокачайте первого сотрудника до 5 уровня', 'Level your first employee to 5'), check: (g) => g.level(0, 0) >= 5 },
  { id: 'buy25', title: t('Купите 25 уровней', 'Buy 25 levels'), check: (g) => g.state.stats.levelsBought >= 25 },
  { id: 'hire2', title: t('Наймите второго сотрудника поддержки', 'Hire a second support agent'), check: (g) => g.isHired(0, 1) },
  { id: 'furn1', title: t('Купите первую мебель', 'Buy your first furniture'), check: (g) => g.state.stats.furnBought >= 1 },
  { id: 'mug', title: t('Купите кружку кофе', 'Buy a coffee mug'), check: (g) => anySingle(g, 1) },
  { id: 'dev', title: t('Откройте отдел разработки', 'Open the development department'), check: (g) => g.isUnlocked(1) },
  { id: 'coffee', title: t('Купите кофемашину', 'Buy a coffee machine'), check: (g) => g.run.rest.coffee >= 1 },
  { id: 'lead', title: t('Наймите руководителя поддержки', 'Hire a support lead'), check: (g) => g.run.managers[0] },
  { id: 'qa', title: t('Откройте тестирование', 'Open QA'), check: (g) => g.isUnlocked(2) },
  { id: 'reorg', title: t('Проведите первую реорганизацию', 'Do your first reorganization'), check: (g) => g.state.reorgs >= 1 },
  { id: 'analysts', title: t('Откройте аналитиков', 'Open the analysts'), check: (g) => g.isUnlocked(3) },
  { id: 'sysadmins', title: t('Откройте сисадминов', 'Open the sysadmins'), check: (g) => g.isUnlocked(4) },
  { id: 'games', title: t('Купите все 10 игр для приставки', 'Buy all 10 console games'), check: (g) => g.run.rest.games >= 10 },
];

export function chainCurrent(g: Game): ChainDef | undefined {
  return CHAIN[g.state.quests.chain];
}

export function chainReward(g: Game): number {
  return Math.max(20 * g.company().costMult, g.incomePerSec(true) * 200);
}

export function claimChain(g: Game): number {
  const def = chainCurrent(g);
  if (!def || !def.check(g)) return 0;
  const reward = chainReward(g);
  g.grant(reward, 'quest');
  g.state.quests.chain++;
  g.state.bonusPhrases = Math.min(13, g.state.bonusPhrases + 1);
  return reward;
}

// ---------- долгие задания (Гранты, один раз) ----------

interface LongDef {
  id: string;
  title: Text;
  grants: number;
  check: (g: Game) => boolean;
}

export const LONG: LongDef[] = [
  { id: 'lvl100', title: t('Сотрудник 100 уровня', 'An employee at level 100'), grants: 1, check: (g) => anyLevel(g, 100) },
  { id: 'reorg1', title: t('Первая реорганизация', 'First reorganization'), grants: 1, check: (g) => g.state.reorgs >= 1 },
  {
    id: 'desks6',
    title: t('Все 6 столов в отделе', 'All 6 desks in a department'),
    grants: 2,
    check: (g) => g.run.levels.some((row) => row.every((l) => l > 0)),
  },
  { id: 'lvl500', title: t('Сотрудник 500 уровня', 'An employee at level 500'), grants: 2, check: (g) => anyLevel(g, 500) },
  { id: 'reorg5', title: t('5 реорганизаций', '5 reorganizations'), grants: 2, check: (g) => g.state.reorgs >= 5 },
  { id: 'allDepts', title: t('Все отделы открыты', 'All departments open'), grants: 3, check: (g) => g.run.depts.every(Boolean) },
  { id: 'allLeads', title: t('Все руководители наняты', 'All leads hired'), grants: 3, check: (g) => g.run.managers.every(Boolean) },
  { id: 'company2', title: t('Смените компанию', 'Move to a new company'), grants: 5, check: (g) => g.state.company >= 2 },
];

export function longReady(g: Game, id: string): boolean {
  const def = LONG.find((l) => l.id === id);
  return !!def && !g.state.quests.longClaimed.includes(id) && def.check(g);
}

export function claimLong(g: Game, id: string): number {
  const def = LONG.find((l) => l.id === id);
  if (!def || !longReady(g, id)) return 0;
  g.state.quests.longClaimed.push(id);
  g.state.grants += def.grants;
  g.state.grantsEarned += def.grants;
  return def.grants;
}

/** Сколько заданий можно забрать прямо сейчас (для значка на кнопке). */
export function claimableCount(g: Game): number {
  let n = g.state.quests.daily.filter((q) => !q.claimed && dailyProgress(g, q) >= q.target).length;
  const c = chainCurrent(g);
  if (c && c.check(g)) n++;
  n += LONG.filter((l) => longReady(g, l.id)).length;
  return n;
}

export const ALL_DESKS = DEPT_COUNT * DESKS;
