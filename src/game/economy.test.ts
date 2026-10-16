import { describe, expect, it } from 'vitest';
import {
  costForLevels,
  levelCost,
  maxAffordable,
  milestoneMultiplier,
  nextMilestone,
  payoutIncome,
} from './economy';
import { formatNumber } from './format';
import { Game } from './game';
import { newState } from './state';

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

  it('вехи удваивают доход', () => {
    expect(milestoneMultiplier(24)).toBe(1);
    expect(milestoneMultiplier(25)).toBe(2);
    expect(milestoneMultiplier(100)).toBe(8);
    expect(nextMilestone(1)).toBe(25);
    expect(nextMilestone(25)).toBe(50);
    expect(payoutIncome(0, 0, 1)).toBe(1);
    expect(payoutIncome(0, 0, 25)).toBe(50);
    expect(payoutIncome(0, 0, 0)).toBe(0);
    expect(payoutIncome(1, 0, 1)).toBe(300);
    expect(payoutIncome(0, 1, 1)).toBe(6);
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
    expect(formatNumber(1e15)).toBe('1aa');
    expect(formatNumber(999960)).toBe('1M');
  });
});

describe('игра', () => {
  it('выплата раз в 10 секунд', () => {
    const g = new Game(newState());
    expect(g.tick(9.9)).toHaveLength(0);
    const p = g.tick(0.2);
    expect(p).toHaveLength(1);
    expect(p[0].amount).toBe(1);
    expect(g.state.coins).toBe(1);
  });

  it('покупка уровня списывает цену', () => {
    const g = new Game(newState());
    g.state.coins = 10;
    expect(g.buyLevels(0, 0, 1)).toBe(true);
    expect(g.level(0, 0)).toBe(2);
    expect(g.state.coins).toBeCloseTo(10 - 3.21);
    expect(g.buyLevels(0, 0, 100)).toBe(false);
    expect(g.buyLevels(0, 1, 1)).toBe(false); // место пустое
  });
});
