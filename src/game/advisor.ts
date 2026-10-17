// Список покупок с окупаемостью: для подсветки «выгодно» в интерфейсе и для симуляции игроков.

import { DEPTS, DEPT_COUNT, DESKS } from './config';
import { FURN_SINGLE_BONUS, FURN_TIER_BONUS, MANAGER_BONUS, REST, REST_KINDS, nextMilestone, payoutIncome, type RestKind } from './economy';
import type { Game } from './game';

export type Purchase =
  | { kind: 'levels'; d: number; k: number; n: number; cost: number; gain: number }
  | { kind: 'hire'; d: number; k: number; cost: number; gain: number }
  | { kind: 'unlock'; d: number; cost: number; gain: number }
  | { kind: 'manager'; d: number; cost: number; gain: number }
  | { kind: 'furn'; d: number; k: number; i: number; cost: number; gain: number }
  | { kind: 'single'; d: number; k: number; j: number; cost: number; gain: number }
  | { kind: 'rest'; rest: RestKind; cost: number; gain: number };

/**
 * Все доступные сейчас покупки (по деньгам — любые) с приростом дохода в секунду.
 * levels: покупаем до следующей вехи удвоения, но не больше maxChunk уровней.
 */
export function purchases(g: Game, maxChunk = 25): Purchase[] {
  const out: Purchase[] = [];
  const run = g.run;
  for (let d = 0; d < DEPT_COUNT; d++) {
    if (!run.depts[d]) {
      if (g.unlockAvailable(d)) {
        const gain = (payoutIncome(d, 0, 1) * g.deptMult(d, false)) / g.payoutTime(d);
        out.push({ kind: 'unlock', d, cost: g.unlockCost(d), gain });
      }
      continue;
    }
    const mult = g.deptMult(d, false);
    const T = g.payoutTime(d);
    for (let k = 0; k < DESKS; k++) {
      const L = g.level(d, k);
      if (L === 0) {
        if (g.hireAvailable(d, k)) {
          out.push({ kind: 'hire', d, k, cost: g.hireCost(d, k), gain: (payoutIncome(d, k, 1) * mult) / T });
        }
        continue;
      }
      const fb = g.furnBonus(d, k);
      let n = Math.max(1, Math.min(maxChunk, nextMilestone(L) - L));
      // До вехи не хватает — берём «сколько хватает», как кнопка «Макс».
      const can = g.maxLevels(d, k);
      if (can >= 1 && can < n) n = can;
      const gainL = ((payoutIncome(d, k, L + n, fb) - payoutIncome(d, k, L, fb)) * mult) / T;
      out.push({ kind: 'levels', d, k, n, cost: g.costOfLevels(d, k, n), gain: gainL });
      const base = (payoutIncome(d, k, L, 0) * mult) / T;
      const fm = g.company().furnBonusMult;
      DEPTS[d].items.forEach((_, i) => {
        const tier = g.furnTier(d, k, i);
        if (tier < 3) out.push({ kind: 'furn', d, k, i, cost: g.furnCost(d, k, i), gain: base * FURN_TIER_BONUS[tier] * fm });
      });
      DEPTS[d].singles.forEach((_, j) => {
        if (!run.singles[d][k][j]) out.push({ kind: 'single', d, k, j, cost: g.singleCost(d, k, j), gain: base * FURN_SINGLE_BONUS * fm });
      });
    }
    if (g.managerAvailable(d)) {
      let dept = 0;
      for (let k = 0; k < DESKS; k++) dept += g.payoutOf(d, k, false) / T;
      out.push({ kind: 'manager', d, cost: g.managerCost(d), gain: dept * MANAGER_BONUS });
    }
  }
  const total = g.incomePerSec(true);
  for (const kind of REST_KINDS) {
    const lvl = run.rest[kind];
    if (lvl < REST[kind].cost.length) {
      out.push({ kind: 'rest', rest: kind, cost: g.restCost(kind), gain: (total * REST[kind].bonus[lvl]) / (1 + g.restBonus()) });
    }
  }
  return out;
}

export function payback(p: Purchase): number {
  return p.gain > 0 ? p.cost / p.gain : Infinity;
}

/** Самая быстро окупающаяся покупка (не обязательно по карману). */
export function bestPurchase(g: Game, maxChunk = 25): Purchase | undefined {
  let best: Purchase | undefined;
  let bp = Infinity;
  for (const p of purchases(g, maxChunk)) {
    const pb = payback(p);
    if (pb < bp) {
      bp = pb;
      best = p;
    }
  }
  return best;
}

export function apply(g: Game, p: Purchase): boolean {
  switch (p.kind) {
    case 'levels':
      return g.buyLevels(p.d, p.k, p.n);
    case 'hire':
      return g.hire(p.d, p.k);
    case 'unlock':
      return g.unlock(p.d);
    case 'manager':
      return g.buyManager(p.d);
    case 'furn':
      return g.buyFurn(p.d, p.k, p.i);
    case 'single':
      return g.buySingle(p.d, p.k, p.j);
    case 'rest':
      return g.buyRest(p.rest);
  }
}
