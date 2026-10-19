// Сцена офиса: комнаты, рабочие места, руководители, директор, зона отдыха, туалет, прохожие.

import { Container, Graphics, Text } from 'pixi.js';
import { DEPTS, DEPT_COUNT, DESKS, ROOM_IDS, companyDef } from '../game/config';
import { formatNumber } from '../game/format';
import type { Game, GameEvent } from '../game/game';
import { DEPT_GROUP, LEAD_GROUP, type PhraseGroup } from '../game/phrases';
import { t, type Key } from '../i18n';
import { Character, DIRECTOR_LOOK, randomLook, type Look, type Outfit } from './characters';
import { OUT, circle, ellipse, line, poly, rect, shade } from './draw';
import {
  chairBack,
  codeLines,
  coffeeMachine,
  DESK,
  SPOT,
  deskPt,
  deskSlab,
  directorDesk,
  flower,
  fridge,
  keyboard,
  lamp,
  monitor,
  mouse,
  mug,
  newYearTree,
  phone,
  plant,
  sink,
  sofa,
  steam,
  toiletCabin,
  toolbox,
  tvStand,
  typingHand,
  waterCooler,
} from './furniture';
import {
  AISLE_U,
  DESK_SLOTS,
  GAP,
  LEDGE_H,
  OUTER_WALL_H,
  P,
  ROOMS,
  ROOM_H,
  ROOM_W,
  WALL_H,
  deptRoom,
  floorBounds,
  isInsideRoom,
  roomById,
  roomCenter,
  roomWorld,
  touchesOuter,
  worldToIso,
  type Pt,
  type RoomDef,
} from './layout';
import { THEMES, type Theme } from './theme';
import { CHAR_SCALE, WalkerWorld } from './walkers';

export const DESK_SCALE = 0.45;
const OUTFIT_BY_ID: Record<string, Outfit> = { sysadmins: 'sysadmin', support: 'support', analysts: 'analyst', dev: 'dev', qa: 'qa' };
const outfitOf = (d: number): Outfit => OUTFIT_BY_ID[DEPTS[d].id] ?? 'dev';
/** У сисадминов вместо стола — пост с сервером, сотрудник стоит. */
const isPost = (d: number): boolean => DEPTS[d].id === 'sysadmins';
/** Поле вокруг офиса (трава, деревья, дорожки), в пикселях мира. */
const YARD = 520;

export interface Speaker {
  id: string;
  room: string;
  anchor: () => Pt;
  groups: () => PhraseGroup[];
  canSpeak: () => boolean;
  talk?: (on: boolean) => void;
}

function sleeveOf(look: Look): number {
  if (look.outfit === 'analyst') return 0xf4f4f8;
  if (look.outfit === 'sysadmin') return look.skin;
  return look.color;
}

/** Рабочее место: стол + сидящий сотрудник (у сисадминов — пост и стоящий сотрудник). */
class DeskView {
  readonly root = new Container();
  private readonly scene = new Container();
  private char!: Character;
  private hands: Container[] = [];
  private code: Container[] = [];
  private steamG: Graphics | null = null;
  private lights: Container | null = null;
  private t = Math.random() * 10;
  readonly look: Look;

  constructor(
    private readonly game: Game,
    readonly d: number,
    readonly k: number,
    rng: () => number,
  ) {
    // внешность постоянная: одна и та же для этого места в этой компании
    this.look = randomLook(seeded(game.state.company * 1009 + d * 31 + k * 7 + 1), outfitOf(d));
    const slot = DESK_SLOTS[k];
    const w = roomWorld(deptRoom(d), slot.u, slot.v);
    this.root.position.set(w.x, w.y);
    this.root.zIndex = w.y;
    this.scene.scale.set(DESK_SCALE);
    this.scene.pivot.set(130, 160);
    this.root.addChild(this.scene);
    this.build(rng);
  }

  private tier(item: string): number {
    const i = (DEPTS[this.d].items as readonly string[]).indexOf(item);
    return i < 0 ? -1 : this.game.furnTier(this.d, this.k, i);
  }

  private single(id: string): boolean {
    const j = (DEPTS[this.d].singles as readonly string[]).indexOf(id);
    return j >= 0 && this.game.run.singles[this.d][this.k][j];
  }

  build(rng: () => number = Math.random): void {
    for (const c of this.scene.removeChildren()) c.destroy({ children: true });
    this.hands = [];
    this.code = [];
    this.steamG = null;
    this.lights = null;
    this.buildDesk(rng);
  }

  private buildDesk(rng: () => number): void {
    const post = isPost(this.d);
    // у сисадминов «пост»: тот же стол с компьютером, его уровень — уровень поста; плюс лампа и ящик с инструментами
    const deskT = Math.max(0, this.tier(post ? 'post' : 'desk'));
    const chairT = Math.max(0, this.tier('chair'));
    const monT = this.tier('monitor') >= 0 ? this.tier('monitor') : deskT;
    const keyT = this.tier('keyboard') >= 0 ? this.tier('keyboard') : deskT;
    // порядок рисования — от дальнего к ближнему: стул, сотрудник, монитор (стоит у дальнего края), стол, клавиатура, руки
    this.scene.addChild(chairBack(chairT));
    this.char = new Character(this.look, rng, true);
    const seat = deskPt(SPOT.seat[0], SPOT.seat[1]);
    this.char.root.position.set(seat[0], seat[1]);
    this.char.root.scale.set(0.7);
    this.char.turnFace(5); // смотрит вниз-вправо, на клавиатуру
    this.scene.addChild(this.char.root);
    this.scene.addChild(deskSlab(deskT));
    this.scene.addChild(monitor(monT));
    this.scene.addChild(keyboard(keyT));
    const sleeve = sleeveOf(this.look);
    const kl = deskPt(SPOT.keyboard[0], SPOT.keyboard[1] + 10, DESK.H + 2);
    const kr = deskPt(SPOT.keyboard[0], SPOT.keyboard[1] - 10, DESK.H + 2);
    // предплечья от локтей у края стола до клавиатуры
    this.hands = [typingHand(kl[0] - 14, kl[1] - 9, kl[0], kl[1], sleeve, this.look.skin), typingHand(kr[0] - 13, kr[1] - 12, kr[0], kr[1], sleeve, this.look.skin)];
    this.scene.addChild(...this.hands);
    this.code = codeLines(monT);
    // addChild() без аргументов в Pixi 8 падает — пустой список не передаём
    if (this.code.length) this.scene.addChild(...this.code);
    if (this.tier('phone') >= 0) this.scene.addChild(phone(this.tier('phone')));
    if (this.tier('mouse') >= 0) this.scene.addChild(mouse(this.tier('mouse')));
    if (post) {
      // настольная лампа рядом с монитором (нарисована в координатах поста 120×110; основание — точка 24,54)
      const l = lamp(Math.max(0, this.tier('lamp')));
      const at = deskPt(SPOT.lamp[0], SPOT.lamp[1], DESK.H);
      const ls = 1.3;
      l.scale.set(ls);
      l.position.set(at[0] - 24 * ls, at[1] - 54 * ls);
      this.scene.addChild(l);
      this.scene.addChild(toolbox(Math.max(0, this.tier('toolbox'))));
    }
    if (this.single('flower')) this.scene.addChild(flower());
    if (this.single('mug')) {
      const m = deskPt(SPOT.mug[0], SPOT.mug[1], DESK.H);
      this.scene.addChild(mug(m[0] - 6.5, m[1] - 14));
      this.steamG = steam(m[0], m[1] - 18);
      this.scene.addChild(this.steamG);
    }
  }

  /** Точка над головой (для пузыря), в мире. */
  anchor(): Pt {
    const seat = deskPt(SPOT.seat[0], SPOT.seat[1]);
    return { x: this.root.x + (seat[0] - 130) * DESK_SCALE, y: this.root.y + (seat[1] - 122 - 160) * DESK_SCALE };
  }

  /** Точка для тикета. */
  ticketAnchor(): Pt {
    return { x: this.root.x - 18, y: this.root.y - 92 };
  }

  setTalking(on: boolean): void {
    void on; // сидящие говорят без смены позы
  }

  update(dt: number, speed: number): void {
    this.t += dt * speed;
    this.char.speed = speed;
    this.char.update(dt);
    if (this.hands.length) {
      this.hands[0].y = -3 * Math.max(0, Math.sin(this.t * 19));
      this.hands[1].y = -3 * Math.max(0, Math.sin(this.t * 19 + Math.PI));
    }
    this.code.forEach((c, i) => {
      const ph = (this.t * 0.62 + i * 0.33) % 1;
      c.scale.set(Math.min(1, ph / 0.6));
    });
    if (this.steamG) {
      const ph = (this.t * 0.4) % 1;
      this.steamG.y = -12 * ph;
      this.steamG.alpha = ph < 0.3 ? ph / 0.3 : 1 - (ph - 0.3) / 0.7;
    }
    if (this.lights) this.lights.children.forEach((l, i) => (l.alpha = 0.4 + 0.6 * ((Math.sin(this.t * 3 + i * 1.7) + 1) / 2)));
  }
}

/** Человек, гуляющий по точкам внутри комнаты (руководитель, директор). */
class RoomWalker {
  readonly char: Character;
  private targets: Pt[];
  private idx = 0;
  private wait: number;
  private talking = false;

  constructor(
    look: Look,
    points: Pt[],
    private readonly rng: () => number,
    private readonly pauseMin = 2,
    private readonly pauseMax = 5,
    /** Точки идут цепочкой: ходить только к соседней (чтобы не проходить сквозь столы). */
    private readonly chain = false,
  ) {
    this.char = new Character(look, rng);
    this.char.root.scale.set(CHAR_SCALE);
    this.targets = points;
    this.idx = Math.floor(rng() * points.length);
    const p0 = points[this.idx];
    this.char.root.position.set(p0.x, p0.y);
    this.char.root.zIndex = p0.y;
    this.wait = rng() * 3;
  }

  get pos(): Pt {
    return { x: this.char.root.x, y: this.char.root.y };
  }

  anchor(): Pt {
    return { x: this.char.root.x, y: this.char.root.y - 60 };
  }

  setTalking(on: boolean): void {
    this.talking = on;
  }

  isResting(): boolean {
    return this.wait > 0;
  }

  update(dt: number): void {
    const r = this.char.root;
    if (this.wait > 0) {
      this.wait -= dt;
      this.char.mode = this.talking ? 'talk' : 'idle';
      if (this.wait <= 0) {
        const n = this.targets.length;
        let next: number;
        if (this.chain) {
          next = this.idx + (this.rng() < 0.5 ? -1 : 1);
          if (next < 0) next = 1;
          if (next >= n) next = n - 2;
        } else {
          next = Math.floor(this.rng() * n);
          if (next === this.idx) next = (next + 1) % n;
        }
        this.idx = Math.max(0, Math.min(n - 1, next));
      }
    } else if (this.talking) {
      this.char.mode = 'talk';
    } else {
      const t = this.targets[this.idx];
      const dx = t.x - r.x;
      const dy = t.y - r.y;
      const d = Math.hypot(dx, dy);
      const step = 30 * dt;
      this.char.mode = 'walk';
      this.char.setDir(dx >= 0 ? (dy >= 0 ? 0 : 2) : dy >= 0 ? 1 : 3);
      if (d <= step) {
        r.position.set(t.x, t.y);
        this.wait = this.pauseMin + this.rng() * (this.pauseMax - this.pauseMin);
        this.char.setDir(this.rng() < 0.5 ? 0 : 1);
      } else {
        r.x += (dx / d) * step;
        r.y += (dy / d) * step;
      }
      r.zIndex = r.y;
    }
    this.char.update(dt);
  }
}

interface Popup {
  text: Text;
  age: number;
  life: number;
}

interface LockView {
  root: Container;
  badge: Container;
  price: Text;
}

export class OfficeView {
  readonly container = new Container();
  private readonly bg = new Container();
  readonly world = new Container();
  /** Подписи комнат и замки — поверх мебели соседних комнат. */
  private readonly labels = new Container();
  private readonly top = new Container();
  private theme: Theme = THEMES.startup;
  private desks = new Map<string, DeskView>();
  private managers: (RoomWalker | null)[] = DEPTS.map(() => null);
  private director!: RoomWalker;
  private directorDeskG = new Container();
  private rest = { coffee: new Container(), fridge: new Container(), tv: new Container() };
  private toilet!: ReturnType<typeof toiletCabin>;
  private toiletBusy = false;
  readonly walkers: WalkerWorld;
  /** Замки закрытых комнат: ключ — `d<номер отдела>` или id комнаты (director, rest, toilet). */
  private locks = new Map<string, LockView>();
  private hireMarks = new Container();
  private popups: Popup[] = [];
  private snow: Graphics[] = [];
  private hallDecor = new Container();
  /** Прохожий дошёл до стены этажа: id говорящего для пузыря. */
  onWalkerEdge: (speakerId: string) => void = () => {};
  private time = 0;
  private eventId: string | null = null;

  constructor(
    private readonly game: Game,
    private readonly rng: () => number,
  ) {
    this.world.sortableChildren = true;
    this.container.addChild(this.bg, this.world, this.labels, this.top);
    this.hireMarks.zIndex = -1e6;
    this.world.addChild(this.hireMarks);
    this.buildStatic();
    this.walkers = new WalkerWorld(this.world, (a, b) => this.blocked(a, b), rng, (kind) => this.slotOpen(kind));
    this.walkers.onToilet = (busy) => this.setToilet(busy);
    this.walkers.onEdge = (w) => this.onWalkerEdge(`walker${this.walkers.walkers.indexOf(w)}`);
    this.syncAll();
    game.on((e) => this.onGameEvent(e));
  }

  get themeBg(): number {
    return this.theme.bg;
  }

  // ---------- статика: пол, стены, комнаты, мебель общих зон ----------

  private blocked(a: number, b: number): boolean {
    for (const r of ROOMS) {
      const closed = (r.kind === 'rest' || r.kind === 'toilet') && !this.game.roomOpen(r.kind);
      if (r.kind === 'dept' || r.kind === 'director' || closed) {
        if (Math.abs(a - r.col * P) <= 0.52 && Math.abs(b - r.row * P) <= 0.52) return true;
      }
    }
    // мебель общих зон: квадраты в координатах комнаты (u, v, полуразмер)
    const items: [RoomDef['id'], number, number, number][] = [
      ['rest', 0.2, 0.14, 0.12],
      ['rest', 0.82, 0.16, 0.1],
      ['rest', 0.36, 0.72, 0.1],
      ['rest', 0.76, 0.78, 0.1],
      ['toilet', 0.44, 0.22, 0.16],
      ['toilet', 0.82, 0.5, 0.08],
      ['hall', 0.12, 0.12, 0.06],
      ['hall', 0.88, 0.12, 0.06],
      ['hall', 0.12, 0.88, 0.06],
    ];
    for (const [id, u, v, h] of items) {
      const r = roomById(id);
      const ca = r.col * P - 0.5 + u;
      const cb = r.row * P - 0.5 + v;
      if (Math.abs(a - ca) <= h && Math.abs(b - cb) <= h) return true;
    }
    return false;
  }

  private buildStatic(): void {
    for (const c of this.bg.removeChildren()) c.destroy({ children: true });
    for (const c of this.labels.removeChildren()) c.destroy({ children: true });
    const th = this.theme;
    const f = floorBounds();
    this.bg.addChild(this.drawYard());
    const g = new Graphics();
    // пол этажа
    poly(g, [f.cx, f.cy - f.hh, f.cx + f.hw, f.cy, f.cx, f.cy + f.hh, f.cx - f.hw, f.cy], { fill: th.floor, line: 4 });
    // доски / плитка
    for (let i = 1; i < 14; i++) {
      const s = f.min + ((f.max - f.min) * i) / 14;
      const a0 = isoW(s, f.min);
      const a1 = isoW(s, f.max);
      line(g, [a0.x, a0.y, a1.x, a1.y], th.floorLine, 1.5);
      if (this.game.company().style !== 'startup') {
        const b0 = isoW(f.min, s);
        const b1 = isoW(f.max, s);
        line(g, [b0.x, b0.y, b1.x, b1.y], th.floorLine, 1.5);
      }
    }
    // торцы пола у ближних краёв: этаж стоит на «плите»
    const slab = 14;
    poly(g, [f.cx - f.hw, f.cy, f.cx, f.cy + f.hh, f.cx, f.cy + f.hh + slab, f.cx - f.hw, f.cy + slab], shade(th.floor, -0.3));
    poly(g, [f.cx, f.cy + f.hh, f.cx + f.hw, f.cy, f.cx + f.hw, f.cy + slab, f.cx, f.cy + f.hh + slab], shade(th.floor, -0.4));
    this.bg.addChild(g);

    // внешние стены с окнами по двум дальним краям этажа
    const walls = new Graphics();
    const H = OUTER_WALL_H;
    const left = { x: f.cx - f.hw, y: f.cy };
    const topP = { x: f.cx, y: f.cy - f.hh };
    const right = { x: f.cx + f.hw, y: f.cy };
    poly(walls, [left.x, left.y, topP.x, topP.y, topP.x, topP.y - H, left.x, left.y - H], { fill: th.wall, line: 4 });
    poly(walls, [topP.x, topP.y, right.x, right.y, right.x, right.y - H, topP.x, topP.y - H], { fill: shade(th.wall, -0.08), line: 4 });
    for (let i = 0; i < 6; i++) {
      for (const side of [0, 1]) {
        const a = side === 0 ? left : topP;
        const b = side === 0 ? topP : right;
        const t0 = (i + 0.2) / 6;
        const t1 = (i + 0.8) / 6;
        const x0 = a.x + (b.x - a.x) * t0;
        const y0 = a.y + (b.y - a.y) * t0;
        const x1 = a.x + (b.x - a.x) * t1;
        const y1 = a.y + (b.y - a.y) * t1;
        poly(walls, [x0, y0 - 16, x1, y1 - 16, x1, y1 - 56, x0, y0 - 56], { fill: th.window, line: 3 });
        if (this.game.company().style === 'space') {
          circle(walls, (x0 + x1) / 2, (y0 + y1) / 2 - 40, 1.6, { fill: 0xffffff, line: 0 });
          circle(walls, (x0 + x1) / 2 + 8, (y0 + y1) / 2 - 28, 1.2, { fill: 0xffffff, line: 0 });
        } else line(walls, [x0 + 4, y0 - 50, x0 + 14, y0 - 54], 0xffffff, 2);
      }
    }
    if (th.neon) line(walls, [left.x, left.y - H + 6, topP.x, topP.y - H + 6, right.x, right.y - H + 6], th.neon, 3);
    this.bg.addChild(walls);

    // комнаты
    for (const def of ROOMS) this.bg.addChild(this.drawRoom(def));

    // мебель общих зон — в сортируемый слой
    for (const c of [this.directorDeskG, this.rest.coffee, this.rest.fridge, this.rest.tv, this.hallDecor]) {
      if (c.parent) c.parent.removeChild(c);
    }
    const restDef = roomById('rest');
    const place = (c: Container, def: RoomDef, u: number, v: number, sx = 1, ox = 0, oy = 0): void => {
      const w = roomWorld(def, u, v);
      c.position.set(w.x, w.y);
      c.zIndex = w.y;
      c.scale.set(sx);
      c.pivot.set(ox, oy);
      this.world.addChild(c);
    };
    place(this.rest.coffee, restDef, 0.2, 0.14, 0.9, 70, 120);
    place(this.rest.fridge, restDef, 0.82, 0.16, 0.85, 70, 138);
    const sofaC = new Container();
    sofaC.addChild(sofa(th.rest === 0x8ccaca ? 0x2fbfae : shade(th.rest, 0.1)));
    place(sofaC, restDef, 0.36, 0.72, 0.9, 80, 90);
    place(this.rest.tv, restDef, 0.78, 0.8, 0.8, 80, 104);
    this.syncRest();

    const toiletDef = roomById('toilet');
    this.toilet = toiletCabin();
    place(this.toilet.root, toiletDef, 0.44, 0.22, 0.8, 70, 140);
    const sk = new Container();
    sk.addChild(sink());
    place(sk, toiletDef, 0.82, 0.5, 0.8, 30, 40);
    this.setToilet(this.toiletBusy);

    const dirDef = roomById('director');
    place(this.directorDeskG, dirDef, 0.5, 0.42, 0.8, 0, 0);
    this.syncDirectorDesk();
    const pl = new Container();
    pl.addChild(plant(th.plant, true));
    place(pl, dirDef, 0.86, 0.14, 0.8);
    this.director?.char.root.parent?.removeChild(this.director.char.root);
    this.director = new RoomWalker(
      DIRECTOR_LOOK,
      [roomWorld(dirDef, 0.5, 0.66), roomWorld(dirDef, 0.12, 0.32), roomWorld(dirDef, 0.3, 0.75), roomWorld(dirDef, 0.7, 0.7)],
      this.rng,
      4,
      8,
    );
    this.world.addChild(this.director.char.root);

    // холл: растения, кулер, ковёр, ёлка
    for (const c of this.hallDecor.removeChildren()) c.destroy({ children: true });
    const hall = roomById('hall');
    for (const [u, v] of [
      [0.12, 0.12],
      [0.12, 0.88],
    ]) {
      const pc = new Container();
      pc.addChild(plant(th.plant, true));
      place(pc, hall, u, v, 0.9);
    }
    const cooler = new Container();
    cooler.addChild(waterCooler());
    place(cooler, hall, 0.88, 0.12, 0.9);
    this.syncEventDecor();
  }

  private drawRoom(def: RoomDef): Container {
    const c = new Container();
    const th = this.theme;
    const ctr = roomCenter(def.col, def.row);
    c.position.set(ctr.x, ctr.y);
    const hw = ROOM_W / 2;
    const hh = ROOM_H / 2;
    let floor = th.hall;
    if (def.kind === 'dept') floor = th.carpets[def.dept!];
    else if (def.kind === 'director') floor = th.carpets[5];
    else if (def.kind === 'rest') floor = th.rest;
    else if (def.kind === 'toilet') floor = th.toilet;
    const g = new Graphics();
    const wall = def.kind === 'hall' ? 0 : WALL_H;
    // у края этажа своей стены нет: её роль играет стена этажа
    const outer = touchesOuter(def);
    if (wall && !outer.left) poly(g, [-hw, 0, 0, -hh, 0, -hh - wall, -hw, -wall], shade(floor, -0.3));
    if (wall && !outer.right) poly(g, [0, -hh, hw, 0, hw, -wall, 0, -hh - wall], shade(floor, -0.38));
    poly(g, [0, -hh, hw, 0, 0, hh, -hw, 0], { fill: floor, line: 3 });
    if (wall) {
      // низкие бортики по ближним краям, посередине — проход
      const ledge = (x0: number, y0: number, x1: number, y1: number, color: number): void => {
        for (const [t0, t1] of [
          [0, 0.36],
          [0.64, 1],
        ]) {
          const ax = x0 + (x1 - x0) * t0;
          const ay = y0 + (y1 - y0) * t0;
          const bx = x0 + (x1 - x0) * t1;
          const by = y0 + (y1 - y0) * t1;
          poly(g, [ax, ay, bx, by, bx, by - LEDGE_H, ax, ay - LEDGE_H], { fill: color, line: 2 });
        }
      };
      ledge(-hw, 0, 0, hh, shade(floor, -0.18));
      ledge(0, hh, hw, 0, shade(floor, -0.26));
    }
    if (def.kind === 'hall') poly(g, [0, -hh * 0.55, hw * 0.55, 0, 0, hh * 0.55, -hw * 0.55, 0], { fill: shade(floor, -0.12), line: 2 });
    if (def.kind === 'toilet') {
      // плитка: линии вдоль обеих изо-осей
      for (let i = 1; i < 6; i++) {
        const k = i / 6;
        line(g, [-hw + hw * k, -hh * k, hw * k, hh - hh * k], shade(floor, -0.08), 1.5);
        line(g, [hw - hw * k, -hh * k, -hw * k, hh - hh * k], shade(floor, -0.08), 1.5);
      }
    }
    c.addChild(g);
    const label = new Text({
      text: t(`room.${def.id}` as Key),
      style: { fill: '#ffffff', fontSize: 20, fontWeight: '800', fontFamily: 'Nunito, system-ui, sans-serif', stroke: { color: '#262338', width: 4 } },
    });
    label.anchor.set(0.5);
    label.position.set(ctr.x, ctr.y + hh - 26);
    this.labels.addChild(label);

    const lockKey = def.kind === 'dept' ? `d${def.dept}` : def.kind === 'director' || def.kind === 'rest' || def.kind === 'toilet' ? def.kind : null;
    if (lockKey) {
      const lockRoot = new Container();
      const shadeG = new Graphics();
      poly(shadeG, [0, -hh, hw, 0, 0, hh, -hw, 0], { fill: 0x262338, alpha: 0.5, line: 0 });
      const lockG = new Graphics();
      rect(lockG, -16, -24, 32, 26, 6, 0xffd23f);
      lockG.moveTo(-9, -24).lineTo(-9, -34).arc(0, -34, 9, Math.PI, 0).lineTo(9, -24).stroke({ color: OUT, width: 5, cap: 'round' });
      circle(lockG, 0, -12, 3.5, OUT);
      const price = new Text({
        text: '',
        style: { fill: '#ffffff', fontSize: 18, fontWeight: '800', fontFamily: 'Nunito, system-ui, sans-serif', stroke: { color: '#262338', width: 4 } },
      });
      price.anchor.set(0.5);
      price.position.set(0, 20);
      lockRoot.addChild(shadeG);
      c.addChild(lockRoot);
      const badge = new Container();
      badge.position.set(ctr.x, ctr.y);
      badge.addChild(lockG, price);
      this.labels.addChild(badge);
      this.locks.set(lockKey, { root: lockRoot, badge, price });
    }
    return c;
  }

  setTheme(): void {
    this.theme = THEMES[this.game.company().style];
    this.buildStatic();
    this.syncAll();
  }

  /** Поле вокруг офиса: трава, дорожки, деревья, кусты. Узор постоянный (seeded). */
  private drawYard(): Container {
    const c = new Container();
    const b = this.bounds();
    const f = floorBounds();
    const space = this.game.company().style === 'space';
    const grass = space ? 0x2b2950 : 0x8fd16a;
    const grass2 = space ? 0x33315c : 0x84c75f;
    const g = new Graphics();
    rect(g, b.x, b.y, b.width, b.height, 0, { fill: grass, line: 0 });
    const rnd = seeded(77);
    // пятна травы потемнее
    for (let i = 0; i < 90; i++) {
      ellipse(g, b.x + rnd() * b.width, b.y + rnd() * b.height, 30 + rnd() * 60, 12 + rnd() * 24, { fill: grass2, line: 0 });
    }
    // дорожка вокруг этажа и дорожка от входа (ближний угол) к краю поля
    const path = space ? 0x4a4775 : 0xe9d9b0;
    const ring = GAP * 0.55;
    const k = ring / Math.max(1, f.hw);
    poly(g, [f.cx, f.cy - f.hh * (1 + k) - ring * 0.2, f.cx + f.hw * (1 + k), f.cy, f.cx, f.cy + f.hh * (1 + k) + ring * 0.2, f.cx - f.hw * (1 + k), f.cy], { fill: path, line: 3 });
    // дорожка от входа (ближний угол этажа) вдоль изо-оси к краю поля
    const ux = 2 / Math.sqrt(5);
    const uy = 1 / Math.sqrt(5);
    const pw = 46;
    const ex = f.cx;
    const ey = f.cy + f.hh;
    const L = YARD * 2.4;
    poly(g, [ex - ux * pw, ey + uy * pw - 20, ex + ux * pw, ey - uy * pw - 20, ex + ux * pw + ux * L, ey - uy * pw + uy * L, ex - ux * pw + ux * L, ey + uy * pw + uy * L], { fill: path, line: 3 });
    const onPath = (x: number, y: number): boolean => {
      const rx = x - ex;
      const ry = y - ey;
      const along = rx * ux + ry * uy;
      const across = Math.abs(-rx * uy + ry * ux);
      return along > -40 && across < pw + 50;
    };
    c.addChild(g);
    // деревья и кусты — вне этажа и дорожки, с отступом
    const outside = (x: number, y: number, pad: number): boolean => {
      const dx = Math.abs(x - f.cx) / (f.hw * (1 + k) + pad);
      const dy = Math.abs(y - f.cy) / (f.hh * (1 + k) + pad * 0.5);
      return dx + dy > 1;
    };
    const trees: { x: number; y: number; r: number; bush: boolean }[] = [];
    for (let i = 0; i < 400 && trees.length < 70; i++) {
      const x = b.x + rnd() * b.width;
      const y = b.y + rnd() * b.height;
      if (!outside(x, y, 60)) continue;
      if (onPath(x, y)) continue; // не на дорожке
      if (trees.some((t) => Math.hypot(t.x - x, (t.y - y) * 2) < 90)) continue;
      trees.push({ x, y, r: 26 + rnd() * 18, bush: rnd() < 0.35 });
    }
    trees.sort((p, q) => p.y - q.y);
    const tg = new Graphics();
    for (const t of trees) {
      const leaf = space ? 0x6b5bd6 : t.bush ? 0x4fb34a : 0x3f9f45;
      ellipse(tg, t.x, t.y, t.r * 0.9, t.r * 0.35, { fill: OUT, alpha: 0.16, line: 0 });
      if (t.bush) {
        circle(tg, t.x - t.r * 0.35, t.y - t.r * 0.3, t.r * 0.45, leaf);
        circle(tg, t.x + t.r * 0.35, t.y - t.r * 0.3, t.r * 0.45, leaf);
        circle(tg, t.x, t.y - t.r * 0.55, t.r * 0.5, shade(leaf, 0.08));
      } else {
        rect(tg, t.x - 5, t.y - t.r * 1.1, 10, t.r * 1.1, 3, space ? 0x3b3566 : 0x9a6a3e);
        circle(tg, t.x, t.y - t.r * 1.5, t.r, leaf);
        circle(tg, t.x - t.r * 0.3, t.y - t.r * 1.75, t.r * 0.45, { fill: shade(leaf, 0.18), line: 0 });
      }
    }
    c.addChild(tg);
    return c;
  }

  // ---------- синхронизация с состоянием игры ----------

  private key(d: number, k: number): string {
    return `${d}:${k}`;
  }

  syncAll(): void {
    // столы
    for (const [key, view] of this.desks) {
      const [d, k] = key.split(':').map(Number);
      if (!this.game.isHired(d, k)) {
        view.root.destroy({ children: true });
        this.desks.delete(key);
      }
    }
    for (let d = 0; d < DEPT_COUNT; d++) {
      for (let k = 0; k < DESKS; k++) {
        if (this.game.isHired(d, k) && !this.desks.has(this.key(d, k))) {
          const v = new DeskView(this.game, d, k, this.rng);
          this.world.addChild(v.root);
          this.desks.set(this.key(d, k), v);
        }
      }
      // руководители
      const has = this.game.run.managers[d];
      if (has && !this.managers[d]) {
        const def = deptRoom(d);
        // ходит по проходу между рядами столов
        const pts = [0.12, 0.3, 0.5, 0.7, 0.88].map((v) => roomWorld(def, AISLE_U, v));
        const look = randomLook(seeded(this.game.state.company * 1009 + d * 31 + 500), 'manager');
        const m = new RoomWalker(look, pts, this.rng, 2, 5, true);
        this.world.addChild(m.char.root);
        this.managers[d] = m;
      } else if (!has && this.managers[d]) {
        this.managers[d]!.char.root.destroy({ children: true });
        this.managers[d] = null;
      }
      const lock = this.locks.get(`d${d}`);
      if (lock) lock.root.visible = lock.badge.visible = !this.game.isUnlocked(d);
    }
    for (const id of ROOM_IDS) {
      const lock = this.locks.get(id);
      if (lock) lock.root.visible = lock.badge.visible = !this.game.roomOpen(id);
    }
    const dirOpen = this.game.roomOpen('director');
    this.director.char.root.visible = dirOpen;
    this.syncRest();
    this.syncDirectorDesk();
    this.syncHireMarks();
    this.updateLockPrices();
  }

  private syncRest(): void {
    const r = this.game.run.rest;
    for (const c of this.rest.coffee.removeChildren()) c.destroy({ children: true });
    this.rest.coffee.addChild(coffeeMachine(r.coffee));
    for (const c of this.rest.fridge.removeChildren()) c.destroy({ children: true });
    this.rest.fridge.addChild(fridge(r.fridge));
    for (const c of this.rest.tv.removeChildren()) c.destroy({ children: true });
    this.rest.tv.addChild(tvStand(r.games));
  }

  syncDirectorDesk(): void {
    for (const c of this.directorDeskG.removeChildren()) c.destroy({ children: true });
    this.directorDeskG.addChild(directorDesk(this.game.state.directorDesk));
  }

  private syncHireMarks(): void {
    for (const c of this.hireMarks.removeChildren()) c.destroy({ children: true });
    for (let d = 0; d < DEPT_COUNT; d++) {
      if (!this.game.isUnlocked(d)) continue;
      const k = this.game.nextDesk(d);
      if (k < 0) continue;
      const slot = DESK_SLOTS[k];
      const w = roomWorld(deptRoom(d), slot.u, slot.v);
      const g = new Graphics();
      const ready = this.game.hireAvailable(d, k);
      poly(g, [w.x, w.y - 22, w.x + 40, w.y, w.x, w.y + 22, w.x - 40, w.y], {
        fill: 0xffffff,
        alpha: ready ? 0.35 : 0.12,
        line: 2,
        lineColor: ready ? 0x3ccf63 : 0xffffff,
      });
      if (ready) {
        line(g, [w.x - 8, w.y, w.x + 8, w.y], 0x3ccf63, 4);
        line(g, [w.x, w.y - 8, w.x, w.y + 8], 0x3ccf63, 4);
      }
      this.hireMarks.addChild(g);
    }
  }

  private updateLockPrices(): void {
    const show = (lock: LockView | undefined, available: boolean, cost: number): void => {
      if (!lock || !lock.root.visible) return;
      if (available) {
        lock.price.text = formatNumber(cost);
        lock.price.style.fill = this.game.canAfford(cost) ? '#7dff9a' : '#ffffff';
      } else lock.price.text = t('locked');
    };
    for (let d = 0; d < DEPT_COUNT; d++) show(this.locks.get(`d${d}`), this.game.unlockAvailable(d), this.game.unlockCost(d));
    for (const id of ROOM_IDS) show(this.locks.get(id), this.game.roomUnlockAvailable(id), this.game.roomCost(id));
  }

  /** Комнаты открылись или закрылись (реорганизация): прохожие заново узнают, где можно ходить. */
  private syncRooms(): void {
    this.walkers.rebuild((a, b) => this.blocked(a, b), (kind) => this.slotOpen(kind));
    this.syncAll();
  }

  private slotOpen(kind: string): boolean {
    return kind === 'toilet' ? this.game.roomOpen('toilet') : this.game.roomOpen('rest');
  }

  private setToilet(busy: boolean): void {
    this.toiletBusy = busy;
    if (!this.toilet) return;
    this.toilet.doorClosed.visible = busy;
    this.toilet.doorOpen.visible = !busy;
    this.toilet.lamp.clear();
    circle(this.toilet.lamp, 53, 50, 9, { fill: busy ? 0xff2d3a : 0x3ccf63, alpha: 0.25, line: 0 });
    circle(this.toilet.lamp, 53, 50, 5, busy ? 0xff2d3a : 0x3ccf63);
  }

  setEvent(id: string | null): void {
    if (id === this.eventId) return;
    this.eventId = id;
    this.syncEventDecor();
  }

  private syncEventDecor(): void {
    for (const s of this.snow) s.destroy();
    this.snow = [];
    const hall = roomById('hall');
    this.hallDecor.parent?.removeChild(this.hallDecor);
    for (const c of this.hallDecor.removeChildren()) c.destroy({ children: true });
    if (this.eventId === 'newyear') {
      this.hallDecor.addChild(newYearTree());
      const w = roomWorld(hall, 0.5, 0.5);
      this.hallDecor.position.set(w.x, w.y);
      this.hallDecor.zIndex = w.y;
      this.hallDecor.scale.set(1.1);
      this.world.addChild(this.hallDecor);
      const f = floorBounds();
      for (let i = 0; i < 70; i++) {
        const s = new Graphics();
        circle(s, 0, 0, 2 + Math.random() * 2, { fill: 0xffffff, alpha: 0.9, line: 0 });
        s.position.set(f.cx - f.hw + Math.random() * f.hw * 2, f.cy - f.hh - 80 + Math.random() * (f.hh * 2 + 80));
        this.top.addChild(s);
        this.snow.push(s);
      }
    }
  }

  private onGameEvent(e: GameEvent): void {
    switch (e.type) {
      case 'payout':
        this.spawnPopup(e.payout.dept, e.payout.desk, e.payout.amount, false);
        break;
      case 'hire':
      case 'unlock':
      case 'manager':
        this.syncAll();
        break;
      case 'room':
      case 'reorg':
        this.syncRooms();
        break;
      case 'levels':
        this.syncHireMarks();
        break;
      case 'furn':
        this.desks.get(this.key(e.dept, e.desk))?.build(this.rng);
        break;
      case 'rest':
        this.syncRest();
        break;
      case 'company':
        this.setTheme();
        break;
      case 'ticketGone':
        break;
      default:
    }
  }

  // ---------- для интерфейса ----------

  /** Комната под точкой мира. */
  roomAt(x: number, y: number): RoomDef | undefined {
    return ROOMS.find((r) => isInsideRoom(r, x, y));
  }

  roomFocus(def: RoomDef): Pt {
    return roomCenter(def.col, def.row);
  }

  /** Весь нарисованный мир: этаж и поле вокруг. Камера не показывает ничего за его краями. */
  bounds(): { x: number; y: number; width: number; height: number } {
    const f = floorBounds();
    return { x: f.cx - f.hw - YARD, y: f.cy - f.hh - YARD, width: (f.hw + YARD) * 2, height: (f.hh + YARD) * 2 };
  }

  /** Только этаж (для «показать весь офис»). */
  floorRect(): { x: number; y: number; width: number; height: number } {
    const f = floorBounds();
    return { x: f.cx - f.hw, y: f.cy - f.hh - OUTER_WALL_H, width: f.hw * 2, height: f.hh * 2 + OUTER_WALL_H + 20 };
  }

  ticketAnchor(d: number, k: number): Pt | null {
    return this.desks.get(this.key(d, k))?.ticketAnchor() ?? null;
  }

  /** Все, кто может говорить. */
  speakers(): Speaker[] {
    const out: Speaker[] = [];
    const company = this.game.company().style;
    const extra = (): PhraseGroup[] => {
      const g: PhraseGroup[] = [];
      if (company !== 'startup') g.push(company);
      if (this.eventId) g.push(this.eventId as PhraseGroup);
      return g;
    };
    for (const [key, v] of this.desks) {
      const [d] = key.split(':').map(Number);
      out.push({
        id: `desk${key}`,
        room: deptRoom(d).id,
        anchor: () => v.anchor(),
        groups: () => [DEPT_GROUP[d]],
        canSpeak: () => true,
        talk: (on) => v.setTalking(on),
      });
    }
    this.managers.forEach((m, d) => {
      if (!m) return;
      out.push({
        id: `lead${d}`,
        room: deptRoom(d).id,
        anchor: () => m.anchor(),
        groups: () => [LEAD_GROUP[d]],
        canSpeak: () => m.isResting(),
        talk: (on) => m.setTalking(on),
      });
    });
    const dir = this.director;
    out.push({
      id: 'director',
      room: 'director',
      anchor: () => dir.anchor(),
      groups: () => ['director', ...extra()],
      canSpeak: () => dir.isResting() && this.game.roomOpen('director'),
      talk: (on) => dir.setTalking(on),
    });
    this.walkers.walkers.forEach((w, i) => {
      out.push({
        id: `walker${i}`,
        room: w.hidden ? 'toilet' : w.speaker().room,
        anchor: () => (w.hidden ? this.toiletAnchor() : { x: w.pos.x, y: w.pos.y - 60 }),
        groups: () => {
          const s = w.speaker();
          if (w.hidden) return ['toilet'];
          if (s.group === 'bonus') return this.game.state.bonusPhrases > 0 ? ['bonus', 'coffee', ...extra()] : ['coffee', ...extra()];
          return [s.group, ...extra()];
        },
        canSpeak: () => w.isResting() || w.hidden,
      });
    });
    return out;
  }

  private toiletAnchor(): Pt {
    const w = roomWorld(roomById('toilet'), 0.44, 0.22);
    return { x: w.x, y: w.y - 110 };
  }

  /** Значки над комнатами: в зоне отдыха можно что-то улучшить; у директора новое задание. */
  roomBadges(): { pos: Pt; text: string; kind: 'up' | 'task' }[] {
    const g = this.game;
    const out: { pos: Pt; text: string; kind: 'up' | 'task' }[] = [];
    if (g.roomOpen('rest')) {
      const ready = (['coffee', 'fridge', 'games'] as const).some((k) => g.run.rest[k] < g.restMax(k) && g.canAfford(g.restCost(k)));
      if (ready) {
        const w = roomWorld(roomById('rest'), 0.5, 0.5);
        out.push({ pos: { x: w.x, y: w.y - 120 }, text: `▲ ${t('rest.badge')}`, kind: 'up' });
      }
    }
    if (g.roomOpen('director')) {
      const task = g.state.director.task;
      if (task && task.endsAt === 0) out.push({ pos: { x: this.director.char.root.x, y: this.director.char.root.y - 72 }, text: '!', kind: 'task' });
    }
    return out;
  }

  /** Отметки «?» / «!» над прохожими у края. */
  walkerMarks(): { pos: Pt; mark: string }[] {
    return this.walkers.walkers.filter((w) => w.mark && !w.hidden).map((w) => ({ pos: { x: w.pos.x, y: w.pos.y - 64 }, mark: w.mark! }));
  }

  // ---------- кадр ----------

  private spawnPopup(d: number, k: number, amount: number, big: boolean): void {
    const v = this.desks.get(this.key(d, k));
    if (!v) return;
    if (!big && this.popups.length > 24) return;
    const text = new Text({
      text: `+${formatNumber(amount)}`,
      style: {
        fill: big ? '#7dff9a' : '#ffd166',
        fontSize: big ? 26 : 17,
        fontWeight: '800',
        fontFamily: 'Nunito, system-ui, sans-serif',
        stroke: { color: '#262338', width: 4 },
      },
    });
    text.anchor.set(0.5);
    const a = v.anchor();
    text.position.set(a.x, a.y - 8);
    this.top.addChild(text);
    this.popups.push({ text, age: 0, life: big ? 1.6 : 1.2 });
  }

  /** Всплывающая сумма у стола (тикет). */
  bigPopup(d: number, k: number, amount: number): void {
    this.spawnPopup(d, k, amount, true);
  }

  update(dt: number, typingSpeed: number): void {
    this.time += dt;
    for (const v of this.desks.values()) v.update(dt, typingSpeed);
    for (const m of this.managers) m?.update(dt);
    this.director.update(dt);
    this.walkers.update(dt);
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.age += dt;
      p.text.y -= dt * 42;
      p.text.alpha = Math.max(0, 1 - p.age / p.life);
      if (p.age >= p.life) {
        p.text.destroy();
        this.popups.splice(i, 1);
      }
    }
    if (this.snow.length) {
      const f = floorBounds();
      for (const s of this.snow) {
        s.y += dt * 26;
        s.x += Math.sin(this.time + s.y * 0.02) * dt * 8;
        if (s.y > f.cy + f.hh) s.y = f.cy - f.hh - 80;
      }
    }
    if (Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) this.updateLockPrices();
  }

  /** Перерисовать всё после смены языка (подписи комнат). */
  relabel(): void {
    this.buildStatic();
    this.syncAll();
  }

  get companyName(): string {
    return t(`company.${companyDef(this.game.state.company).style}` as Key);
  }
}

function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => {
    x = (x + 0x6d2b79f5) >>> 0;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoW(a: number, b: number): Pt {
  return { x: ((a - b) * ROOM_W) / 2, y: ((a + b) * ROOM_H) / 2 };
}

export { worldToIso };
