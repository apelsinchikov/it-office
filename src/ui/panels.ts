// Содержимое выдвижных панелей: отдел, зона отдыха, директор, Гранты, задания, коллекция, настройки.

import type { Purchase } from '../game/advisor';
import { ACHIEVEMENTS } from '../game/achievements';
import { COMPANY_STYLES, DEPTS, DESKS, SEQUENCE, SHOP, companyDef, stepIndex, type RoomId, type Step } from '../game/config';
import { PERKS, TIER_NAMES, acceptTask, declineTask, inventoryList, perkCashSec, perkDuration, taskProgress, usePerk, type PerkKind, type Tier } from '../game/director';
import { DIR_ITEMS, DIR_SINGLES, DIR_SINGLE_BONUS, DIR_TIER_BONUS, FURN_SINGLE_BONUS, FURN_TIER_BONUS, HIRE_GATES, REST, REST_KINDS, TOILET_BONUS, TOILET_STALLS, nextMilestone, payoutIncome, type RestKind } from '../game/economy';
import { formatNumber } from '../game/format';
import { loadLeaderboard, remoteAvailable, type RatingRow } from '../game/remote';
import type { Game } from '../game/game';
import { PHRASES, PHRASE_GROUPS, TOTAL_PHRASES, phraseId, type PhraseGroup } from '../game/phrases';
import { CHAIN, DAILY, LONG, chainCurrent, chainReward, claimChain, claimDaily, claimLong, dailyProgress, dailyReward, longReady } from '../game/quests';
import { NAMES, duration, getLang, t, tr, type Key } from '../i18n';
import type { RoomDef } from '../scene/layout';
import { ICONS, h } from './dom';

export type BuyMode = 1 | 10 | 'max';

export interface Ctx {
  game: Game;
  mode(): BuyMode;
  setMode(m: BuyMode): void;
  best(): Purchase | undefined;
  sfx(s: 'buy' | 'hire' | 'click' | 'error' | 'reorg' | 'coin'): void;
  toast(text: string): void;
  rebuild(): void;
  expanded: Set<string>;
  onAvral(): void;
  onDirectorDesk(): void;
  onLang(l: 'ru' | 'en'): void;
  onSound(on: boolean): void;
  onReset(): void;
  onTutorial(): void;
  onReorg(): void;
  onCompany(): void;
  cloud: boolean;
  version: string;
}

export interface Panel {
  title: string;
  sub?: () => string;
  body: HTMLElement;
  refresh(): void;
}

const fmt = formatNumber;

interface BuyButton {
  el: HTMLButtonElement;
  set(o: { label?: string; cost?: string; enabled: boolean; best?: boolean; done?: boolean }): void;
}

function buyButton(onBuy: () => boolean, ctx: Ctx, small = false, sfx: 'buy' | 'hire' = 'buy'): BuyButton {
  const label = h('span', { class: 'b-label' });
  const cost = h('span', { class: 'b-cost' });
  const badge = h('span', { class: 'b-best', text: t('best') });
  const el = h('button', { class: small ? 'buy sm' : 'buy' }, label, cost, badge);
  el.addEventListener('click', () => {
    if (onBuy()) {
      ctx.sfx(sfx);
      ctx.rebuild();
    } else ctx.sfx('error');
  });
  return {
    el,
    set(o) {
      if (o.label !== undefined) label.textContent = o.label;
      cost.textContent = o.cost ?? '';
      el.disabled = !o.enabled;
      el.classList.toggle('done', !!o.done);
      badge.style.display = o.best ? '' : 'none';
    },
  };
}

function same(p: Purchase | undefined, kind: Purchase['kind'], d?: number, k?: number, i?: number): boolean {
  if (!p || p.kind !== kind) return false;
  if ('d' in p && d !== undefined && p.d !== d) return false;
  if ('k' in p && k !== undefined && p.k !== k) return false;
  if (p.kind === 'furn' && i !== undefined && p.i !== i) return false;
  if (p.kind === 'single' && i !== undefined && p.j !== i) return false;
  return true;
}

function dots(n: number, max: number): HTMLElement {
  const el = h('span', { class: 'dots', aria: `${n}/${max}` });
  for (let i = 0; i < max; i++) el.append(h('i', { class: i < n ? 'on' : '' }));
  return el;
}

function modes(ctx: Ctx): HTMLElement {
  const wrap = h('div', { class: 'modes' });
  for (const m of [1, 10, 'max'] as BuyMode[]) {
    const b = h('button', { class: 'mode' + (ctx.mode() === m ? ' active' : ''), text: m === 'max' ? t('max') : `×${m}` });
    b.addEventListener('click', () => {
      ctx.setMode(m);
      ctx.sfx('click');
      ctx.rebuild();
    });
    wrap.append(b);
  }
  return wrap;
}

/** Подсказка, что значит значок «Быстрее окупится». */
function bestHint(): HTMLElement {
  return h('p', { class: 'note small best-hint' }, h('span', { class: 'b-best inline', text: t('best') }), ` ${t('best.hint')}`);
}

export function stepName(st: Step): string {
  return st.kind === 'dept' ? deptName(st.d) : t(`room.${st.id}` as Key);
}

/** Что нужно открыть перед этим шагом. */
function prevStepName(st: Step): string {
  const i = stepIndex(st);
  return i > 0 ? stepName(SEQUENCE[i - 1]) : '';
}

/** Закрытая комната (директор, отдых, туалет): описание и кнопка открытия. */
function roomLockedPanel(ctx: Ctx, id: RoomId): Panel {
  const g = ctx.game;
  const txt = h('p', { class: 'note', text: t(`room.lockDesc.${id}` as Key) });
  const need = h('p', { class: 'note small' });
  const btn = buyButton(() => g.unlockRoom(id), ctx, false, 'hire');
  const body = h('div', { class: 'panel-body' }, h('div', { class: 'card col' }, txt, need, btn.el));
  return {
    title: t(`room.${id}` as Key),
    body,
    refresh() {
      if (g.roomUnlockAvailable(id)) {
        need.textContent = '';
        const cost = g.roomCost(id);
        btn.set({ label: t('room.unlock'), cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'room') && (ctx.best() as { id: RoomId }).id === id });
      } else {
        need.textContent = t('need.open', { name: prevStepName({ kind: 'room', id }) });
        btn.set({ label: t('locked'), enabled: false });
      }
    },
  };
}

export function deptName(d: number): string {
  return t(`room.${DEPTS[d].id}` as Key);
}

function workerName(d: number, k: number): string {
  return NAMES[getLang()][d][k];
}

// ---------- отдел ----------

export function deptPanel(ctx: Ctx, d: number): Panel {
  const g = ctx.game;
  const body = h('div', { class: 'panel-body' });
  const refreshers: (() => void)[] = [];
  const title = deptName(d);

  if (!g.isUnlocked(d)) {
    const card = h('div', { class: 'card' });
    const txt = h('p', { class: 'note' });
    const btn = buyButton(() => g.unlock(d), ctx, false, 'hire');
    card.append(txt, btn.el);
    body.append(card);
    refreshers.push(() => {
      if (g.unlockAvailable(d)) {
        txt.textContent = t(`tut.dept${d}` as Key);
        const cost = g.unlockCost(d);
        btn.set({ label: t('dept.unlock'), cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'unlock', d) });
      } else {
        txt.textContent = t('need.open', { name: prevStepName({ kind: 'dept', d }) });
        btn.set({ label: t('locked'), enabled: false });
      }
    });
    return { title, body, refresh: () => refreshers.forEach((f) => f()) };
  }

  body.append(modes(ctx), bestHint());
  const def = DEPTS[d];
  for (let k = 0; k < DESKS; k++) {
    if (!g.isHired(d, k)) continue;
    const name = h('div', { class: 'w-name' });
    const inc = h('div', { class: 'w-inc' });
    const lv = buyButton(() => {
      const n = ctx.mode() === 'max' ? g.maxLevels(d, k) : (ctx.mode() as number);
      return g.buyLevels(d, k, n);
    }, ctx);
    const key = `${d}:${k}`;
    const toggle = h('button', { class: 'w-toggle' + (ctx.expanded.has(key) ? ' open' : ''), html: ICONS.chevron, aria: t('dept.furniture') });
    const row = h('div', { class: 'worker' }, h('div', { class: 'w-main' }, name, inc), lv.el, toggle);
    const furn = h('div', { class: 'furn' });
    furn.hidden = !ctx.expanded.has(key);
    toggle.addEventListener('click', () => {
      if (ctx.expanded.has(key)) ctx.expanded.delete(key);
      else ctx.expanded.add(key);
      furn.hidden = !ctx.expanded.has(key);
      toggle.classList.toggle('open', !furn.hidden);
    });
    def.items.forEach((item, i) => {
      const d0 = h('span', { class: 'f-dots' });
      const btn = buyButton(() => g.buyFurn(d, k, i), ctx, true);
      furn.append(h('div', { class: 'f-item' }, h('span', { class: 'f-name', text: t(`item.${item}` as Key) }), d0, btn.el));
      refreshers.push(() => {
        const tier = g.furnTier(d, k, i);
        d0.replaceChildren(dots(tier, 3));
        if (tier >= 3) btn.set({ label: t('maxed'), enabled: false, done: true });
        else {
          const cost = g.furnCost(d, k, i);
          btn.set({ label: `+${Math.round(FURN_TIER_BONUS[tier] * 100 * g.company().furnBonusMult)}%`, cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'furn', d, k, i) });
        }
      });
    });
    def.singles.forEach((s, j) => {
      const btn = buyButton(() => g.buySingle(d, k, j), ctx, true);
      furn.append(h('div', { class: 'f-item' }, h('span', { class: 'f-name', text: t(`item.${s}` as Key) }), h('span', { class: 'f-dots' }), btn.el));
      refreshers.push(() => {
        if (g.run.singles[d][k][j]) btn.set({ label: '✓', enabled: false, done: true });
        else {
          const cost = g.singleCost(d, k, j);
          btn.set({ label: `+${Math.round(FURN_SINGLE_BONUS * 100 * g.company().furnBonusMult)}%`, cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'single', d, k, j) });
        }
      });
    });
    body.append(row, furn);
    refreshers.push(() => {
      const L = g.level(d, k);
      name.innerHTML = '';
      name.append(workerName(d, k), h('span', { class: 'w-lvl', text: ` ${t('level')} ${L}` }));
      const m = nextMilestone(L);
      inc.textContent = `+${fmt(g.payoutOf(d, k, false))} ${t('per10')} · ${t('dept.toMilestone', { n: m - L })}`;
      let n = ctx.mode() === 'max' ? g.maxLevels(d, k) : (ctx.mode() as number);
      const ok = n > 0 && g.canAfford(g.costOfLevels(d, k, n));
      if (n === 0) n = 1;
      lv.set({ label: `+${n} ${t('level')}`, cost: fmt(g.costOfLevels(d, k, n)), enabled: ok, best: same(ctx.best(), 'levels', d, k) });
    });
  }

  // следующий сотрудник
  const next = g.nextDesk(d);
  if (next > 0) {
    const txt = h('div', { class: 'w-inc' });
    const btn = buyButton(() => g.hire(d, next), ctx, false, 'hire');
    body.append(h('div', { class: 'card hire' }, h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: `${t('dept.nextHire')}: ${workerName(d, next)}` }), txt), btn.el));
    refreshers.push(() => {
      if (g.hireAvailable(d, next)) {
        const cost = g.hireCost(d, next);
        txt.textContent = `+${fmt(payoutIncome(d, next, 1) * g.deptMult(d, false))} ${t('per10')}`;
        btn.set({ label: t('hire'), cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'hire', d, next) });
      } else {
        txt.textContent = t('dept.hireNeed', { n: HIRE_GATES[next - 1], name: workerName(d, next - 1) });
        btn.set({ label: t('hire'), enabled: false });
      }
    });
  } else if (next < 0) body.append(h('p', { class: 'note small', text: t('dept.full') }));

  // руководитель
  const mTxt = h('div', { class: 'w-inc' });
  const mBtn = buyButton(() => g.buyManager(d), ctx, false, 'hire');
  body.append(h('div', { class: 'card' }, h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: t('dept.manager') }), mTxt), mBtn.el));
  refreshers.push(() => {
    if (g.run.managers[d]) {
      mTxt.textContent = t('dept.managerHired');
      mBtn.set({ label: '✓', enabled: false, done: true });
    } else if (g.managerAvailable(d)) {
      const cost = g.managerCost(d);
      mTxt.textContent = t('dept.managerDesc');
      mBtn.set({ label: t('hire'), cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'manager', d) });
    } else {
      mTxt.textContent = t('dept.managerNeed');
      mBtn.set({ label: t('hire'), enabled: false });
    }
  });

  return {
    title,
    sub: () => `${t('dept.income')}: +${fmt(g.deptIncomePerSec(d))}${t('perSec')}`,
    body,
    refresh: () => refreshers.forEach((f) => f()),
  };
}

// ---------- зона отдыха ----------

export function restPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  if (!g.roomOpen('rest')) return roomLockedPanel(ctx, 'rest');
  const body = h('div', { class: 'panel-body' }, h('p', { class: 'note', text: t('rest.desc') }), bestHint());
  const refs: (() => void)[] = [];
  for (const kind of REST_KINDS) {
    const info = h('div', { class: 'w-inc' });
    const d0 = h('span', { class: 'f-dots' });
    const btn = buyButton(() => g.buyRest(kind), ctx);
    body.append(h('div', { class: 'worker' }, h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: t(`rest.${kind}` as Key) }), info, d0), btn.el));
    refs.push(() => {
      const lvl = g.run.rest[kind];
      const max = g.restMax(kind);
      d0.replaceChildren(dots(lvl, max));
      const total = REST[kind].bonus.slice(0, lvl).reduce((a, b) => a + b, 0);
      info.textContent = t('rest.bonus', { n: Math.round(total * 100) });
      if (lvl >= max) btn.set({ label: t('maxed'), enabled: false, done: true });
      else {
        const cost = g.restCost(kind);
        btn.set({ label: `+${Math.round(REST[kind].bonus[lvl] * 100)}%`, cost: fmt(cost), enabled: g.canAfford(cost), best: same(ctx.best(), 'rest') && (ctx.best() as { rest: RestKind }).rest === kind });
      }
    });
  }
  return { title: t('room.rest'), body, refresh: () => refs.forEach((f) => f()) };
}

// ---------- директор, холл, туалет ----------

export function perkTitle(kind: PerkKind, tier: Tier, g?: Game): string {
  const pw = PERKS[kind].power[tier];
  if (kind === 'speed') return t('perk.speed', { n: Math.round(pw * 100) });
  if (kind === 'income') return t('perk.income', { n: pw });
  if (kind === 'tickets') return t('perk.tickets', { n: pw });
  return t('perk.cash', { time: duration(g ? perkCashSec(g, tier) : pw) });
}

/** Перк с учётом обстановки кабинета (длительность и «деньги сразу» больше). */
function perkFull(g: Game, kind: PerkKind, tier: Tier): string {
  const dur = PERKS[kind].duration[tier] > 0 ? perkDuration(g, kind, tier) : 0;
  return dur > 0 ? `${perkTitle(kind, tier, g)} ${t('perk.for', { time: duration(dur) })}` : perkTitle(kind, tier, g);
}

export function taskText(kind: string, target: number): string {
  return t(`task.${kind}` as Key, { n: fmt(target) });
}

export function directorPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  if (!g.roomOpen('director')) return roomLockedPanel(ctx, 'director');
  const avral = h('button', { class: 'buy big avral-inline' });
  avral.addEventListener('click', () => ctx.onAvral());

  // задание
  const tTitle = h('div', { class: 'w-name' });
  const tInfo = h('div', { class: 'w-inc' });
  const tBar = h('div', { class: 'bar' }, h('i'));
  const accept = h('button', { class: 'buy sm', text: t('task.accept') });
  const decline = h('button', { class: 'mode', text: t('task.decline') });
  accept.addEventListener('click', () => {
    if (acceptTask(g, Date.now())) ctx.sfx('click');
    ctx.rebuild();
  });
  decline.addEventListener('click', () => {
    declineTask(g, Date.now());
    ctx.sfx('click');
    ctx.rebuild();
  });
  const tBtns = h('div', { class: 'row-btns' }, accept, decline);
  const taskCard = h('div', { class: 'card col task-card' }, tTitle, tInfo, tBar, tBtns, h('p', { class: 'note small', text: t('task.noPenalty') }));

  // инвентарь
  const inv = h('div', { class: 'inv' });
  const active = h('div', { class: 'inv' });
  let invSig = '';
  const drawInv = (): void => {
    const list = inventoryList(g);
    const sig = list.map((x) => `${x.kind}${x.tier}${x.count}`).join();
    if (sig === invSig && inv.childElementCount) return;
    invSig = sig;
    inv.replaceChildren();
    if (!list.length) inv.append(h('p', { class: 'note small', text: t('inv.empty') }));
    for (const it of list) {
      const use = h('button', { class: 'buy sm', text: t('inv.use') });
      use.addEventListener('click', () => {
        if (usePerk(g, it.kind, it.tier)) {
          ctx.sfx('coin');
          ctx.toast(t('perk.used'));
        }
        ctx.rebuild();
      });
      inv.append(
        h(
          'div',
          { class: 'worker' },
          h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: perkFull(g, it.kind, it.tier) }), h('div', { class: 'w-inc', text: `${tr(TIER_NAMES[it.tier])}${it.count > 1 ? ` · ${t('inv.count', { n: it.count })}` : ''}` })),
          use,
        ),
      );
    }
  };

  const body = h(
    'div',
    { class: 'panel-body' },
    h('p', { class: 'note', text: t('director.desc') }),
    avral,
    h('div', { class: 'section-head' }, h('h3', { text: t('task.title') })),
    taskCard,
    h('div', { class: 'section-head' }, h('h3', { text: t('inv.title') })),
    active,
    inv,
  );

  // обстановка кабинета: каждое улучшение увеличивает награды за задания
  const bonusNote = h('p', { class: 'note small' });
  body.append(h('div', { class: 'section-head' }, h('h3', { text: t('dir.room') })), bonusNote);
  const furnRefs: (() => void)[] = [];
  for (const item of DIR_ITEMS) {
    const d0 = h('span', { class: 'f-dots' });
    const btn = buyButton(() => g.buyDir(item), ctx, true);
    body.append(h('div', { class: 'f-item' }, h('span', { class: 'f-name', text: t(`item.${item}` as Key) }), d0, btn.el));
    furnRefs.push(() => {
      const tier = g.dirTier(item);
      d0.replaceChildren(dots(tier, 3));
      if (tier >= 3) btn.set({ label: t('maxed'), enabled: false, done: true });
      else {
        const cost = g.dirCost(item);
        btn.set({ label: t('dir.perItem', { n: Math.round(DIR_TIER_BONUS[tier] * 100) }), cost: fmt(cost), enabled: g.canAfford(cost) });
      }
    });
  }
  for (const id of DIR_SINGLES) {
    const btn = buyButton(() => g.buyDirSingle(id), ctx, true);
    body.append(h('div', { class: 'f-item' }, h('span', { class: 'f-name', text: t(`item.${id}` as Key) }), h('span', { class: 'f-dots' }), btn.el));
    furnRefs.push(() => {
      if (g.run.dir[id]) btn.set({ label: '✓', enabled: false, done: true });
      else {
        const cost = g.dirSingleCost(id);
        btn.set({ label: t('dir.perItem', { n: Math.round(DIR_SINGLE_BONUS * 100) }), cost: fmt(cost), enabled: g.canAfford(cost) });
      }
    });
  }
  return {
    title: t('room.director'),
    body,
    refresh() {
      if (g.isAvral()) avral.textContent = `${t('avral.active')} · ${Math.ceil(g.avralLeft)}`;
      else if (g.canAvral()) avral.textContent = `${t('avral')} ×3 · 30`;
      else avral.textContent = `${t('avral')} · ${Math.ceil(g.avralCooldown)}`;
      avral.disabled = !g.canAvral();
      bonusNote.textContent = t('dir.bonus', { n: Math.round(g.dirBonus() * 100) });
      furnRefs.forEach((f) => f());

      const ds = g.state.director;
      const task = ds.task;
      const now = Date.now();
      const bar = tBar.firstChild as HTMLElement;
      if (!task) {
        tTitle.textContent = t('task.next', { time: duration(Math.max(0, Math.ceil((ds.nextOfferAt - now) / 1000))) });
        tInfo.textContent = '';
        tBar.style.display = 'none';
        tBtns.style.display = 'none';
      } else if (task.endsAt === 0) {
        tTitle.textContent = taskText(task.kind, task.target);
        tInfo.textContent = t('task.offer', { tier: tr(TIER_NAMES[task.tier]), time: duration(task.duration) });
        tBar.style.display = 'none';
        tBtns.style.display = '';
      } else {
        const prog = taskProgress(g, task);
        tTitle.textContent = `${taskText(task.kind, task.target)} · ${fmt(Math.min(prog, task.target))}/${fmt(task.target)}`;
        tInfo.textContent = `${tr(TIER_NAMES[task.tier])} · ${t('task.left', { time: duration(Math.max(0, Math.ceil((task.endsAt - now) / 1000))) })}`;
        tBar.style.display = '';
        bar.style.width = `${Math.min(100, (prog / task.target) * 100)}%`;
        tBtns.style.display = 'none';
      }
      active.replaceChildren(
        ...ds.active.map((a) => h('div', { class: 'perk-active' }, h('span', { text: `${t('inv.active')}: ${perkTitle(a.kind, a.tier, g)}` }), h('b', { text: duration(Math.ceil(a.left)) }))),
      );
      drawInv();
    },
  };
}

export function notePanel(ctx: Ctx, def: RoomDef): Panel {
  if (def.kind === 'hall') {
    const key = 'hall.desc';
    return { title: t('room.hall' as Key), body: h('div', { class: 'panel-body' }, h('p', { class: 'note', text: t(key) })), refresh() {} };
  }
  if (def.kind === 'toilet') return toiletPanel(ctx);
  return roomLockedPanel(ctx, def.id as RoomId);
}

// ---------- туалет: кабинки ----------

export function toiletPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  if (!g.roomOpen('toilet')) return roomLockedPanel(ctx, 'toilet');
  const body = h('div', { class: 'panel-body' });
  const bonusEl = h('div', { class: 'stat' });
  const refs: (() => void)[] = [];

  // кабинки
  const stallRows: HTMLDivElement[] = [h('div', { class: 'stall-row' })];
  for (let i = 1; i < 4; i++) stallRows.push(h('div', { class: 'stall-row' }));
  stallRows.forEach((r) => body.appendChild(r));
  body.appendChild(bonusEl);

  const stallNames = [t('room.stall.1'), t('room.stall.2'), t('room.stall.3'), t('room.stall.4')];

  for (let i = 0; i < 4; i++) {
    const row = i === 0 ? stallRows[0] : stallRows[i];
    const open = g.toiletStallOpen(i);
    const cost = i === 0 ? 0 : g.toiletStallCost(i);

    const nameEl = h('span', { class: 'stall-name' });
    row.appendChild(nameEl);

    if (i > 0) {
      const buy = () => g.buyToiletStall(i);
      const btn = buyButton(buy, ctx);
      row.appendChild(btn.el);
      refs.push(() => {
        if (open) btn.set({ label: t('room.stall.opened'), enabled: false, done: true });
        else btn.set({ label: fmt(cost), cost: fmt(cost), enabled: g.canAfford(cost), best: false });
      });
    }

    const statusEl = h('span', { class: 'stall-status' });
    nameEl.appendChild(statusEl);

    refs.push(() => {
      if (open) {
        nameEl.textContent = stallNames[i];
        statusEl.textContent = '✓';
        if (i > 0) {
          const b = row.querySelector('button');
          if (b) b.remove();
        }
      } else {
        nameEl.textContent = stallNames[i];
        statusEl.textContent = '';
        if (i > 0) {
          const b = row.querySelector('button');
          if (!b) {
            const buy = () => g.buyToiletStall(i);
            const btn = buyButton(buy, ctx);
            row.appendChild(btn.el);
          }
        }
      }
    });
  }

  // базовое описание
  body.prepend(h('p', { class: 'note', text: t('toilet.desc') }));

  return {
    title: t('room.toilet'),
    body,
    refresh() {
      // обновить цены и доступность кнопок
      refs.forEach((f) => f());
      // показать суммарный бонус
      let totalBonus = TOILET_BONUS;
      for (let i = 0; i < 4; i++) if (g.toiletStallOpen(i)) totalBonus += TOILET_STALLS.bonus[i];
      bonusEl.textContent = `+${Math.round(totalBonus * 100)}% ${t('toilet.bonus')}`;
    },
  };
}

// ---------- Гранты ----------

export function grantsPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  const body = h('div', { class: 'panel-body' });
  const wallet = h('div', { class: 'stat-big' });
  const pending = h('div', { class: 'stat' });
  const earned = h('div', { class: 'stat' });
  const hint = h('p', { class: 'note small' });
  let armed = false;
  const reorg = h('button', { class: 'buy big danger' });
  reorg.addEventListener('click', () => {
    if (!g.canReorg()) return ctx.sfx('error');
    if (!armed) {
      armed = true;
      reorg.textContent = t('grants.confirm');
      setTimeout(() => {
        armed = false;
      }, 3000);
      return;
    }
    armed = false;
    ctx.onReorg();
  });
  const co = companyDef(g.state.company);
  const nextCo = companyDef(g.state.company + 1);
  const coTitle = h('div', { class: 'w-name', text: t('grants.companyNow', { n: g.state.company, name: t(`company.${co.style}` as Key) }) });
  const coTrait = h('div', { class: 'w-inc', text: t(`company.trait.${co.style}` as Key) });
  const coBar = h('div', { class: 'bar' }, h('i'));
  const coBtn = h('button', { class: 'buy' });
  let coArmed = false;
  coBtn.addEventListener('click', () => {
    if (!g.isComplete()) return ctx.sfx('error');
    // переезд — крупное решение: второе нажатие подтверждает
    if (!coArmed) {
      coArmed = true;
      coBtn.textContent = t('grants.confirm');
      setTimeout(() => {
        coArmed = false;
      }, 3000);
      return;
    }
    coArmed = false;
    ctx.onCompany();
  });
  body.append(
    h('div', { class: 'card col' }, wallet, pending, earned, hint, reorg, h('p', { class: 'note small', text: t('grants.reorgWhat') })),
    h('div', { class: 'card col' }, coTitle, coTrait, coBar, coBtn),
  );
  const spendAll = h('button', { class: 'mode wide', text: t('grants.spendAll') });
  spendAll.addEventListener('click', () => {
    if (g.spendGrantsCheapest() > 0) ctx.sfx('buy');
    ctx.rebuild();
  });
  body.append(h('div', { class: 'section-head' }, h('h3', { text: t('grants.shop') }), spendAll));
  const refs: (() => void)[] = [];
  for (const item of SHOP) {
    const name =
      item.kind === 'speed' || item.kind === 'income'
        ? t(`shop.${item.kind}` as Key, { dept: deptName(item.dept!) })
        : t(`shop.${item.kind}` as Key);
    const info = h('div', { class: 'w-inc' });
    const btn = h('button', { class: 'buy sm grants' });
    btn.addEventListener('click', () => {
      if (g.buyShop(item.key)) {
        ctx.sfx('buy');
        ctx.rebuild();
      } else ctx.sfx('error');
    });
    body.append(h('div', { class: 'worker' }, h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: name }), info), btn));
    refs.push(() => {
      const l = g.shopLevel(item.key);
      const d = t(`shop.${item.kind}.d` as Key);
      if (item.kind === 'culture') info.textContent = `${d} · ×${g.cultureMult().toFixed(2)}`;
      else if (item.kind === 'startCapital') info.textContent = `${d} · ${fmt(g.startCapital())}`;
      else info.textContent = `${d} · ${l}/${item.max}`;
      const cost = g.shopCost(item.key);
      if (!Number.isFinite(cost)) {
        btn.textContent = t('maxed');
        btn.disabled = true;
      } else {
        btn.innerHTML = `${ICONS.star}<span>${fmt(cost)}</span>`;
        btn.disabled = cost > g.state.grants;
      }
    });
  }
  return {
    title: t('grants.title'),
    body,
    refresh() {
      wallet.innerHTML = `${ICONS.star}<span>${fmt(g.state.grants)}</span> <small>${t('grants.wallet')}</small>`;
      const p = g.pendingGrants();
      pending.textContent = `${t('grants.pending')}: ${fmt(p)}`;
      earned.textContent = `${t('grants.earned')}: ${fmt(g.state.companyGrants)}`;
      if (!g.canReorg()) {
        hint.textContent = t('grants.reorgNeed', { n: fmt(g.earnedForGrants(20)) });
        hint.className = 'note small';
      } else if (g.reorgIsGood()) {
        hint.textContent = t('grants.reorgHintGood');
        hint.className = 'note small good';
      } else {
        hint.textContent = t('grants.reorgHintWait');
        hint.className = 'note small warn';
      }
      if (!armed) reorg.textContent = `${t('grants.reorg')} · +${fmt(p)}`;
      reorg.disabled = !g.canReorg();
      const pc = g.completion();
      (coBar.firstChild as HTMLElement).style.width = `${(pc * 100).toFixed(1)}%`;
      if (coArmed) {
        // ждём второго нажатия
      } else if (g.isComplete()) {
        coBtn.textContent = t('grants.companyGo', { name: t(`company.${nextCo.style}` as Key) });
        coBtn.disabled = false;
      } else {
        coBtn.textContent = t('grants.companyNeed', { n: Math.floor(pc * 100) });
        coBtn.disabled = true;
      }
      refs.forEach((f) => f());
    },
  };
}

// ---------- задания ----------

export function questsPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  const body = h('div', { class: 'panel-body' });
  const refs: (() => void)[] = [];
  body.append(h('div', { class: 'section-head' }, h('h3', { text: t('quests.daily') }), h('span', { class: 'note small', text: t('quests.dailyHint') })));
  g.state.quests.daily.forEach((q, i) => {
    const def = DAILY.find((x) => x.id === q.id);
    if (!def) return;
    const title = h('div', { class: 'w-name' });
    const bar = h('div', { class: 'bar' }, h('i'));
    const btn = h('button', { class: 'buy sm' });
    btn.addEventListener('click', () => {
      const r = claimDaily(g, i);
      if (r > 0) {
        ctx.sfx('coin');
        ctx.toast(`+${fmt(r)}`);
        ctx.rebuild();
      }
    });
    body.append(h('div', { class: 'worker' }, h('div', { class: 'w-main' }, title, bar), btn));
    refs.push(() => {
      const prog = dailyProgress(g, q);
      title.textContent = `${tr(def.title).replace('{n}', fmt(q.target))} · ${fmt(prog)}/${fmt(q.target)}`;
      (bar.firstChild as HTMLElement).style.width = `${Math.min(100, (prog / q.target) * 100)}%`;
      if (q.claimed) {
        btn.textContent = '✓';
        btn.disabled = true;
      } else {
        btn.textContent = prog >= q.target ? `${t('claim')} +${fmt(dailyReward(g))}` : `+${fmt(dailyReward(g))}`;
        btn.disabled = prog < q.target;
      }
    });
  });

  body.append(h('div', { class: 'section-head' }, h('h3', { text: t('quests.chain') }), h('span', { class: 'note small', text: `${Math.min(g.state.quests.chain, CHAIN.length)}/${CHAIN.length}` })));
  const cTitle = h('div', { class: 'w-name' });
  const cInfo = h('div', { class: 'w-inc', text: t('quests.chainReward') });
  const cBtn = h('button', { class: 'buy sm' });
  cBtn.addEventListener('click', () => {
    const r = claimChain(g);
    if (r > 0) {
      ctx.sfx('coin');
      ctx.toast(`+${fmt(r)}`);
      ctx.rebuild();
    }
  });
  body.append(h('div', { class: 'worker' }, h('div', { class: 'w-main' }, cTitle, cInfo), cBtn));
  refs.push(() => {
    const c = chainCurrent(g);
    if (!c) {
      cTitle.textContent = t('quests.chainDone');
      cBtn.textContent = '✓';
      cBtn.disabled = true;
      return;
    }
    cTitle.textContent = tr(c.title);
    const ok = c.check(g);
    cBtn.textContent = ok ? `${t('claim')} +${fmt(chainReward(g))}` : `+${fmt(chainReward(g))}`;
    cBtn.disabled = !ok;
  });

  body.append(h('div', { class: 'section-head' }, h('h3', { text: t('quests.long') })));
  for (const l of LONG) {
    const btn = h('button', { class: 'buy sm grants' });
    btn.addEventListener('click', () => {
      const r = claimLong(g, l.id);
      if (r > 0) {
        ctx.sfx('reorg');
        ctx.toast(t('quests.grantsReward', { n: r }));
        ctx.rebuild();
      }
    });
    body.append(h('div', { class: 'worker' }, h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: tr(l.title) })), btn));
    refs.push(() => {
      if (g.state.quests.longClaimed.includes(l.id)) {
        btn.textContent = '✓';
        btn.disabled = true;
      } else {
        btn.innerHTML = `${ICONS.star}<span>+${l.grants}</span>`;
        btn.disabled = !longReady(g, l.id);
      }
    });
  }
  return { title: t('nav.quests'), body, refresh: () => refs.forEach((f) => f()) };
}

// ---------- коллекция ----------

const GROUP_TITLE: Record<PhraseGroup, Key> = {
  director: 'room.director',
  directorPC: 'room.director',
  support: 'room.support',
  supportLead: 'room.support',
  dev: 'room.dev',
  devLead: 'room.dev',
  qa: 'room.qa',
  qaLead: 'room.qa',
  analysts: 'room.analysts',
  analystsLead: 'room.analysts',
  sysadmins: 'room.sysadmins',
  sysadminsLead: 'room.sysadmins',
  coffee: 'rest.coffee',
  sofa: 'room.rest',
  toilet: 'room.toilet',
  edge: 'room.hall',
  bonus: 'quests.chain',
  bank: 'company.bank',
  studio: 'company.studio',
  space: 'company.space',
  newyear: 'event.newyear',
  sysadminDay: 'event.sysadminDay',
  hackathon: 'event.hackathon',
  kirillBday: 'event.kirillBday',
};

export function collectionPanel(ctx: Ctx, tab: { v: 'ach' | 'phr' }): Panel {
  const g = ctx.game;
  const body = h('div', { class: 'panel-body' });
  const tabs = h('div', { class: 'modes' });
  for (const [v, k] of [
    ['ach', 'col.achievements'],
    ['phr', 'col.phrases'],
  ] as const) {
    const b = h('button', { class: 'mode' + (tab.v === v ? ' active' : ''), text: t(k) });
    b.addEventListener('click', () => {
      tab.v = v;
      ctx.rebuild();
    });
    tabs.append(b);
  }
  body.append(tabs);
  if (tab.v === 'ach') {
    const grid = h('div', { class: 'ach-grid' });
    for (const a of ACHIEVEMENTS) {
      const got = g.state.achievements.includes(a.id);
      grid.append(h('div', { class: 'ach' + (got ? ' got' : '') }, h('span', { class: 'ach-icon', html: got ? ICONS.star : ICONS.lock }), h('span', { text: tr(a.title) })));
    }
    body.append(h('p', { class: 'note small', text: `${g.state.achievements.length}/${ACHIEVEMENTS.length}` }), grid);
  } else {
    const seen = new Set(g.state.phrasesSeen);
    body.append(h('p', { class: 'note small', text: t('col.heard', { n: seen.size, total: TOTAL_PHRASES }) }));
    for (const grp of PHRASE_GROUPS) {
      const list = PHRASES[grp];
      const heard = list.filter((_, i) => seen.has(phraseId(grp, i)));
      const lead = grp.endsWith('Lead') ? ` · ${t('dept.manager')}` : '';
      const det = h('details', { class: 'phr' });
      det.append(h('summary', { text: `${t(GROUP_TITLE[grp])}${lead} — ${heard.length}/${list.length}` }));
      list.forEach((p, i) => {
        const heardIt = seen.has(phraseId(grp, i));
        const star = p.rare ? '★ ' : '';
        det.append(h('p', { class: (heardIt ? 'phr-line' : 'phr-line unknown') + (p.rare ? ' rare' : ''), text: heardIt ? `${star}«${p[getLang()]}»` : star + t(p.rare ? 'col.unknownRare' : 'col.unknown') }));
      });
      body.append(det);
    }
  }
  return { title: t('nav.collection'), body, refresh() {} };
}

// ---------- рейтинг ----------

function ratingRow(r: RatingRow): HTMLElement {
  return h(
    'div',
    { class: 'rating-row' + (r.me ? ' me' : '') },
    h('span', { class: 'rating-place', text: String(r.place) }),
    h(
      'span',
      { class: 'rating-who' },
      h('span', { class: 'rating-name', text: (r.name || t('rating.noName')) + (r.me ? ` · ${t('rating.you')}` : '') }),
      h('span', { class: 'note small', text: r.companyProgress !== undefined ? t('rating.company', { n: r.company }) + ` · ${r.companyProgress}%` : t('rating.company', { n: r.company }) }),
      h('span', { class: 'note small', text: r.companyReorgs > 0 ? ` · ${t('rating.reorgs', { n: r.companyReorgs })}` : '' }),
    ),
    h('span', { class: 'rating-sum' }, h('span', { class: 'coin-icon', text: 'tc' }), h('span', { text: fmt(r.lifetime) })),
  );
}

export function ratingPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  const body = h('div', { class: 'panel-body' });
  const list = h('div', { class: 'rating-list' });
  body.append(h('p', { class: 'note small', text: t('rating.note') }), list);
  if (!remoteAvailable()) list.append(h('p', { class: 'note', text: t('rating.noTg') }));
  else {
    list.append(h('p', { class: 'note', text: t('rating.loading') }));
    loadLeaderboard(100)
      .then(({ top, me }) => {
        // всегда заполняем локальный прогресс для текущего игрока
        if (me) {
          me.companyProgress = Math.floor(g.completion() * 100);
          me.companyReorgs = g.state.companyReorgs;
        }
        list.replaceChildren();
        if (!top.length) list.append(h('p', { class: 'note', text: t('rating.empty') }));
        for (const r of top) list.append(ratingRow(r));
        // игрок не в первой сотне — его строка отдельно внизу
        if (me && !top.some((r) => r.me)) list.append(h('div', { class: 'rating-gap', text: '…' }), ratingRow(me));
      })
      .catch(() => list.replaceChildren(h('p', { class: 'note', text: t('rating.error') })));
  }
  return { title: t('nav.rating'), body, refresh() {} };
}

// ---------- настройки ----------

export function settingsPanel(ctx: Ctx): Panel {
  const g = ctx.game;
  const body = h('div', { class: 'panel-body' });
  const sound = h('button', { class: 'mode' });
  sound.addEventListener('click', () => {
    ctx.onSound(!g.state.settings.sound);
    ctx.rebuild();
  });
  const langs = h('div', { class: 'modes' });
  for (const l of ['ru', 'en'] as const) {
    const b = h('button', { class: 'mode' + (getLang() === l ? ' active' : ''), text: l === 'ru' ? 'Русский' : 'English' });
    b.addEventListener('click', () => ctx.onLang(l));
    langs.append(b);
  }
  const tut = h('button', { class: 'mode wide', text: t('set.tutorial') });
  tut.addEventListener('click', () => ctx.onTutorial());
  let armed = false;
  const reset = h('button', { class: 'mode wide danger', text: t('set.reset') });
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = t('set.resetConfirm');
      setTimeout(() => {
        armed = false;
        reset.textContent = t('set.reset');
      }, 3000);
      return;
    }
    ctx.onReset();
  });
  body.append(
    h('div', { class: 'worker' }, h('div', { class: 'w-main' }, h('div', { class: 'w-name', text: t('set.sound') })), sound),
    h('div', { class: 'section-head' }, h('h3', { text: t('set.lang') })),
    langs,
    tut,
    reset,
    h('p', { class: 'note small', text: ctx.cloud ? t('set.save') : t('set.saveLocal') }),
    h('p', { class: 'note small', text: `${t('set.version')} ${ctx.version} · ${COMPANY_STYLES.length} ${getLang() === 'ru' ? 'офиса' : 'offices'}` }),
  );
  return {
    title: t('nav.settings'),
    body,
    refresh() {
      sound.textContent = g.state.settings.sound ? t('on') : t('off');
      sound.classList.toggle('active', g.state.settings.sound);
    },
  };
}
