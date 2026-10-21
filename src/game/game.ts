// Ядро игры: выплаты, покупки, активная игра, офлайн, реорганизация, смена компании.
// Чистый TypeScript без графики — тот же код гоняет симуляция игроков (sim/).

import { DEPTS, DEPT_COUNT, DESKS, ROOM_IDS, SEQUENCE, SHOP, companyDef, shopItem, stepIndex, type CompanyDef, type RoomId, type Step } from './config';
import { perkPower, tickPerks } from './director';
import {
  DIR_SINGLES,
  DIR_SINGLE_BONUS,
  DIR_SINGLE_COST,
  DIR_TIER_BONUS,
  DIR_TIER_COST,
  type DirItem,
  type DirSingle,
  AVRAL_COOLDOWN,
  AVRAL_MULT,
  AVRAL_SEC,
  FURN_SINGLE_BONUS,
  GRANTS_MIN,
  HIRE_GATES,
  MANAGER_BONUS,
  MANAGER_NEEDS_DESK,
  OFFLINE_CAP_SEC,
  PAYOUT_SEC,
  REST,
  REST_KINDS,
  TOILET_BONUS,
  TOILET_STALLS,
  TICKET_EVERY_MAX,
  TICKET_EVERY_MIN,
  TICKET_REWARD_SEC,
  TICKET_TTL,
  costForLevels,
  deptUnlockCost,
  furnSingleCost,
  furnTierBonusTotal,
  furnTierCost,
  grantsDivBase,
  grantsFor,
  grantsPow,
  hireCost as hireBase,
  roomUnlockCost,
  scaleOld,
  TUNING,
  managerCost,
  maxAffordable,
  payoutIncome,
  type RestKind,
} from './economy';
import { newRun, type GameState } from './state';

export interface Payout {
  dept: number;
  desk: number;
  amount: number;
}

export interface Ticket {
  id: number;
  dept: number;
  desk: number;
  /** Сколько секунд ещё висит. */
  left: number;
}

/** Модификатор сезонного события. */
export interface EventMod {
  id: string | null;
  incomeMult: number;
  deptMult: number[];
  ticketFreqMult: number;
}

export const NO_EVENT: EventMod = { id: null, incomeMult: 1, deptMult: DEPTS.map(() => 1), ticketFreqMult: 1 };

export type GameEvent =
  | { type: 'payout'; payout: Payout }
  | { type: 'levels'; dept: number; desk: number; n: number }
  | { type: 'hire'; dept: number; desk: number }
  | { type: 'unlock'; dept: number }
  | { type: 'room'; id: RoomId }
  | { type: 'toiletStall'; stall: number }
  | { type: 'manager'; dept: number }
  | { type: 'furn'; dept: number; desk: number }
  | { type: 'dirFurn' }
  | { type: 'rest'; kind: RestKind }
  | { type: 'ticketSpawn'; ticket: Ticket }
  | { type: 'ticketGone'; id: number; collected: boolean; reward: number }
  | { type: 'avral'; on: boolean }
  | { type: 'reorg'; grants: number }
  | { type: 'company'; company: number }
  | { type: 'shop'; key: string }
  | { type: 'income'; amount: number; source: 'offline' | 'quest' };

const EPS = 1e-9;

export class Game {
  readonly state: GameState;
  event: EventMod = NO_EVENT;
  tickets: Ticket[] = [];
  /** Секунд до конца «Аврала» (0 — выключен). */
  avralLeft = 0;
  /** Секунд до готовности «Аврала». */
  avralCooldown = 0;

  private timers: number[][];
  private nextTicketIn: number;
  private ticketSeq = 1;
  private listeners: ((e: GameEvent) => void)[] = [];

  constructor(
    state: GameState,
    private readonly rng: () => number = Math.random,
  ) {
    this.state = state;
    this.timers = this.freshTimers();
    this.nextTicketIn = this.ticketDelay();
  }

  on(fn: (e: GameEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  private emit(e: GameEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  private freshTimers(): number[][] {
    // Небольшой случайный сдвиг, чтобы сотрудники не платили все в один кадр.
    return Array.from({ length: DEPT_COUNT }, () => Array.from({ length: DESKS }, () => this.rng() * 2));
  }

  // ---------- справки ----------

  get run() {
    return this.state.run;
  }

  company(): CompanyDef & { costMult: number; index: number } {
    return companyDef(this.state.company);
  }

  shopLevel(key: string): number {
    return this.state.shop[key] ?? 0;
  }

  level(d: number, k: number): number {
    return this.run.levels[d][k];
  }

  isHired(d: number, k: number): boolean {
    return this.run.levels[d][k] > 0;
  }

  isUnlocked(d: number): boolean {
    return this.run.depts[d];
  }

  roomOpen(id: RoomId): boolean {
    return this.run.rooms[id];
  }

  stepOpen(st: Step): boolean {
    return st.kind === 'dept' ? this.run.depts[st.d] : this.run.rooms[st.id];
  }

  /** Предыдущая по порядку открытия комната уже открыта. */
  private prevOpen(st: Step): boolean {
    const i = stepIndex(st);
    return i <= 0 || this.stepOpen(SEQUENCE[i - 1]);
  }

  /** Что открывать следующим (для подсказок). */
  nextStep(): Step | undefined {
    return SEQUENCE.find((st) => !this.stepOpen(st));
  }

  hiredCount(d: number): number {
    return this.run.levels[d].filter((l) => l > 0).length;
  }

  /** Множитель цен уровней, найма, отделов и руководителей. */
  levelCostMult(): number {
    return this.company().costMult * (1 - 0.005 * this.shopLevel('discount'));
  }

  furnCostMult(): number {
    return this.company().costMult * (1 - 0.02 * this.shopLevel('furnDiscount'));
  }

  /** Прибавка ко всему офису от зоны отдыха и туалета. */
  restBonus(): number {
    const r = this.run.rest;
    let b = 0;
    if (this.run.rooms.rest) for (const kind of REST_KINDS) for (let i = 0; i < r[kind]; i++) b += REST[kind].bonus[i];
    if (this.run.rooms.toilet) {
      b += TOILET_BONUS;
      for (let i = 0; i < this.run.toilet.length; i++) {
        if (this.run.toilet[i] > 0) b += TOILET_STALLS.bonus[i];
      }
    }
    return b;
  }

  toiletStallOpen(i: number): boolean {
    return !!this.run.toilet[i];
  }

  toiletStallAvailable(i: number): boolean {
    if (!this.run.rooms.toilet) return false;
    if (this.run.toilet[i] > 0) return false;
    if (i === 0) return this.run.toilet[0] === 0;
    return this.run.toilet[i - 1] > 0;
  }

  toiletStallCost(i: number): number {
    const mult = TOILET_STALLS.cost[i];
    return roomUnlockCost('toilet') * mult * this.levelCostMult();
  }

  buyToiletStall(i: number): boolean {
    if (!this.toiletStallAvailable(i)) return false;
    const cost = this.toiletStallCost(i);
    if (!this.pay(cost)) return false;
    this.run.toilet[i] = 1;
    this.emit({ type: 'toiletStall', stall: i });
    return true;
  }

  payoutTime(d: number): number {
    return PAYOUT_SEC * (1 - 0.02 * this.shopLevel(`speed${d}`)) * this.company().payoutMult * (1 - perkPower(this, 'speed'));
  }

  furnBonus(d: number, k: number): number {
    let b = 0;
    for (const tier of this.run.furn[d][k]) b += furnTierBonusTotal(tier);
    for (const has of this.run.singles[d][k]) if (has) b += FURN_SINGLE_BONUS;
    return b * this.company().furnBonusMult;
  }

  /** «Корпоративная культура»: множитель прошлых компаний × (1 + 1% за уровень в текущей). */
  cultureMult(): number {
    return this.state.cultureBank * (1 + 0.01 * this.state.companyCulture);
  }

  isAvral(): boolean {
    return this.avralLeft > 0;
  }

  /** Все множители дохода отдела, кроме мебели. */
  deptMult(d: number, withAvral = true): number {
    let m = this.cultureMult() * (1 + 0.05 * this.shopLevel(`income${d}`)) * (1 + this.restBonus());
    if (this.run.managers[d]) m *= 1 + MANAGER_BONUS;
    m *= this.company().incomeMult * this.event.incomeMult * (this.event.deptMult[d] ?? 1);
    m *= perkPower(this, 'income') || 1;
    if (withAvral && this.isAvral()) m *= AVRAL_MULT;
    return m;
  }

  payoutOf(d: number, k: number, withAvral = true): number {
    const L = this.level(d, k);
    if (L <= 0) return 0;
    return payoutIncome(d, k, L, this.furnBonus(d, k)) * this.deptMult(d, withAvral);
  }

  /** Доход в секунду. passive = без «Аврала» (так считается офлайн и награды). */
  incomePerSec(passive = false): number {
    let sum = 0;
    for (let d = 0; d < DEPT_COUNT; d++) {
      if (!this.run.depts[d]) continue;
      const t = this.payoutTime(d);
      for (let k = 0; k < DESKS; k++) sum += this.payoutOf(d, k, !passive) / t;
    }
    return sum;
  }

  deptIncomePerSec(d: number, withAvral = true): number {
    let sum = 0;
    const t = this.payoutTime(d);
    for (let k = 0; k < DESKS; k++) sum += this.payoutOf(d, k, withAvral) / t;
    return sum;
  }

  progress(d: number, k: number): number {
    return Math.min(1, this.timers[d][k] / this.payoutTime(d));
  }

  // ---------- время ----------

  private earn(amount: number): void {
    if (!(amount > 0)) return;
    this.run.coins += amount;
    this.run.earned += amount;
    this.state.totalEarned += amount;
    this.state.stats.earned += amount;
  }

  /** Даёт деньги со стороны (задания) — тоже считается заработком. */
  grant(amount: number, source: 'offline' | 'quest'): void {
    this.earn(amount);
    this.emit({ type: 'income', amount, source });
  }

  private ticketDelay(): number {
    const base = TICKET_EVERY_MIN + this.rng() * (TICKET_EVERY_MAX - TICKET_EVERY_MIN);
    return base / Math.max(0.1, this.event.ticketFreqMult * (perkPower(this, 'tickets') || 1));
  }

  /**
   * Продвигает время на dt секунд. active = игра открыта и игрок смотрит:
   * только тогда появляются тикеты.
   */
  tick(dt: number, active = true): void {
    if (active) tickPerks(this, dt);
    // «Аврал»: таймеры
    if (this.avralLeft > 0) {
      this.avralLeft -= dt;
      if (this.avralLeft <= 0) {
        this.avralLeft = 0;
        this.avralCooldown = AVRAL_COOLDOWN;
        this.emit({ type: 'avral', on: false });
      }
    } else if (this.avralCooldown > 0) {
      this.avralCooldown = Math.max(0, this.avralCooldown - dt);
    }

    for (let d = 0; d < DEPT_COUNT; d++) {
      if (!this.run.depts[d]) continue;
      const T = this.payoutTime(d);
      for (let k = 0; k < DESKS; k++) {
        if (this.run.levels[d][k] <= 0) continue;
        this.timers[d][k] += dt;
        while (this.timers[d][k] >= T) {
          this.timers[d][k] -= T;
          const amount = this.payoutOf(d, k);
          this.earn(amount);
          this.emit({ type: 'payout', payout: { dept: d, desk: k, amount } });
        }
      }
    }

    // тикеты живут и появляются только пока игра открыта
    for (let i = this.tickets.length - 1; i >= 0; i--) {
      const t = this.tickets[i];
      t.left -= dt;
      if (t.left <= 0) {
        this.tickets.splice(i, 1);
        this.emit({ type: 'ticketGone', id: t.id, collected: false, reward: 0 });
      }
    }
    if (active) {
      this.nextTicketIn -= dt;
      if (this.nextTicketIn <= 0) {
        this.nextTicketIn = this.ticketDelay();
        this.spawnTicket();
      }
    }
  }

  private spawnTicket(): void {
    if (this.tickets.length >= 3) return;
    const free: [number, number][] = [];
    for (let d = 0; d < DEPT_COUNT; d++) {
      if (!this.run.depts[d]) continue;
      for (let k = 0; k < DESKS; k++) {
        if (this.run.levels[d][k] > 0 && !this.tickets.some((t) => t.dept === d && t.desk === k)) free.push([d, k]);
      }
    }
    if (free.length === 0) return;
    const [dept, desk] = free[Math.floor(this.rng() * free.length)];
    const ticket: Ticket = { id: this.ticketSeq++, dept, desk, left: TICKET_TTL };
    this.tickets.push(ticket);
    this.emit({ type: 'ticketSpawn', ticket });
  }

  ticketReward(): number {
    return this.incomePerSec(true) * TICKET_REWARD_SEC * this.company().ticketMult;
  }

  collectTicket(id: number): number {
    const i = this.tickets.findIndex((t) => t.id === id);
    if (i < 0) return 0;
    this.tickets.splice(i, 1);
    const reward = this.ticketReward();
    this.earn(reward);
    this.state.stats.tickets++;
    this.emit({ type: 'ticketGone', id, collected: true, reward });
    return reward;
  }

  canAvral(): boolean {
    return this.run.rooms.director && this.avralLeft <= 0 && this.avralCooldown <= 0;
  }

  startAvral(): boolean {
    if (!this.canAvral()) return false;
    this.avralLeft = AVRAL_SEC;
    this.state.stats.avrals++;
    this.emit({ type: 'avral', on: true });
    return true;
  }

  offlineCapSec(): number {
    return this.company().offlineCapH * 3600 || OFFLINE_CAP_SEC;
  }

  /** Начисляет офлайн-доход за seconds (не больше предела). Возвращает начисленное. */
  applyOffline(seconds: number): { amount: number; seconds: number } {
    const s = Math.max(0, Math.min(seconds, this.offlineCapSec()));
    const amount = this.incomePerSec(true) * s;
    if (amount > 0) {
      this.earn(amount);
      this.emit({ type: 'income', amount, source: 'offline' });
    }
    return { amount, seconds: s };
  }

  // ---------- покупки ----------

  canAfford(cost: number): boolean {
    return Number.isFinite(cost) && cost <= this.run.coins + EPS * Math.max(1, cost);
  }

  private pay(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.run.coins = Math.max(0, this.run.coins - cost);
    return true;
  }

  costOfLevels(d: number, k: number, n: number): number {
    return costForLevels(d, k, this.level(d, k), n) * this.levelCostMult();
  }

  maxLevels(d: number, k: number): number {
    return maxAffordable(d, k, this.level(d, k), this.run.coins * (1 + EPS), this.levelCostMult());
  }

  buyLevels(d: number, k: number, n: number): boolean {
    if (n <= 0 || !this.isHired(d, k)) return false;
    if (!this.pay(this.costOfLevels(d, k, n))) return false;
    this.run.levels[d][k] += n;
    this.state.stats.levelsBought += n;
    this.emit({ type: 'levels', dept: d, desk: k, n });
    return true;
  }

  /** Место k в отделе d можно занять: отдел открыт, место пустое, предыдущий сотрудник прокачан. */
  hireAvailable(d: number, k: number): boolean {
    if (!this.run.depts[d] || this.isHired(d, k) || k === 0) return false;
    return this.level(d, k - 1) >= HIRE_GATES[k - 1];
  }

  /** Следующее пустое место в отделе (или -1). */
  nextDesk(d: number): number {
    for (let k = 0; k < DESKS; k++) if (!this.isHired(d, k)) return k;
    return -1;
  }

  /** Найм: формула или минута-другая дохода отдела — что больше. */
  hireCost(d: number, k: number): number {
    const floor = this.deptIncomePerSec(d, false) * (TUNING.hireFloorSec[k] ?? 0);
    return Math.max(hireBase(d, k) * this.levelCostMult(), floor);
  }

  hire(d: number, k: number): boolean {
    if (!this.hireAvailable(d, k)) return false;
    if (!this.pay(this.hireCost(d, k))) return false;
    this.run.levels[d][k] = 1;
    this.timers[d][k] = 0;
    this.state.stats.hires++;
    this.emit({ type: 'hire', dept: d, desk: k });
    return true;
  }

  unlockAvailable(d: number): boolean {
    return d > 0 && !this.run.depts[d] && this.prevOpen({ kind: 'dept', d });
  }

  unlockCost(d: number): number {
    return deptUnlockCost(d) * this.levelCostMult();
  }

  unlock(d: number): boolean {
    if (!this.unlockAvailable(d)) return false;
    if (!this.pay(this.unlockCost(d))) return false;
    this.run.depts[d] = true;
    this.run.levels[d][0] = 1;
    this.timers[d][0] = 0;
    this.emit({ type: 'unlock', dept: d });
    return true;
  }

  roomUnlockAvailable(id: RoomId): boolean {
    return !this.run.rooms[id] && this.prevOpen({ kind: 'room', id });
  }

  // ---------- кабинет директора ----------

  /** Уровень предмета кабинета директора (стол из обучения — не ниже 1). */
  dirTier(item: DirItem): number {
    const t = this.run.dir[item];
    return item === 'desk' && this.state.directorDesk > 0 ? Math.max(1, t) : t;
  }

  dirCost(item: DirItem): number {
    const t = this.dirTier(item);
    return t >= 3 ? Infinity : roomUnlockCost('director') * DIR_TIER_COST[t] * this.furnCostMult();
  }

  buyDir(item: DirItem): boolean {
    if (!this.roomOpen('director') || this.dirTier(item) >= 3) return false;
    if (!this.pay(this.dirCost(item))) return false;
    this.run.dir[item] = this.dirTier(item) + 1;
    this.state.stats.furnBought++;
    this.emit({ type: 'dirFurn' });
    return true;
  }

  dirSingleCost(id: DirSingle): number {
    return this.run.dir[id] ? Infinity : roomUnlockCost('director') * DIR_SINGLE_COST[id] * this.furnCostMult();
  }

  buyDirSingle(id: DirSingle): boolean {
    if (!this.roomOpen('director') || this.run.dir[id]) return false;
    if (!this.pay(this.dirSingleCost(id))) return false;
    this.run.dir[id] = true;
    this.state.stats.furnBought++;
    this.emit({ type: 'dirFurn' });
    return true;
  }

  /** Насколько обстановка кабинета увеличивает награды за задания директора (0.4 = +40%). */
  dirBonus(): number {
    let b = 0;
    for (const item of ['desk', 'chair', 'monitor', 'keyboard'] as DirItem[]) {
      const t = this.run.dir[item]; // бесплатный стол из обучения бонуса не даёт
      for (let i = 0; i < t; i++) b += DIR_TIER_BONUS[i];
    }
    for (const id of DIR_SINGLES) if (this.run.dir[id]) b += DIR_SINGLE_BONUS;
    return b;
  }

  roomCost(id: RoomId): number {
    return roomUnlockCost(id) * this.levelCostMult();
  }

  unlockRoom(id: RoomId): boolean {
    if (!this.roomUnlockAvailable(id)) return false;
    if (!this.pay(this.roomCost(id))) return false;
    this.run.rooms[id] = true;
    // инициализация кабинок при покупке туалета
    if (id === 'toilet' && (!this.run.toilet || this.run.toilet[0] !== 1)) {
      this.run.toilet = [1, 0, 0, 0];
    }
    this.emit({ type: 'room', id });
    return true;
  }

  managerAvailable(d: number): boolean {
    return this.run.depts[d] && !this.run.managers[d] && this.isHired(d, MANAGER_NEEDS_DESK);
  }

  managerCost(d: number): number {
    return managerCost(d) * this.levelCostMult();
  }

  buyManager(d: number): boolean {
    if (!this.managerAvailable(d)) return false;
    if (!this.pay(this.managerCost(d))) return false;
    this.run.managers[d] = true;
    this.emit({ type: 'manager', dept: d });
    return true;
  }

  furnTier(d: number, k: number, i: number): number {
    return this.run.furn[d][k][i];
  }

  furnCost(d: number, k: number, i: number): number {
    const tier = this.furnTier(d, k, i);
    return tier >= 3 ? Infinity : furnTierCost(d, k, tier) * this.furnCostMult();
  }

  buyFurn(d: number, k: number, i: number): boolean {
    if (!this.isHired(d, k) || this.furnTier(d, k, i) >= 3) return false;
    if (!this.pay(this.furnCost(d, k, i))) return false;
    this.run.furn[d][k][i]++;
    this.state.stats.furnBought++;
    this.emit({ type: 'furn', dept: d, desk: k });
    return true;
  }

  singleCost(d: number, k: number, j: number): number {
    return this.run.singles[d][k][j] ? Infinity : furnSingleCost(d, k, j) * this.furnCostMult();
  }

  buySingle(d: number, k: number, j: number): boolean {
    if (!this.isHired(d, k) || this.run.singles[d][k][j]) return false;
    if (!this.pay(this.singleCost(d, k, j))) return false;
    this.run.singles[d][k][j] = true;
    this.state.stats.furnBought++;
    this.emit({ type: 'furn', dept: d, desk: k });
    return true;
  }

  restCost(kind: RestKind): number {
    const lvl = this.run.rest[kind];
    const costs = REST[kind].cost;
    return lvl >= costs.length ? Infinity : costs[lvl] * this.company().costMult;
  }

  restMax(kind: RestKind): number {
    return REST[kind].cost.length;
  }

  buyRest(kind: RestKind): boolean {
    if (!this.run.rooms.rest || this.run.rest[kind] >= this.restMax(kind)) return false;
    if (!this.pay(this.restCost(kind))) return false;
    this.run.rest[kind]++;
    this.state.stats.restBought++;
    this.emit({ type: 'rest', kind });
    return true;
  }

  // ---------- Гранты и реорганизация ----------

  grantsDiv(): number {
    return grantsDivBase() * this.company().costMult;
  }

  pendingGrants(): number {
    return grantsFor(this.run.earned, this.shopLevel('lobby'), this.grantsDiv());
  }

  canReorg(): boolean {
    return this.pendingGrants() >= GRANTS_MIN;
  }

  /** Подсказка: выгодно, когда к получению не меньше, чем уже получено. */
  reorgIsGood(): boolean {
    return this.canReorg() && this.pendingGrants() >= this.state.companyGrants;
  }

  /** Сколько нужно заработать за забег, чтобы получить g Грантов. */
  earnedForGrants(g: number): number {
    const lobby = 1 + 0.05 * this.shopLevel('lobby');
    return this.grantsDiv() * (g / (TUNING.grantsK * lobby)) ** (1 / grantsPow());
  }

  startCapital(): number {
    const l = this.shopLevel('startCapital');
    return l > 0 ? scaleOld(200 * 4 ** l) * this.company().costMult : 0;
  }

  private resetRun(): void {
    this.state.run = newRun(this.startCapital());
    this.timers = this.freshTimers();
    this.tickets = [];
    this.avralLeft = 0;
    this.avralCooldown = 0;
  }

  reorg(force = false): number {
    const g = this.pendingGrants();
    if (!force && g < GRANTS_MIN) return 0;
    this.state.grants += g;
    this.state.grantsEarned += g;
    this.state.companyGrants += g;
    this.state.reorgs++;
    this.state.stats.reorgs++;
    this.resetRun();
    this.emit({ type: 'reorg', grants: g });
    return g;
  }

  shopCost(key: string): number {
    const item = shopItem(key);
    if (!item) return Infinity;
    const l = this.shopLevel(key);
    if (l >= item.max) return Infinity;
    // Цена культуры начинается заново в каждой компании, набранный бонус остаётся.
    return item.cost(key === 'culture' ? this.state.companyCulture : l);
  }

  buyShop(key: string): boolean {
    const cost = this.shopCost(key);
    if (!Number.isFinite(cost) || cost > this.state.grants) return false;
    this.state.grants -= cost;
    this.state.shop[key] = this.shopLevel(key) + 1;
    if (key === 'culture') this.state.companyCulture++;
    this.emit({ type: 'shop', key });
    return true;
  }

  /** Тратит все Гранты на самое дешёвое — так «тратит» симуляция и кнопка «Распределить». */
  spendGrantsCheapest(): number {
    let bought = 0;
    for (;;) {
      let best: { key: string; cost: number } | null = null;
      for (const item of SHOP) {
        const c = this.shopCost(item.key);
        if (c <= this.state.grants && (!best || c < best.cost)) best = { key: item.key, cost: c };
      }
      if (!best || !this.buyShop(best.key)) return bought;
      bought++;
    }
  }

  // ---------- конец офиса ----------

  /** Всё куплено: сотрудники, руководители, мебель, зона отдыха. */
  isComplete(): boolean {
    const r = this.run;
    for (let d = 0; d < DEPT_COUNT; d++) {
      if (!r.depts[d] || !r.managers[d]) return false;
      for (let k = 0; k < DESKS; k++) {
        if (r.levels[d][k] <= 0) return false;
        if (r.furn[d][k].some((t) => t < 3)) return false;
        if (r.singles[d][k].some((x) => !x)) return false;
      }
    }
    if (!ROOM_IDS.every((id) => r.rooms[id])) return false;
    return REST_KINDS.every((kind) => r.rest[kind] >= this.restMax(kind));
  }

  /** Сколько процентов офиса выкуплено (для полоски «до смены компании»). */
  completion(): number {
    const r = this.run;
    let have = 0;
    let total = 0;
    for (let d = 0; d < DEPT_COUNT; d++) {
      total += 2;
      if (r.depts[d]) have++;
      if (r.managers[d]) have++;
      for (let k = 0; k < DESKS; k++) {
        total += 1 + r.furn[d][k].length * 3 + r.singles[d][k].length;
        if (r.levels[d][k] > 0) have++;
        for (const t of r.furn[d][k]) have += t;
        for (const x of r.singles[d][k]) if (x) have++;
      }
    }
    for (const kind of REST_KINDS) {
      total += this.restMax(kind);
      have += r.rest[kind];
    }
    for (const id of ROOM_IDS) {
      total++;
      if (r.rooms[id]) have++;
    }
    return have / total;
  }

  changeCompany(): boolean {
    if (!this.isComplete()) return false;
    const g = this.pendingGrants();
    this.state.grants += g;
    this.state.grantsEarned += g;
    this.state.reorgs++;
    this.state.stats.reorgs++;
    this.state.company++;
    this.state.companyGrants = 0;
    this.state.cultureBank = this.cultureMult();
    this.state.companyCulture = 0;
    this.resetRun();
    this.emit({ type: 'company', company: this.state.company });
    return true;
  }
}
