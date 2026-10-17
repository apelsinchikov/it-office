import { describe, expect, it } from 'vitest';
import { companyDef, COMPANY_TUNING } from './config';
import {
  costForLevels,
  deptUnlockCost,
  grantsFor,
  levelCost,
  maxAffordable,
  milestoneCount,
  milestoneMultiplier,
  nextMilestone,
  payoutIncome,
} from './economy';
import { eventIdAt } from './events';
import { formatNumber } from './format';
import { Game } from './game';
import { claimDaily, ensureDaily, pickDaily } from './quests';
import { newState, normalize } from './state';

const zero = (): number => 0;
const fresh = (): Game => new Game(newState(0), zero);

describe('формулы', () => {
  it('цена уровня растёт в 1,07 раза', () => {
    expect(levelCost(0, 0, 0)).toBeCloseTo(3);
    expect(levelCost(0, 0, 1)).toBeCloseTo(3.21);
    expect(levelCost(0, 1, 0)).toBeCloseTo(30);
    expect(levelCost(1, 0, 0)).toBeCloseTo(3000);
  });

  it('цена n уровней равна сумме по одному', () => {
    let sum = 0;
    for (let i = 0; i < 10; i++) sum += levelCost(0, 0, 5 + i);
    expect(costForLevels(0, 0, 5, 10)).toBeCloseTo(sum, 6);
    expect(costForLevels(0, 0, 5, 0)).toBe(0);
  });

  it('максимум покупки помещается в бюджет, а на +1 уровень уже не хватает', () => {
    for (const coins of [0, 2.9, 3.21, 10, 1234, 1e6, 1e12]) {
      const n = maxAffordable(0, 0, 1, coins);
      expect(costForLevels(0, 0, 1, n)).toBeLessThanOrEqual(coins);
      expect(costForLevels(0, 0, 1, n + 1)).toBeGreaterThan(coins);
    }
  });

  it('вехи удваивают доход: 25…500, затем каждые 100', () => {
    expect(milestoneMultiplier(24)).toBe(1);
    expect(milestoneMultiplier(25)).toBe(2);
    expect(milestoneMultiplier(100)).toBe(8);
    expect(milestoneCount(500)).toBe(11);
    expect(milestoneCount(599)).toBe(11);
    expect(milestoneCount(600)).toBe(12);
    expect(milestoneCount(1000)).toBe(16);
    expect(nextMilestone(1)).toBe(25);
    expect(nextMilestone(500)).toBe(600);
    expect(payoutIncome(0, 0, 1)).toBe(1);
    expect(payoutIncome(0, 0, 25)).toBe(50);
    expect(payoutIncome(1, 0, 1)).toBe(300);
    expect(payoutIncome(0, 1, 1)).toBe(6);
  });

  it('отдел 2 стоит 3M, Гранты с 10 миллиардов', () => {
    expect(deptUnlockCost(1)).toBeCloseTo(3.003e6, -2);
    expect(grantsFor(9e9, 0)).toBe(0);
    expect(grantsFor(1e10, 0)).toBe(2);
    expect(grantsFor(1e10 * 5.7 ** 1, 0)).toBe(4);
  });
});

describe('формат чисел', () => {
  it('короткая запись', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(3.21)).toBe('3,2');
    expect(formatNumber(950)).toBe('950');
    expect(formatNumber(1200)).toBe('1,2K');
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(12345)).toBe('12,3K');
    expect(formatNumber(123456)).toBe('123K');
    expect(formatNumber(3.4e6)).toBe('3,4M');
    expect(formatNumber(5.6e9)).toBe('5,6B');
    expect(formatNumber(7e12)).toBe('7T');
    expect(formatNumber(1e15)).toBe('1Qa');
    expect(formatNumber(1e18)).toBe('1Qi');
    expect(formatNumber(999960)).toBe('1M');
  });
});

describe('игра', () => {
  it('выплата раз в 10 секунд', () => {
    const g = fresh();
    g.tick(9.9, false);
    expect(g.run.coins).toBe(0);
    g.tick(0.2, false);
    expect(g.run.coins).toBe(1);
  });

  it('покупка уровня списывает цену', () => {
    const g = fresh();
    g.run.coins = 10;
    expect(g.buyLevels(0, 0, 1)).toBe(true);
    expect(g.level(0, 0)).toBe(2);
    expect(g.run.coins).toBeCloseTo(10 - 3.21);
    expect(g.buyLevels(0, 0, 100)).toBe(false);
    expect(g.buyLevels(0, 1, 1)).toBe(false);
  });

  it('найм второго — после 25 уровня первого', () => {
    const g = fresh();
    g.run.coins = 1e9;
    expect(g.hireAvailable(0, 1)).toBe(false);
    g.buyLevels(0, 0, 24);
    expect(g.hireAvailable(0, 1)).toBe(true);
    expect(g.hire(0, 1)).toBe(true);
    expect(g.level(0, 1)).toBe(1);
  });

  it('отдел, руководитель, мебель и зона отдыха увеличивают доход', () => {
    const g = fresh();
    g.run.coins = 1e30;
    const base = g.incomePerSec();
    expect(g.buyFurn(0, 0, 0)).toBe(true);
    expect(g.incomePerSec()).toBeCloseTo(base * 1.1);
    expect(g.buyRest('coffee')).toBe(true);
    expect(g.incomePerSec()).toBeCloseTo(base * 1.1 * 1.03);
    expect(g.unlock(1)).toBe(true);
    expect(g.isHired(1, 0)).toBe(true);
    g.buyLevels(0, 0, 60);
    g.hire(0, 1);
    g.buyLevels(0, 1, 60);
    g.hire(0, 2);
    const before = g.deptIncomePerSec(0);
    expect(g.buyManager(0)).toBe(true);
    expect(g.deptIncomePerSec(0)).toBeCloseTo(before * 1.5);
  });

  it('офлайн не больше 2 часов, «Аврал» утраивает доход', () => {
    const g = fresh();
    expect(g.applyOffline(10 * 3600).seconds).toBe(7200);
    expect(g.run.coins).toBeCloseTo(720);
    const inc = g.incomePerSec();
    expect(g.startAvral()).toBe(true);
    expect(g.incomePerSec()).toBeCloseTo(inc * 3);
    expect(g.startAvral()).toBe(false);
    g.tick(31, false);
    expect(g.isAvral()).toBe(false);
    expect(g.canAvral()).toBe(false);
    g.tick(151, false);
    expect(g.canAvral()).toBe(true);
  });

  it('тикет даёт 40 секунд дохода', () => {
    const g = fresh();
    g.tick(41, true);
    expect(g.tickets.length).toBe(1);
    const before = g.run.coins;
    const r = g.collectTicket(g.tickets[0].id);
    expect(r).toBeCloseTo(4);
    expect(g.run.coins).toBeCloseTo(before + 4);
  });

  it('реорганизация: Гранты, сброс, подъёмные', () => {
    const g = fresh();
    g.run.earned = 1e10 * 10 ** 2.5 * 1.001; // 20 Грантов
    expect(g.pendingGrants()).toBe(20);
    expect(g.reorgIsGood()).toBe(true);
    expect(g.reorg()).toBe(20);
    expect(g.state.grants).toBe(20);
    expect(g.level(0, 0)).toBe(1);
    expect(g.run.coins).toBe(0);
    g.state.grants = 100;
    expect(g.buyShop('startCapital')).toBe(true);
    g.reorg(true);
    expect(g.run.coins).toBe(800);
  });

  it('культура: цена заново в каждой компании, бонус остаётся множителем', () => {
    const g = fresh();
    g.state.grants = 1e6;
    for (let i = 0; i < 50; i++) g.buyShop('culture');
    expect(g.cultureMult()).toBeCloseTo(1.5);
    expect(g.shopCost('culture')).toBe(6);
    // подменяем «всё куплено», чтобы проверить смену компании
    g.isComplete = () => true;
    expect(g.changeCompany()).toBe(true);
    expect(g.state.company).toBe(2);
    expect(g.shopCost('culture')).toBe(1);
    expect(g.cultureMult()).toBeCloseTo(1.5);
    g.buyShop('culture');
    expect(g.cultureMult()).toBeCloseTo(1.5 * 1.01);
    expect(companyDef(2).costMult).toBe(COMPANY_TUNING.costStep);
  });
});

describe('задания, события, сохранения', () => {
  it('3 разных ежедневных задания, награда после выполнения', () => {
    const ids = pickDaily('2026-10-17').map((d) => d.id);
    expect(new Set(ids).size).toBe(3);
    const g = fresh();
    ensureDaily(g, Date.UTC(2026, 9, 17, 12));
    const q = g.state.quests.daily;
    expect(q.length).toBe(3);
    expect(claimDaily(g, 0)).toBe(0);
  });

  it('события по московскому календарю', () => {
    expect(eventIdAt(Date.UTC(2026, 11, 25, 12))).toBe('newyear');
    expect(eventIdAt(Date.UTC(2026, 6, 31, 12))).toBe('sysadminDay');
    expect(eventIdAt(Date.UTC(2026, 9, 3, 12))).toBe('hackathon');
    expect(eventIdAt(Date.UTC(2026, 9, 14, 12))).toBe(null);
  });

  it('сохранение этапа 1 переносится', () => {
    const s = normalize({ v: 1, coins: 55, lifetime: 100, levels: [[7, 0, 0, 0, 0, 0]], savedAt: 5 }, 10);
    expect(s?.run.coins).toBe(55);
    expect(s?.run.levels[0][0]).toBe(7);
    expect(s?.v).toBe(2);
    expect(normalize({ v: 99 })).toBe(null);
  });
});
