// Формулы экономики из GDD, раздел «Экономико-математическая модель».
// d — номер отдела (0 = поддержка), k — номер места в отделе (0..5), L — уровень сотрудника.

export const R = 1.07; // рост цены уровня
export const C0 = 3; // цена 1-го уровня первого сотрудника поддержки
export const DEPT_COST_F = 1000; // каждый следующий отдел дороже в 1000 раз
export const DEPT_INC_F = 300; // и доходнее в 300 раз
export const WORKER_COST_F = 10; // каждый следующий сотрудник дороже в 10 раз
export const WORKER_INC_F = 6; // и доходнее в 6 раз
export const PAYOUT_SEC = 10; // выплата раз в 10 секунд

/** Уровни, на которых доход сотрудника удваивается. */
export const MILESTONES = [25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];

export function baseCost(d: number, k: number): number {
  return C0 * DEPT_COST_F ** d * WORKER_COST_F ** k;
}

/** Цена перехода с уровня L на L+1 (L = 0 — это найм). */
export function levelCost(d: number, k: number, L: number): number {
  return baseCost(d, k) * R ** L;
}

/** Цена n уровней подряд начиная с уровня L (сумма геометрической прогрессии). */
export function costForLevels(d: number, k: number, L: number, n: number): number {
  if (n <= 0) return 0;
  return (levelCost(d, k, L) * (R ** n - 1)) / (R - 1);
}

/** Сколько уровней можно купить на coins, начиная с уровня L. */
export function maxAffordable(d: number, k: number, L: number, coins: number): number {
  const first = levelCost(d, k, L);
  if (coins < first) return 0;
  let n = Math.floor(Math.log((coins * (R - 1)) / first + 1) / Math.log(R));
  // поправка на погрешность плавающей точки
  while (n > 0 && costForLevels(d, k, L, n) > coins) n--;
  while (costForLevels(d, k, L, n + 1) <= coins) n++;
  return n;
}

/** Множитель вех: ×2 за каждую пройденную веху. */
export function milestoneMultiplier(L: number): number {
  let m = 0;
  for (const level of MILESTONES) if (L >= level) m++;
  return 2 ** m;
}

export function nextMilestone(L: number): number | undefined {
  return MILESTONES.find((level) => level > L);
}

/** Доход одной выплаты сотрудника; bonus — сумма бонусов мебели (0.1 = +10%). */
export function payoutIncome(d: number, k: number, L: number, bonus = 0): number {
  if (L <= 0) return 0;
  return DEPT_INC_F ** d * WORKER_INC_F ** k * L * milestoneMultiplier(L) * (1 + bonus);
}
