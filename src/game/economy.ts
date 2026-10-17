// Формулы экономики из GDD, раздел «Экономико-математическая модель».
// d — номер отдела (0 = поддержка), k — номер места в отделе (0..5), L — уровень сотрудника.
// Все цены здесь — «базовые», без скидок Грантов и множителя компании (их применяет Game).

export const R = 1.07; // рост цены уровня
export const C0 = 3; // цена 1-го уровня первого сотрудника поддержки
export const DEPT_COST_F = 1000; // каждый следующий отдел дороже в 1000 раз
export const DEPT_INC_F = 300; // и доходнее в 300 раз
export const WORKER_COST_F = 10; // каждый следующий сотрудник дороже в 10 раз
export const WORKER_INC_F = 6; // и доходнее в 6 раз
export const PAYOUT_SEC = 10; // выплата раз в 10 секунд

/** Уровень предыдущего сотрудника, нужный для найма следующего (места 2..6). */
export const HIRE_GATES = [25, 50, 100, 150, 200];

/** Открытие отдела: 1000 цен первого сотрудника (плюс сам первый сотрудник). */
export const DEPT_UNLOCK_X = 1000;
/** Руководитель: 200 000 цен первого сотрудника, +50% дохода отдела, после найма 3-го сотрудника. */
export const MANAGER_X = 2e5;
export const MANAGER_BONUS = 0.5;
export const MANAGER_NEEDS_DESK = 2;

/** Мебель по уровням: цена в «ценах первого уровня сотрудника» и прибавка к доходу. */
export const FURN_TIER_COST = [40, 500, 8000];
export const FURN_TIER_BONUS = [0.1, 0.15, 0.25];
/** Одиночные украшения (цветок, кружка): цена и прибавка. */
export const FURN_SINGLE_COST = [100, 250];
export const FURN_SINGLE_BONUS = 0.05;

/** Зона отдыха: прибавка ко всему офису и цены по уровням (в techCoin первого офиса). */
export const REST = {
  coffee: { bonus: [0.03, 0.04, 0.05], cost: [3e5, 3e8, 3e11] },
  fridge: { bonus: [0.02, 0.03, 0.04], cost: [1e6, 1e9, 1e12] },
  games: { bonus: Array<number>(10).fill(0.01), cost: Array.from({ length: 10 }, (_, i) => 1e8 * 8 ** i) },
} as const;
export type RestKind = keyof typeof REST;
export const REST_KINDS: RestKind[] = ['coffee', 'fridge', 'games'];

/** Гранты: floor(K · (заработок / DIV)^POW · (1 + 0.05 · лоббирование)). */
export const GRANTS_K = 2;
export const GRANTS_DIV = 1e10;
export const GRANTS_POW = 0.4;
export const GRANTS_MIN = 20; // кнопка реорганизации доступна с 20 Грантов

/** Активная игра. */
export const TICKET_EVERY_MIN = 30;
export const TICKET_EVERY_MAX = 40;
export const TICKET_TTL = 20;
export const TICKET_REWARD_SEC = 40;
export const AVRAL_SEC = 30;
export const AVRAL_MULT = 3;
export const AVRAL_COOLDOWN = 150;

/** Офлайн-доход: полная ставка, не дольше 2 часов за перерыв. */
export const OFFLINE_CAP_SEC = 2 * 3600;

const MILESTONES_BASE = [25, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

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

/** Сколько уровней можно купить на coins при множителе цены mult, начиная с уровня L. */
export function maxAffordable(d: number, k: number, L: number, coins: number, mult = 1): number {
  const first = levelCost(d, k, L) * mult;
  if (!(coins >= first)) return 0;
  let n = Math.floor(Math.log((coins * (R - 1)) / first + 1) / Math.log(R));
  // поправка на погрешность плавающей точки
  while (n > 0 && costForLevels(d, k, L, n) * mult > coins) n--;
  while (costForLevels(d, k, L, n + 1) * mult <= coins) n++;
  return n;
}

/** Сколько вех удвоения пройдено: 25, 50, 100, 150 … 500, затем каждые 100. */
export function milestoneCount(L: number): number {
  let m = 0;
  for (const level of MILESTONES_BASE) if (L >= level) m++;
  if (L >= 600) m += Math.floor((L - 500) / 100);
  return m;
}

export function milestoneMultiplier(L: number): number {
  return 2 ** milestoneCount(L);
}

export function nextMilestone(L: number): number {
  for (const level of MILESTONES_BASE) if (level > L) return level;
  return (Math.floor(L / 100) + 1) * 100;
}

/** Доход одной выплаты сотрудника; bonus — сумма бонусов мебели (0.1 = +10%). */
export function payoutIncome(d: number, k: number, L: number, bonus = 0): number {
  if (L <= 0) return 0;
  return DEPT_INC_F ** d * WORKER_INC_F ** k * L * milestoneMultiplier(L) * (1 + bonus);
}

export function deptUnlockCost(d: number): number {
  return (DEPT_UNLOCK_X + 1) * baseCost(d, 0);
}

export function managerCost(d: number): number {
  return MANAGER_X * baseCost(d, 0);
}

/** Цена следующего уровня предмета мебели (tier — текущий уровень 0..2). */
export function furnTierCost(d: number, k: number, tier: number): number {
  return baseCost(d, k) * FURN_TIER_COST[tier];
}

export function furnSingleCost(d: number, k: number, j: number): number {
  return baseCost(d, k) * FURN_SINGLE_COST[Math.min(j, FURN_SINGLE_COST.length - 1)];
}

/** Суммарный бонус предмета мебели на уровне tier (0..3). */
export function furnTierBonusTotal(tier: number): number {
  let b = 0;
  for (let i = 0; i < tier; i++) b += FURN_TIER_BONUS[i];
  return b;
}

export function grantsFor(earned: number, lobby: number, div = GRANTS_DIV): number {
  if (earned < div) return 0;
  return Math.floor(GRANTS_K * (earned / div) ** GRANTS_POW * (1 + 0.05 * lobby));
}
