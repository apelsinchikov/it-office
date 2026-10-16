import { PAYOUT_SEC, costForLevels, maxAffordable, payoutIncome } from './economy';
import { DEPTS, DESKS, type GameState } from './state';

export interface Payout {
  dept: number;
  desk: number;
  amount: number;
}

/** Мелкая погрешность при сравнении денег с ценой. */
const EPS = 1e-9;

export class Game {
  readonly state: GameState;
  /** Сколько секунд прошло с прошлой выплаты у каждого сотрудника. */
  private readonly timers: number[][];

  constructor(state: GameState) {
    this.state = state;
    this.timers = Array.from({ length: DEPTS }, () => Array<number>(DESKS).fill(0));
  }

  level(dept: number, desk: number): number {
    return this.state.levels[dept][desk];
  }

  isHired(dept: number, desk: number): boolean {
    return this.level(dept, desk) > 0;
  }

  /** 0..1 — заполненность полоски до следующей выплаты. */
  progress(dept: number, desk: number): number {
    return this.timers[dept][desk] / PAYOUT_SEC;
  }

  payoutOf(dept: number, desk: number): number {
    return payoutIncome(dept, desk, this.level(dept, desk));
  }

  incomePerSec(): number {
    let sum = 0;
    for (let d = 0; d < DEPTS; d++) for (let k = 0; k < DESKS; k++) sum += this.payoutOf(d, k);
    return sum / PAYOUT_SEC;
  }

  /** Продвигает время на dt секунд и возвращает выплаты, случившиеся за это время. */
  tick(dt: number): Payout[] {
    const out: Payout[] = [];
    for (let d = 0; d < DEPTS; d++) {
      for (let k = 0; k < DESKS; k++) {
        if (!this.isHired(d, k)) continue;
        this.timers[d][k] += dt;
        while (this.timers[d][k] >= PAYOUT_SEC) {
          this.timers[d][k] -= PAYOUT_SEC;
          const amount = this.payoutOf(d, k);
          this.state.coins += amount;
          this.state.lifetime += amount;
          out.push({ dept: d, desk: k, amount });
        }
      }
    }
    return out;
  }

  costOf(dept: number, desk: number, n: number): number {
    return costForLevels(dept, desk, this.level(dept, desk), n);
  }

  maxLevels(dept: number, desk: number): number {
    return maxAffordable(dept, desk, this.level(dept, desk), this.state.coins + EPS);
  }

  /** Покупает n уровней сотруднику. Возвращает false, если не хватает денег. */
  buyLevels(dept: number, desk: number, n: number): boolean {
    if (n <= 0 || !this.isHired(dept, desk)) return false;
    const cost = this.costOf(dept, desk, n);
    if (cost > this.state.coins + EPS) return false;
    this.state.coins = Math.max(0, this.state.coins - cost);
    this.state.levels[dept][desk] += n;
    return true;
  }
}
