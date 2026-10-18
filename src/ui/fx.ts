// Слой поверх сцены: пузыри с репликами, тикеты на столах, «?» и «!» у прохожих.
// Правила пузырей из GDD: в комнате одна реплика — 10 с, потом 10 с паузы; на экране не больше 3;
// новая — не раньше чем через 3 с после предыдущей; ширина до 160 px, не выходит за комнату.

import type { Game, GameEvent } from '../game/game';
import { PHRASES, phraseId, type PhraseGroup } from '../game/phrases';
import { TICKET_TEXTS, getLang } from '../i18n';
import type { Pt } from '../scene/layout';
import { ROOM_W, roomById, roomCenter } from '../scene/layout';
import type { OfficeView, Speaker } from '../scene/office';

const SHOW = 10;
const PAUSE = 10;
const MAX_VISIBLE = 3;
const STAGGER = 3;

interface Bubble {
  el: HTMLDivElement;
  speaker: Speaker;
  room: string;
  left: number;
}

export class Fx {
  enabled = true;
  private readonly root: HTMLDivElement;
  private bubbles: Bubble[] = [];
  private roomNext = new Map<string, number>();
  private lastStart = -STAGGER;
  private time = 0;
  private tickets = new Map<number, { el: HTMLButtonElement; d: number; k: number }>();
  private marks: HTMLDivElement[] = [];

  onTicket: (reward: number, d: number, k: number) => void = () => {};
  onPhrase: (id: string) => void = () => {};

  constructor(
    private readonly game: Game,
    private readonly office: OfficeView,
    private readonly toScreen: (p: Pt) => Pt,
    private readonly scale: () => number,
    private readonly rng: () => number = Math.random,
  ) {
    const root = document.getElementById('fx');
    if (!(root instanceof HTMLDivElement)) throw new Error('нет #fx');
    this.root = root;
    game.on((e) => this.onGame(e));
  }

  private onGame(e: GameEvent): void {
    if (e.type === 'ticketSpawn') {
      const btn = document.createElement('button');
      btn.className = 'ticket';
      const texts = TICKET_TEXTS[getLang()];
      btn.innerHTML = `<span class="ticket-icon" aria-hidden="true">!</span><span class="ticket-text"></span>`;
      (btn.querySelector('.ticket-text') as HTMLElement).textContent = texts[Math.floor(this.rng() * texts.length)];
      btn.addEventListener('pointerdown', (ev) => ev.stopPropagation());
      btn.addEventListener('click', () => {
        const { dept, desk } = e.ticket;
        const reward = this.game.collectTicket(e.ticket.id);
        if (reward > 0) this.onTicket(reward, dept, desk);
      });
      this.root.appendChild(btn);
      this.tickets.set(e.ticket.id, { el: btn, d: e.ticket.dept, k: e.ticket.desk });
    } else if (e.type === 'ticketGone') {
      const t = this.tickets.get(e.id);
      if (t) {
        t.el.classList.add(e.collected ? 'collected' : 'gone');
        setTimeout(() => t.el.remove(), 350);
        this.tickets.delete(e.id);
      }
    } else if (e.type === 'reorg' || e.type === 'company') {
      for (const t of this.tickets.values()) t.el.remove();
      this.tickets.clear();
      this.clearBubbles();
    }
  }

  clearBubbles(): void {
    for (const b of this.bubbles) {
      b.speaker.talk?.(false);
      b.el.remove();
    }
    this.bubbles = [];
  }

  private pickPhrase(groups: PhraseGroup[]): { id: string; text: string } | null {
    const pool: { id: string; text: string }[] = [];
    const lang = getLang();
    for (const g of groups) {
      const list = PHRASES[g];
      const n = g === 'bonus' ? Math.min(list.length, this.game.state.bonusPhrases) : list.length;
      for (let i = 0; i < n; i++) pool.push({ id: phraseId(g, i), text: list[i][lang] });
    }
    if (!pool.length) return null;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  private tryStart(): void {
    if (this.bubbles.length >= MAX_VISIBLE || this.time - this.lastStart < STAGGER) return;
    const speakers = this.office.speakers().filter((s) => s.canSpeak());
    const busy = new Set(this.bubbles.map((b) => b.room));
    const w = window.innerWidth;
    const h = window.innerHeight;
    const cands = speakers.filter((s) => {
      if (busy.has(s.room) || (this.roomNext.get(s.room) ?? 0) > this.time) return false;
      const p = this.toScreen(s.anchor());
      return p.x > 20 && p.x < w - 20 && p.y > topLimit() + 20 && p.y < h - 80;
    });
    if (!cands.length) return;
    const s = cands[Math.floor(this.rng() * cands.length)];
    const ph = this.pickPhrase(s.groups());
    if (!ph) return;
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = ph.text;
    this.root.appendChild(el);
    s.talk?.(true);
    this.bubbles.push({ el, speaker: s, room: s.room, left: SHOW });
    this.lastStart = this.time;
    this.onPhrase(ph.id);
  }

  private roomBoundsX(room: string): [number, number] | null {
    try {
      const def = roomById(room as never);
      const c = roomCenter(def.col, def.row);
      const a = this.toScreen({ x: c.x - ROOM_W / 2, y: c.y });
      const b = this.toScreen({ x: c.x + ROOM_W / 2, y: c.y });
      return [a.x, b.x];
    } catch {
      return null;
    }
  }

  update(dt: number): void {
    this.time += dt;
    // издалека фразы закрыли бы весь офис — показываем их только вблизи
    const near = this.scale() >= 0.45;
    if (this.enabled && near) this.tryStart();
    else if (this.bubbles.length) this.clearBubbles();

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.left -= dt;
      if (b.left <= 0) {
        b.speaker.talk?.(false);
        b.el.classList.add('out');
        const el = b.el;
        setTimeout(() => el.remove(), 300);
        this.bubbles.splice(i, 1);
        this.roomNext.set(b.room, this.time + PAUSE);
      }
    }

    // сначала тикеты: они важнее, фразы их обходят
    type Box = { x: number; y: number; w: number; h: number };
    const taken: Box[] = [];
    const hit = (a: Box, c: Box): boolean => a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
    const s = Math.max(0.6, Math.min(1.2, this.scale() * 1.6));
    for (const t of this.tickets.values()) {
      const a = this.office.ticketAnchor(t.d, t.k);
      if (!a) continue;
      const p = this.toScreen(a);
      t.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(2)})`;
      const w = (t.el.offsetWidth || 150) * s;
      const h = (t.el.offsetHeight || 36) * s;
      taken.push({ x: p.x - w / 2 - 4, y: p.y - h - 4, w: w + 8, h: h + 8 });
    }

    // фразы: старшие ставим первыми, новые поднимаем над занятым местом
    for (const b of this.bubbles) {
      const p = this.toScreen(b.speaker.anchor());
      const bw = b.el.offsetWidth || 120;
      const bh = b.el.offsetHeight || 40;
      let x = p.x - bw / 2;
      const rb = this.roomBoundsX(b.room);
      if (rb) x = Math.max(Math.min(x, rb[1] - bw), rb[0]);
      x = Math.max(6, Math.min(window.innerWidth - bw - 6, x));
      const box: Box = { x, y: p.y - bh - 6, w: bw, h: bh + 4 };
      for (let k = 0; k < 4; k++) {
        const o = taken.find((c) => hit(box, c));
        if (!o) break;
        box.y = o.y - box.h - 2;
      }
      const shifted = box.y < p.y - bh - 7;
      const blocked = box.y < topLimit() || taken.some((c) => hit(box, c));
      b.el.style.opacity = blocked ? '0' : '';
      b.el.classList.toggle('lifted', shifted);
      if (!blocked) taken.push(box);
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${box.y.toFixed(1)}px)`;
      b.el.style.setProperty('--tail', `${Math.max(10, Math.min(bw - 10, p.x - x)).toFixed(0)}px`);
    }

    const marks = this.office.walkerMarks();
    while (this.marks.length < marks.length) {
      const m = document.createElement('div');
      m.className = 'mark';
      this.root.appendChild(m);
      this.marks.push(m);
    }
    this.marks.forEach((m, i) => {
      const mk = marks[i];
      if (!mk) {
        m.style.display = 'none';
        return;
      }
      m.style.display = '';
      m.textContent = mk.mark;
      const p = this.toScreen(mk.pos);
      m.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
}

/** Нижний край верхней полосы: выше фразы не показываем. */
function topLimit(): number {
  const b = document.querySelector('.topbar')?.getBoundingClientRect().bottom;
  return b && b > 0 ? b + 4 : 76;
}
