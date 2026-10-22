// Оболочка интерфейса: верхняя полоса, «Аврал», нижнее меню, выдвижная панель, тосты, окна.

import { bestPurchase, type Purchase } from '../game/advisor';
import { formatNumber } from '../game/format';
import type { Game, GameEvent } from '../game/game';
import { claimableCount } from '../game/quests';
import { perkTitle } from './panels';
import { duration, t, type Key } from '../i18n';
import type { RoomDef } from '../scene/layout';
import { ICONS, h } from './dom';
import {
  collectionPanel,
  deptPanel,
  directorPanel,
  grantsPanel,
  notePanel,
  ratingPanel,
  questsPanel,
  restPanel,
  settingsPanel,
  type BuyMode,
  type Ctx,
  type Panel,
} from './panels';

export type Sheet =
  | { kind: 'room'; def: RoomDef }
  | { kind: 'grants' }
  | { kind: 'quests' }
  | { kind: 'collection' }
  | { kind: 'rating' }
  | { kind: 'settings' };

export interface HudHandlers {
  onAvral(): void;
  onDirectorDesk(): void;
  onLang(l: 'ru' | 'en'): void;
  onSound(on: boolean): void;
  onHaptics(on: boolean): void;
  onReset(): void;
  onTutorial(): void;
  onReorg(): void;
  onCompany(): void;
  onClose(): void;
  sfx: Ctx['sfx'];
  cloud: boolean;
  version: string;
}

export class Hud {
  /** Сколько пикселей сверху занято: кнопки Telegram + наша верхняя полоса. */
  get topInset(): number {
    const b = this.topEl?.getBoundingClientRect().bottom;
    return b && b > 0 ? b + 6 : 70;
  }
  private topEl: HTMLElement | null = null;
  /** Последнее записанное значение кольца «Аврала». */
  private avralP = '';
  private readonly root: HTMLElement;
  private readonly coins: HTMLElement;
  private readonly rate: HTMLElement;
  private readonly grantsChip: HTMLButtonElement;
  private readonly eventChip: HTMLElement;
  private readonly eventMod: HTMLElement;
  /** Действующие перки директора. */
  private readonly perksEl: HTMLElement;
  private readonly avralBtn: HTMLButtonElement;
  private readonly avralLabel: HTMLElement;
  private readonly sheetEl: HTMLElement;
  private readonly sheetTitle: HTMLElement;
  private readonly sheetSub: HTMLElement;
  private readonly sheetBody: HTMLElement;
  /** Сколько монет сейчас — видно и в меню улучшений. */
  private readonly sheetCoins: HTMLElement;
  private readonly nav: HTMLElement;
  private readonly navBtns = new Map<string, HTMLButtonElement>();
  private readonly questBadge: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly modal: HTMLElement;
  private sheet: Sheet | null = null;
  private panel: Panel | null = null;
  private mode: BuyMode = 1;
  private expanded = new Set<string>();
  private colTab: { v: 'ach' | 'phr' } = { v: 'ach' };
  private last = 0;
  private best: Purchase | undefined;
  private ctx: Ctx;
  hidden = false;

  constructor(
    private readonly game: Game,
    private readonly hd: HudHandlers,
  ) {
    const root = document.getElementById('hud');
    if (!root) throw new Error('нет #hud');
    this.root = root;
    root.replaceChildren();

    // верхняя полоса
    this.coins = h('span', { class: 'coins-value', text: '0' });
    this.rate = h('span', { class: 'rate' });
    this.grantsChip = h('button', { class: 'chip grants-chip', aria: t('nav.grants') });
    this.grantsChip.addEventListener('click', () => this.toggle({ kind: 'grants' }));
    this.eventChip = h('div', { class: 'event-chip' });
    this.eventChip.style.display = 'none';
    this.eventMod = h('span', { class: 'event-mod' });
    this.eventMod.style.display = 'none';
    const eventWrapper = h('div', { class: 'event-wrapper' }, this.eventChip, this.eventMod);
    this.perksEl = h('div', { class: 'perks' });
    const top = h(
      'div',
      { class: 'topbar' },
      h('div', { class: 'coins' }, h('span', { class: 'coin-icon', text: 'tc', aria: 'techCoin' }), h('div', { class: 'coins-col' }, this.coins, this.rate)),
      h('div', { class: 'chips' }, eventWrapper, this.grantsChip),
    );

    // «Аврал»
    this.avralLabel = h('span', { class: 'avral-label' });
    this.avralBtn = h('button', { class: 'avral-btn', aria: t('avral') }, h('span', { class: 'avral-icon', html: ICONS.fire }), this.avralLabel);
    this.avralBtn.addEventListener('click', () => hd.onAvral());

    // панель
    this.sheetTitle = h('div', { class: 'sheet-title' });
    this.sheetSub = h('div', { class: 'sheet-sub' });
    const close = h('button', { class: 'icon-btn', html: ICONS.close, aria: t('close') });
    close.addEventListener('click', () => this.close());
    this.sheetBody = h('div', { class: 'sheet-body' });
    this.sheetCoins = h('span', { class: 'coins-value' });
    const sheetMoney = h('div', { class: 'sheet-coins' }, h('span', { class: 'coin-icon', text: 'tc', aria: 'techCoin' }), this.sheetCoins);
    this.sheetEl = h(
      'section',
      { class: 'sheet hidden', attrs: { 'aria-live': 'polite' } },
      h('div', { class: 'sheet-head' }, h('div', { class: 'sheet-titles' }, this.sheetTitle, this.sheetSub), sheetMoney, close),
      this.sheetBody,
    );

    // меню
    this.questBadge = h('span', { class: 'badge' });
    this.nav = h('nav', { class: 'nav' });
    const items: [string, Key, string][] = [
      ['office', 'nav.office', ICONS.office],
      ['quests', 'nav.quests', ICONS.quests],
      ['grants', 'nav.grants', ICONS.grants],
      ['collection', 'nav.collection', ICONS.collection],
      ['rating', 'nav.rating', ICONS.rating],
      ['settings', 'nav.settings', ICONS.settings],
    ];
    for (const [id, key, icon] of items) {
      const b = h('button', { class: 'nav-btn' }, h('span', { class: 'nav-icon', html: icon }), h('span', { class: 'nav-label', text: t(key) }));
      if (id === 'quests') b.append(this.questBadge);
      b.addEventListener('click', () => {
        hd.sfx('click');
        if (id === 'office') this.close();
        else this.toggle({ kind: id as 'grants' | 'quests' | 'collection' | 'rating' | 'settings' });
      });
      this.navBtns.set(id, b);
      this.nav.append(b);
    }

    this.toasts = h('div', { class: 'toasts', attrs: { 'aria-live': 'polite' } });
    this.modal = h('div', { class: 'modal hidden' });
    this.topEl = top;
    root.append(top, this.perksEl, this.toasts, this.avralBtn, this.sheetEl, this.nav, this.modal);

    this.ctx = {
      game,
      mode: () => this.mode,
      setMode: (m) => (this.mode = m),
      best: () => this.best,
      sfx: hd.sfx,
      toast: (s) => this.toast(s),
      rebuild: () => this.rebuild(),
      expanded: this.expanded,
      onAvral: hd.onAvral,
      onDirectorDesk: hd.onDirectorDesk,
      onLang: hd.onLang,
      onSound: hd.onSound,
      onHaptics: hd.onHaptics,
      onReset: hd.onReset,
      onTutorial: hd.onTutorial,
      onReorg: hd.onReorg,
      onCompany: hd.onCompany,
      cloud: hd.cloud,
      version: hd.version,
    };

    game.on((e) => this.onGame(e));
  }

  private onGame(e: GameEvent): void {
    // структура панели меняется — перестраиваем
    if (['hire', 'unlock', 'manager', 'reorg', 'company', 'room', 'toiletStall'].includes(e.type) && this.sheet) this.rebuild();
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.root.classList.toggle('tutorial-mode', hidden);
    if (hidden) this.close();
  }

  isOpen(): boolean {
    return this.sheet !== null;
  }

  current(): Sheet | null {
    return this.sheet;
  }

  bottomInset(): number {
    if (this.hidden) return 210; // карточка обучения
    const navH = this.nav.offsetHeight || 64;
    return navH + 90;
  }

  private build(s: Sheet): Panel {
    const ctx = this.ctx;
    switch (s.kind) {
      case 'room': {
        const def = s.def;
        if (def.kind === 'dept') return deptPanel(ctx, def.dept!);
        if (def.kind === 'rest') return restPanel(ctx);
        if (def.kind === 'director') return directorPanel(ctx);
        return notePanel(ctx, def);
      }
      case 'grants':
        return grantsPanel(ctx);
      case 'quests':
        return questsPanel(ctx);
      case 'collection':
        return collectionPanel(ctx, this.colTab);
      case 'rating':
        return ratingPanel(ctx);
      case 'settings':
        return settingsPanel(ctx);
    }
  }

  open(s: Sheet): void {
    this.sheet = s;
    this.rebuild();
    this.sheetEl.classList.remove('hidden');
    for (const [id, b] of this.navBtns) b.classList.toggle('active', s.kind === id);
  }

  toggle(s: Sheet): void {
    if (this.sheet && this.sheet.kind === s.kind && s.kind !== 'room') this.close();
    else this.open(s);
  }

  close(): void {
    if (!this.sheet) return;
    this.sheet = null;
    this.panel = null;
    this.sheetEl.classList.add('hidden');
    for (const [id, b] of this.navBtns) b.classList.toggle('active', id === 'office');
    this.hd.onClose();
  }

  rebuild(): void {
    if (!this.sheet) return;
    const scroll = this.sheetBody.scrollTop;
    this.panel = this.build(this.sheet);
    this.sheetTitle.textContent = this.panel.title;
    this.sheetBody.replaceChildren(this.panel.body);
    this.best = bestPurchase(this.game);
    this.panel.refresh();
    this.sheetSub.textContent = this.panel.sub?.() ?? '';
    this.sheetCoins.textContent = formatNumber(this.game.run.coins);
    this.sheetBody.scrollTop = scroll;
  }

  toast(text: string, kind: 'info' | 'good' = 'info'): void {
    const el = h('div', { class: `toast ${kind}`, text });
    this.toasts.append(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  }

  /** Окно «Пока вас не было». */
  showOffline(seconds: number, amount: number, capH: number, onClaim: () => void): void {
    const btn = h('button', { class: 'buy big', text: `${t('claim')} +${formatNumber(amount)}` });
    const card = h(
      'div',
      { class: 'modal-card' },
      h('h2', { text: t('offline.title') }),
      h('p', { class: 'note', text: t('offline.text', { time: duration(seconds) }) }),
      h('div', { class: 'stat-big' }, h('span', { class: 'coin-icon', text: 'tc' }), h('span', { text: formatNumber(amount) })),
      btn,
      h('p', { class: 'note small', text: t('offline.cap', { h: capH }) }),
    );
    btn.addEventListener('click', () => {
      onClaim();
      this.modal.classList.add('hidden');
      this.modal.replaceChildren();
    });
    this.modal.replaceChildren(card);
    this.modal.classList.remove('hidden');
  }

  setEvent(text: string | null, mod?: { incomeMult: number; deptMult: number[]; ticketFreqMult: number }): void {
    if (!text) {
      this.eventChip.style.display = 'none';
      this.eventMod.style.display = 'none';
      return;
    }
    this.eventChip.style.display = '';
    this.eventChip.textContent = text;
    if (mod) {
      const parts: string[] = [];
      if (mod.incomeMult > 1) parts.push(`доход ×${mod.incomeMult}`);
      if (mod.deptMult.some(v => v > 1)) parts.push(`отдел ×${mod.deptMult.filter(v => v > 1)[0]}`);
      if (mod.ticketFreqMult > 1) parts.push(`тикеты ×${mod.ticketFreqMult}`);
      this.eventMod.textContent = parts.join(' · ');
      this.eventMod.style.display = '';
    } else {
      this.eventMod.style.display = 'none';
    }
  }

  /** Каждый кадр; DOM обновляем 5 раз в секунду. */
  update(now: number): void {
    const g = this.game;
    // «Аврал» — каждый кадр, чтобы кольцо шло плавно
    // в DOM пишем только изменившееся: лишние записи каждый кадр заставляют браузер пересчитывать стили
    let pc = 0;
    let label: string;
    if (g.isAvral()) {
      pc = g.avralLeft / 30;
      label = `×3 ${Math.ceil(g.avralLeft)}`;
    } else if (g.avralCooldown > 0) {
      pc = 1 - g.avralCooldown / 150;
      label = `${Math.ceil(g.avralCooldown)}`;
    } else {
      pc = 1;
      label = t('avral');
    }
    // «Аврал» объявляет директор IT — до его кабинета кнопки нет
    const shown = g.roomOpen('director') && !this.sheet;
    const display = shown ? '' : 'none';
    if (this.avralBtn.style.display !== display) this.avralBtn.style.display = display;
    if (shown) {
      if (this.avralLabel.textContent !== label) this.avralLabel.textContent = label;
      const p = `${(pc * 100).toFixed(1)}%`;
      if (p !== this.avralP) {
        this.avralP = p;
        this.avralBtn.style.setProperty('--p', p);
      }
      this.avralBtn.classList.toggle('ready', g.canAvral());
      this.avralBtn.classList.toggle('active', g.isAvral());
    }

    if (now - this.last < 200) return;
    this.last = now;
    this.coins.textContent = formatNumber(g.run.coins);
    if (this.sheet) this.sheetCoins.textContent = formatNumber(g.run.coins);
    this.rate.textContent = `+${formatNumber(g.incomePerSec())}${t('perSec')}`;
    this.grantsChip.innerHTML = `${ICONS.star}<span>${formatNumber(g.state.grants)}</span>`;
    this.grantsChip.classList.toggle('pulse', g.reorgIsGood());
    this.perksEl.replaceChildren(
      ...g.state.director.active.map((a) => h('span', { class: 'chip perk-chip', text: `${perkTitle(a.kind, a.tier)} · ${duration(Math.ceil(a.left))}` })),
    );
    const n = claimableCount(g);
    this.questBadge.textContent = n ? String(n) : '';
    this.questBadge.style.display = n ? '' : 'none';
    if (this.panel) {
      this.best = bestPurchase(g);
      this.panel.refresh();
      this.sheetSub.textContent = this.panel.sub?.() ?? '';
    }
  }
}
