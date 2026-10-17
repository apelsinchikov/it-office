// Прохожие: сетка проходимости, поиск пути, места без очередей, свободное блуждание.

import { Container } from 'pixi.js';
import type { PhraseGroup } from '../game/phrases';
import { Character, randomLook, type Dir, type Outfit } from './characters';
import { P, ROOMS, floorBounds, isoToWorld, roomById, roomWorld, worldToIso, type Pt, type RoomDef } from './layout';

const CELL = 1 / 12;
export const CHAR_SCALE = 0.32;

/** Сетка пола в изо-координатах: true — можно ходить. */
export class NavGrid {
  readonly n: number;
  readonly min: number;
  private readonly open: Uint8Array;

  constructor(blocked: (a: number, b: number) => boolean) {
    const f = floorBounds();
    this.min = f.min;
    this.n = Math.round((f.max - f.min) / CELL);
    this.open = new Uint8Array(this.n * this.n);
    for (let i = 0; i < this.n; i++)
      for (let j = 0; j < this.n; j++) {
        const { a, b } = this.center(i, j);
        this.open[i * this.n + j] = blocked(a, b) ? 0 : 1;
      }
  }

  center(i: number, j: number): { a: number; b: number } {
    return { a: this.min + (i + 0.5) * CELL, b: this.min + (j + 0.5) * CELL };
  }

  world(i: number, j: number): Pt {
    const { a, b } = this.center(i, j);
    return isoToWorld(a, b);
  }

  cellOf(p: Pt): [number, number] {
    const { a, b } = worldToIso(p.x, p.y);
    const i = Math.max(0, Math.min(this.n - 1, Math.floor((a - this.min) / CELL)));
    const j = Math.max(0, Math.min(this.n - 1, Math.floor((b - this.min) / CELL)));
    return [i, j];
  }

  isOpen(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.n && j < this.n && this.open[i * this.n + j] === 1;
  }

  /** Ближайшая открытая клетка (если точка внутри мебели). */
  nearestOpen(i: number, j: number): [number, number] {
    if (this.isOpen(i, j)) return [i, j];
    for (let r = 1; r < this.n; r++)
      for (let di = -r; di <= r; di++)
        for (let dj = -r; dj <= r; dj++) if (this.isOpen(i + di, j + dj)) return [i + di, j + dj];
    return [i, j];
  }

  /** A* по 4 направлениям (вдоль изо-осей — так ходят в изометрии). */
  path(from: Pt, to: Pt): Pt[] {
    const [si, sj] = this.nearestOpen(...this.cellOf(from));
    const [ti, tj] = this.nearestOpen(...this.cellOf(to));
    const n = this.n;
    const start = si * n + sj;
    const goal = ti * n + tj;
    const g = new Float32Array(n * n).fill(Infinity);
    const came = new Int32Array(n * n).fill(-1);
    const open: number[] = [start];
    const inOpen = new Uint8Array(n * n);
    g[start] = 0;
    inOpen[start] = 1;
    const h = (k: number): number => Math.abs(Math.floor(k / n) - ti) + Math.abs((k % n) - tj);
    while (open.length) {
      let bi = 0;
      for (let q = 1; q < open.length; q++) if (g[open[q]] + h(open[q]) < g[open[bi]] + h(open[bi])) bi = q;
      const cur = open.splice(bi, 1)[0];
      inOpen[cur] = 0;
      if (cur === goal) break;
      const ci = Math.floor(cur / n);
      const cj = cur % n;
      for (const [di, dj] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const ni = ci + di;
        const nj = cj + dj;
        if (!this.isOpen(ni, nj)) continue;
        const k = ni * n + nj;
        const ng = g[cur] + 1;
        if (ng < g[k]) {
          g[k] = ng;
          came[k] = cur;
          if (!inOpen[k]) {
            open.push(k);
            inOpen[k] = 1;
          }
        }
      }
    }
    if (came[goal] < 0 && goal !== start) return [to];
    const cells: number[] = [];
    for (let k = goal; k !== -1 && k !== start; k = came[k]) cells.push(k);
    cells.reverse();
    // оставляем только точки поворота
    const pts: Pt[] = [];
    let prevDir = -1;
    for (let q = 0; q < cells.length; q++) {
      const k = cells[q];
      const prev = q === 0 ? start : cells[q - 1];
      const dir = k - prev;
      if (dir !== prevDir && q > 0) pts.push(this.world(Math.floor(prev / n), prev % n));
      prevDir = dir;
    }
    pts.push(to);
    return pts;
  }

  /** Случайная открытая клетка; edge — у самого края этажа. */
  randomCell(rng: () => number, edge: boolean): Pt {
    for (let tries = 0; tries < 400; tries++) {
      let i = Math.floor(rng() * this.n);
      let j = Math.floor(rng() * this.n);
      if (edge) {
        const side = Math.floor(rng() * 4);
        if (side === 0) i = 0;
        else if (side === 1) i = this.n - 1;
        else if (side === 2) j = 0;
        else j = this.n - 1;
      }
      if (this.isOpen(i, j)) return this.world(i, j);
    }
    return this.world(Math.floor(this.n / 2), Math.floor(this.n / 2));
  }
}

export interface Slot {
  id: string;
  pos: Pt;
  dir: Dir;
  kind: 'coffee' | 'sofa' | 'viewer' | 'fridge' | 'toilet';
  /** Кто занял или идёт сюда. */
  by: Walker | null;
}

export interface SpeakerInfo {
  room: string;
  group: PhraseGroup;
}

type WalkerKind = 'coffee' | 'gamer' | 'roamer';

const OUTFITS: Outfit[] = ['support', 'dev', 'qa', 'analyst', 'sysadmin'];

export class Walker {
  readonly char: Character;
  seated: Character | null = null;
  pos: Pt;
  private path: Pt[] = [];
  private wait = 0;
  private slot: Slot | null = null;
  private pauseAt = -1;
  private lastTarget: Pt | null = null;
  private atEdge = false;
  /** Что сказать, когда остановится у края: «?» или «!». */
  mark: '?' | '!' | null = null;
  private markLeft = 0;
  hidden = false;
  readonly speed: number;

  constructor(
    readonly kind: WalkerKind,
    private readonly world: WalkerWorld,
    private readonly rng: () => number,
    start: Pt,
  ) {
    this.char = new Character(randomLook(rng, OUTFITS[Math.floor(rng() * OUTFITS.length)]), rng);
    this.char.root.scale.set(CHAR_SCALE);
    this.pos = { ...start };
    this.speed = 34 + rng() * 16;
    this.wait = rng() * 3;
    this.place();
  }

  /** Где сейчас: для пузырей. */
  speaker(): SpeakerInfo {
    if (this.slot?.kind === 'coffee') return { room: 'rest', group: 'coffee' };
    if (this.slot?.kind === 'sofa' || this.slot?.kind === 'viewer' || this.slot?.kind === 'fridge') return { room: 'rest', group: 'sofa' };
    if (this.slot?.kind === 'toilet') return { room: 'toilet', group: 'toilet' };
    if (this.atEdge) return { room: this.world.roomName(this.pos), group: 'edge' };
    return { room: this.world.roomName(this.pos), group: this.rng() < 0.5 ? 'coffee' : 'bonus' };
  }

  /** Стоит на месте (можно говорить). */
  isResting(): boolean {
    return this.path.length === 0 && !this.hidden;
  }

  private place(): void {
    this.char.root.position.set(this.pos.x, this.pos.y);
    this.char.root.zIndex = this.pos.y;
    if (this.seated) {
      this.seated.root.position.set(this.pos.x, this.pos.y);
      this.seated.root.zIndex = this.pos.y + 1;
    }
  }

  private release(): void {
    if (this.slot) {
      if (this.slot.kind === 'toilet') this.world.toilet(false);
      this.slot.by = null;
      this.slot = null;
    }
    if (this.seated) {
      this.seated.root.visible = false;
      this.char.root.visible = true;
    }
  }

  private goTo(target: Pt): void {
    this.path = this.world.nav.path(this.pos, target);
    this.lastTarget = target;
    this.pauseAt = this.rng() < 0.2 ? Math.floor(this.rng() * this.path.length) : -1;
  }

  private chooseNext(): void {
    this.release();
    this.atEdge = false;
    const r = this.rng();
    const want: Slot['kind'][] =
      this.kind === 'coffee'
        ? ['coffee']
        : this.kind === 'gamer'
          ? ['sofa', 'viewer']
          : r < 0.12
            ? ['fridge']
            : r < 0.24
              ? ['toilet']
              : r < 0.34
                ? ['coffee']
                : [];
    // кофейники и игроки иногда тоже бродят — так места меняются
    const roam = (this.kind !== 'roamer' && this.rng() < 0.25) || want.length === 0;
    if (!roam) {
      const slot = this.world.freeSlot(want, this.rng);
      if (slot) {
        slot.by = this;
        this.slot = slot;
        this.goTo(slot.pos);
        return;
      }
    }
    const edge = this.rng() < 0.3;
    let target = this.world.nav.randomCell(this.rng, edge);
    // не та же и не соседняя точка
    for (let k = 0; k < 6 && this.lastTarget && Math.hypot(target.x - this.lastTarget.x, target.y - this.lastTarget.y) < 80; k++)
      target = this.world.nav.randomCell(this.rng, edge);
    this.atEdge = edge;
    this.goTo(target);
  }

  private arrive(): void {
    if (this.slot) {
      this.char.setDir(this.slot.dir);
      switch (this.slot.kind) {
        case 'coffee':
          this.wait = 40 + this.rng() * 20;
          break;
        case 'sofa':
          this.wait = 60 + this.rng() * 60;
          if (!this.seated) {
            this.seated = new Character(this.char.look, this.rng, true);
            this.seated.root.scale.set(CHAR_SCALE);
            this.world.layer.addChild(this.seated.root);
          }
          this.seated.root.visible = true;
          this.char.root.visible = false;
          break;
        case 'viewer':
          this.wait = 30 + this.rng() * 40;
          break;
        case 'fridge':
          this.wait = 8 + this.rng() * 4;
          break;
        case 'toilet':
          this.wait = 6 + this.rng() * 2;
          this.hidden = true;
          this.char.root.visible = false;
          this.world.toilet(true);
          break;
      }
    } else if (this.atEdge) {
      // у края: удивляется, иногда долго смотрит в окно
      this.wait = this.rng() < 0.25 ? 5 + this.rng() * 2 : 2 + this.rng();
      this.mark = this.rng() < 0.5 ? '?' : '!';
      this.markLeft = 1.6;
    } else {
      this.wait = 1 + this.rng() * 3;
    }
  }

  update(dt: number): void {
    if (this.markLeft > 0) {
      this.markLeft -= dt;
      if (this.markLeft <= 0) this.mark = null;
    }
    if (this.path.length) {
      if (this.pauseAt === 0) {
        // замер посреди пути: проверил телефон
        this.pauseAt = -1;
        this.wait = 1 + this.rng();
      }
      if (this.wait > 0) {
        this.wait -= dt;
        this.char.mode = 'idle';
      } else {
        const t = this.path[0];
        const dx = t.x - this.pos.x;
        const dy = t.y - this.pos.y;
        const d = Math.hypot(dx, dy);
        const step = this.speed * dt;
        this.char.mode = 'walk';
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) this.char.setDir(dx >= 0 ? (dy >= 0 ? 0 : 2) : dy >= 0 ? 1 : 3);
        if (d <= step) {
          this.pos = { ...t };
          this.path.shift();
          if (this.pauseAt > 0) this.pauseAt--;
          if (this.path.length === 0) {
            this.char.mode = 'idle';
            this.arrive();
          }
        } else {
          this.pos.x += (dx / d) * step;
          this.pos.y += (dy / d) * step;
        }
      }
    } else {
      this.wait -= dt;
      if (this.wait <= 0) {
        if (this.hidden) {
          this.hidden = false;
          this.char.root.visible = true;
        }
        this.chooseNext();
      }
    }
    this.place();
    this.char.update(dt);
    this.seated?.update(dt);
  }
}

/** Всё, что нужно прохожим от офиса. */
export class WalkerWorld {
  readonly nav: NavGrid;
  readonly slots: Slot[] = [];
  readonly walkers: Walker[] = [];
  onToilet: (busy: boolean) => void = () => {};

  constructor(
    readonly layer: Container,
    blocked: (a: number, b: number) => boolean,
    rng: () => number,
  ) {
    this.nav = new NavGrid(blocked);
    const rest = roomById('rest');
    const toilet = roomById('toilet');
    const at = (def: RoomDef, u: number, v: number): Pt => roomWorld(def, u, v);
    // места: кофемашина 3, диван 2 + 1 зритель, холодильник 1, туалет 1
    this.slots.push(
      { id: 'coffee1', pos: at(rest, 0.4, 0.2), dir: 3, kind: 'coffee', by: null },
      { id: 'coffee2', pos: at(rest, 0.44, 0.32), dir: 3, kind: 'coffee', by: null },
      { id: 'coffee3', pos: at(rest, 0.32, 0.4), dir: 2, kind: 'coffee', by: null },
      { id: 'sofa1', pos: at(rest, 0.3, 0.7), dir: 0, kind: 'sofa', by: null },
      { id: 'sofa2', pos: at(rest, 0.42, 0.62), dir: 0, kind: 'sofa', by: null },
      { id: 'viewer', pos: at(rest, 0.2, 0.55), dir: 0, kind: 'viewer', by: null },
      { id: 'fridge', pos: at(rest, 0.7, 0.32), dir: 2, kind: 'fridge', by: null },
      { id: 'toilet', pos: at(toilet, 0.4, 0.5), dir: 2, kind: 'toilet', by: null },
    );
    const kinds: WalkerKind[] = ['coffee', 'coffee', 'coffee', 'gamer', 'gamer', 'roamer', 'roamer', 'roamer'];
    for (const k of kinds) {
      const w = new Walker(k, this, rng, this.nav.randomCell(rng, false));
      this.walkers.push(w);
      layer.addChild(w.char.root);
    }
  }

  freeSlot(kinds: Slot['kind'][], rng: () => number): Slot | null {
    const free = this.slots.filter((s) => kinds.includes(s.kind) && !s.by);
    return free.length ? free[Math.floor(rng() * free.length)] : null;
  }

  toilet(busy: boolean): void {
    this.onToilet(busy);
  }

  roomName(p: Pt): string {
    const r = ROOMS.find((def) => {
      const { a, b } = worldToIso(p.x, p.y);
      return Math.abs(a - def.col * P) <= 0.5 && Math.abs(b - def.row * P) <= 0.5;
    });
    return r ? r.id : 'hall';
  }

  update(dt: number): void {
    for (const w of this.walkers) w.update(dt);
  }
}
