// Справочники: отделы, мебель, компании (офисы), дерево Грантов.

export type DeptId = 'support' | 'dev' | 'qa' | 'analysts' | 'sysadmins';
export type ItemId =
  | 'desk'
  | 'chair'
  | 'phone'
  | 'monitor'
  | 'keyboard'
  | 'mouse'
  | 'post'
  | 'toolbox'
  | 'lamp';
export type SingleId = 'flower' | 'mug';

export interface DeptDef {
  id: DeptId;
  /** Предметы с тремя уровнями. */
  items: ItemId[];
  /** Одиночные украшения. */
  singles: SingleId[];
}

// Порядок = порядок открытия. Число предметов совпадает с симуляцией экономики (FURN в sim2.py).
export const DEPTS: DeptDef[] = [
  { id: 'support', items: ['desk', 'chair', 'phone'], singles: ['flower', 'mug'] },
  { id: 'dev', items: ['desk', 'chair', 'monitor', 'keyboard'], singles: ['flower'] },
  { id: 'qa', items: ['desk', 'chair', 'monitor', 'keyboard', 'mouse'], singles: ['flower'] },
  { id: 'analysts', items: ['desk', 'chair', 'phone', 'monitor'], singles: ['flower'] },
  { id: 'sysadmins', items: ['post', 'toolbox', 'chair', 'lamp'], singles: ['mug'] },
];
export const DEPT_COUNT = DEPTS.length;
export const DESKS = 6;

export type CompanyStyle = 'startup' | 'bank' | 'studio' | 'space';

export interface CompanyDef {
  style: CompanyStyle;
  /** Время выплаты ×. */
  payoutMult: number;
  /** Доход ×. */
  incomeMult: number;
  /** Награда за тикет ×. */
  ticketMult: number;
  /** Бонусы мебели ×. */
  furnBonusMult: number;
  /** Предел офлайна, часов. */
  offlineCapH: number;
}

// Особенность каждого офиса из роадмапа GDD.
export const COMPANY_STYLES: CompanyDef[] = [
  { style: 'startup', payoutMult: 1, incomeMult: 1, ticketMult: 1, furnBonusMult: 1, offlineCapH: 2 },
  // Банк: строгий стиль, выплаты медленнее (×1,5), но доход больше (×1,6)
  { style: 'bank', payoutMult: 1.5, incomeMult: 1.6, ticketMult: 1, furnBonusMult: 1, offlineCapH: 2 },
  // Игровая студия: тикеты ×2, мебель даёт на 20% больше
  { style: 'studio', payoutMult: 1, incomeMult: 1, ticketMult: 2, furnBonusMult: 1.2, offlineCapH: 2 },
  // Космос: доход ×1,2, офлайн копится до 3 часов
  { style: 'space', payoutMult: 1, incomeMult: 1.2, ticketMult: 1, furnBonusMult: 1, offlineCapH: 3 },
];

/** Во сколько раз дороже каждая следующая компания (подобрано симуляцией, см. sim/README.md). */
export const COMPANY_TUNING = { costStep: 100 };

/** Компания № n (с 1): стиль по кругу, цены растут в costStep раз за каждую следующую компанию. */
export function companyDef(n: number): CompanyDef & { costMult: number; index: number } {
  const i = Math.max(0, n - 1);
  return { ...COMPANY_STYLES[i % COMPANY_STYLES.length], costMult: COMPANY_TUNING.costStep ** i, index: i };
}

export type ShopKey = 'culture' | `speed${number}` | `income${number}` | 'discount' | 'furnDiscount' | 'startCapital' | 'lobby';

export interface ShopItem {
  key: ShopKey;
  kind: 'culture' | 'speed' | 'income' | 'discount' | 'furnDiscount' | 'startCapital' | 'lobby';
  dept?: number;
  max: number;
  cost: (level: number) => number;
}

// Дерево Грантов — ровно те числа, что прогонялись в симуляции.
export const SHOP: ShopItem[] = [
  { key: 'culture', kind: 'culture', max: Infinity, cost: (l) => 1 + Math.floor(l / 10) },
  ...DEPTS.map((_, d) => ({ key: `speed${d}` as ShopKey, kind: 'speed' as const, dept: d, max: 15, cost: (l: number) => Math.ceil(3 * 1.3 ** l) })),
  ...DEPTS.map((_, d) => ({ key: `income${d}` as ShopKey, kind: 'income' as const, dept: d, max: 40, cost: (l: number) => Math.ceil(2 * 1.18 ** l) })),
  { key: 'discount', kind: 'discount', max: 30, cost: (l) => Math.ceil(4 * 1.25 ** l) },
  { key: 'furnDiscount', kind: 'furnDiscount', max: 25, cost: (l) => Math.ceil(2 * 1.25 ** l) },
  { key: 'startCapital', kind: 'startCapital', max: 12, cost: (l) => Math.ceil(3 * 1.8 ** l) },
  { key: 'lobby', kind: 'lobby', max: 20, cost: (l) => Math.ceil(5 * 1.5 ** l) },
];

export function shopItem(key: string): ShopItem | undefined {
  return SHOP.find((s) => s.key === key);
}
