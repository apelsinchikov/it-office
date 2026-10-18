// Сцена офиса: комнаты, рабочие места, руководители, директор, зона отдыха, туалет, прохожие.

import { Container, Graphics, Text } from 'pixi.js';
import { DEPTS, DEPT_COUNT, DESKS, companyDef } from '../game/config';
import { formatNumber } from '../game/format';
import type { Game, GameEvent } from '../game/game';
import { DEPT_GROUP, LEAD_GROUP, type PhraseGroup } from '../game/phrases';
import { t, type Key } from '../i18n';
import { Character, DIRECTOR_LOOK, dirFrom, randomLook, type Look, type Outfit } from './characters';
import { OUT, circle, line, rect, shade } from './draw';
import {
  DESK_TOP_BACK,
  DESK_TOP_FRONT,
  POST_BACK,
  WORKER_Y,
  chairBack,
  codeLines,
  coffeeMachine,
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
  stool,
  sysadminPost,
  toiletCabin,
  toolbox,
  tvStand,
  typingHand,
  waterCooler,
} from './furniture';
import {
  DESK_SLOTS,
  OUTER_WALL_H,
  P,
  ROOMS,
  ROOM_D,
  ROOM_W,
  WALL_H,
  deptRoom,
  floorBounds,
  isInsideRoom,
  roomById,
  roomCenter,
  roomRect,
  roomWorld,
  touchesOuter,
  worldToIso,
  type Pt,
  type RoomDef,
} from './layout';
import { THEMES, type Theme } from './theme';
import { CHAR_SCALE, WalkerWorld } from './walkers';

const OUTFIT_OF: Outfit[] = ['support', 'dev', 'qa', 'analyst', 'sysadmin'];

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

/** Рабочее место: стол + сидящий за ним сотрудник лицом к камере (у сисадминов — верстак и стоящий спиной сотрудник). */
class DeskView {
  readonly root = new Container();
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
    this.look = randomLook(seeded(game.state.company * 1009 + d * 31 + k * 7 + 1), OUTFIT_OF[d]);
    const slot = DESK_SLOTS[k];
    const w = roomWorld(deptRoom(d), slot.u, slot.v);
    this.root.position.set(w.x, w.y);
    this.root.zIndex = w.y;
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
    for (const c of this.root.removeChildren()) c.destroy({ children: true });
    this.hands = [];
    this.code = [];
    this.steamG = null;
    this.lights = null;
    if (this.d === 4) this.buildPost(rng);
    else this.buildDesk(rng);
  }

  private buildDesk(rng: () => number): void {
    const deskT = Math.max(0, this.tier('desk'));
    const chairT = Math.max(0, this.tier('chair'));
    const monT = this.tier('monitor') >= 0 ? this.tier('monitor') : deskT;
    const keyT = this.tier('keyboard') >= 0 ? this.tier('keyboard') : deskT;
    this.root.addChild(chairBack(chairT));
    this.char = new Character(this.look, rng, true);
    this.char.root.position.set(0, WORKER_Y);
    this.char.root.scale.set(CHAR_SCALE);
    this.root.addChild(this.char.root);
    this.root.addChild(deskSlab(deskT));
    const mon = monitor(monT);
    this.root.addChild(mon.g);
    this.code = codeLines(monT, mon.screen);
    this.root.addChild(...this.code);
    this.root.addChild(keyboard(keyT));
    const sleeve = sleeveOf(this.look);
    this.hands = [typingHand('L', sleeve, this.look.skin), typingHand('R', sleeve, this.look.skin)];
    this.root.addChild(...this.hands);
    if (this.tier('phone') >= 0) this.root.addChild(phone(this.tier('phone')));
    if (this.tier('mouse') >= 0) this.root.addChild(mouse(this.tier('mouse')));
    if (this.single('flower')) this.root.addChild(flower());
    if (this.single('mug')) {
      this.root.addChild(mug(-46, DESK_TOP_FRONT - 16));
      this.steamG = steam(-41, DESK_TOP_FRONT - 18);
      this.root.addChild(this.steamG);
    }
  }

  private buildPost(rng: () => number): void {
    const postT = Math.max(0, this.tier('post'));
    const post = sysadminPost(postT);
    post.addChild(lamp(Math.max(0, this.tier('lamp'))));
    this.lights = (post.children.find((c) => c.label === 'lights') as Container | undefined) ?? null;
    this.root.addChild(post);
    if (this.single('mug')) {
      this.root.addChild(mug(-8, POST_BACK - 56));
      this.steamG = steam(-3, POST_BACK - 58);
      this.root.addChild(this.steamG);
    }
    this.root.addChild(stool(Math.max(0, this.tier('chair'))));
    this.root.addChild(toolbox(Math.max(0, this.tier('toolbox'))));
    this.char = new Character(this.look, rng);
    this.char.root.position.set(0, -4);
    this.char.root.scale.set(CHAR_SCALE);
    this.char.setDir(2);
    this.char.mode = 'repair';
    this.root.addChild(this.char.root);
  }

  /** Точка над головой (для пузыря), в мире. */
  anchor(): Pt {
    if (this.d === 4) return { x: this.root.x, y: this.root.y - 64 };
    return { x: this.root.x, y: this.root.y + WORKER_Y - 60 };
  }

  /** Точка для тикета. */
  ticketAnchor(): Pt {
    return { x: this.root.x - 26, y: this.root.y + DESK_TOP_BACK - 44 };
  }

  setTalking(on: boolean): void {
    if (this.d === 4) this.char.mode = on ? 'talk' : 'repair';
    else this.char.mode = on ? 'talk' : 'sit';
  }

  update(dt: number, speed: number): void {
    this.t += dt * speed;
    this.char.speed = speed;
    this.char.update(dt);
    if (this.hands.length) {
      this.hands[0].y = -2.5 * Math.max(0, Math.sin(this.t * 19));
      this.hands[1].y = -2.5 * Math.max(0, Math.sin(this.t * 19 + Math.PI));
    }
    this.code.forEach((c, i) => {
      const ph = (this.t * 0.62 + i * 0.33) % 1;
      c.scale.x = Math.min(1, ph / 0.6);
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
      this.char.setDir(dirFrom(dx, dy));
      if (d <= step) {
        r.position.set(t.x, t.y);
        this.wait = this.pauseMin + this.rng() * (this.pauseMax - this.pauseMin);
        this.char.setDir(this.rng() < 0.7 ? 0 : this.rng() < 0.5 ? 1 : 3);
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
  private locks: (LockView | null)[] = DEPTS.map(() => null);
  private hireMarks = new Container();
  private popups: Popup[] = [];
  private snow: Graphics[] = [];
  private hallDecor = new Container();
  /** Стены кабинетов и мебель общих зон в сортируемом слое — пересоздаются вместе со статикой. */
  private wallGs: Graphics[] = [];
  private staticItems: Container[] = [];
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
    this.walkers = new WalkerWorld(this.world, (a, b) => this.blocked(a, b), rng);
    this.walkers.onToilet = (busy) => this.setToilet(busy);
    this.walkers.onEdge = (w) => this.onWalkerEdge(`walker${this.walkers.walkers.indexOf(w)}`);
    this.syncAll();
    game.on((e) => this.onGameEvent(e));
  }

  get themeBg(): number {
    return this.theme.bg;
  }

  // ---------- статика: пол, стены, комнаты, мебель общих зон ----------

  /** Нельзя ходить: кабинеты, директор, мебель и боковые стены отдыха и туалета. a, b — координаты плана. */
  private blocked(a: number, b: number): boolean {
    for (const r of ROOMS) {
      const u = a - (r.col * P - 0.5);
      const v = b - (r.row * P - 0.5);
      const inside = u >= -0.02 && u <= 1.02 && v >= -0.02 && v <= 1.02;
      if (!inside) continue;
      if (r.kind === 'dept' || r.kind === 'director') return true;
      if (r.kind === 'rest' || r.kind === 'toilet') {
        // заходят только спереди: стены слева и справа
        if (u < 0.05 || u > 0.95) return true;
      }
    }
    // мебель общих зон: прямоугольники в координатах комнаты (u, v, полуширина, полуглубина)
    const items: [RoomDef['id'], number, number, number, number][] = [
      ['rest', 0.22, 0.13, 0.16, 0.13],
      ['rest', 0.88, 0.14, 0.07, 0.14],
      ['rest', 0.55, 0.1, 0.13, 0.11],
      ['rest', 0.55, 0.6, 0.18, 0.04],
      ['toilet', 0.34, 0.18, 0.14, 0.19],
      ['toilet', 0.8, 0.12, 0.07, 0.13],
      ['hall', 0.08, 0.14, 0.05, 0.05],
      ['hall', 0.08, 0.92, 0.05, 0.05],
      ['hall', 0.92, 0.14, 0.05, 0.06],
    ];
    for (const [id, cu, cv, hu, hv] of items) {
      const r = roomById(id);
      const u = a - (r.col * P - 0.5);
      const v = b - (r.row * P - 0.5);
      if (Math.abs(u - cu) <= hu && Math.abs(v - cv) <= hv) return true;
    }
    return false;
  }

  private buildStatic(): void {
    for (const c of this.bg.removeChildren()) c.destroy({ children: true });
    for (const c of this.labels.removeChildren()) c.destroy({ children: true });
    for (const w of this.wallGs) w.destroy();
    this.wallGs = [];
    const th = this.theme;
    const f = floorBounds();
    const fw = f.x1 - f.x0;
    const fh = f.y1 - f.y0;
    const g = new Graphics();
    // пол этажа: доски (стартап) или плитка
    rect(g, f.x0, f.y0, fw, fh, 0, { fill: th.floor, line: 4 });
    for (let i = 1; i < 18; i++) line(g, [f.x0, f.y0 + (fh * i) / 18, f.x1, f.y0 + (fh * i) / 18], th.floorLine, 1.5);
    if (this.game.company().style !== 'startup') for (let i = 1; i < 18; i++) line(g, [f.x0 + (fw * i) / 18, f.y0, f.x0 + (fw * i) / 18, f.y1], th.floorLine, 1.5);
    this.bg.addChild(g);

    // стены этажа: дальняя с окнами, боковые видны сверху узкой полосой
    const walls = new Graphics();
    const H = OUTER_WALL_H;
    rect(walls, f.x0, f.y0 - H, fw, H, 0, { fill: th.wall, line: 4 });
    const nWin = 9;
    for (let i = 0; i < nWin; i++) {
      const x0 = f.x0 + (fw * (i + 0.2)) / nWin;
      const x1 = f.x0 + (fw * (i + 0.8)) / nWin;
      rect(walls, x0, f.y0 - H * 0.82, x1 - x0, H * 0.58, 3, { fill: th.window, line: 3 });
      if (this.game.company().style === 'space') {
        circle(walls, (x0 + x1) / 2 - 6, f.y0 - H * 0.66, 1.6, { fill: 0xffffff, line: 0 });
        circle(walls, (x0 + x1) / 2 + 8, f.y0 - H * 0.46, 1.2, { fill: 0xffffff, line: 0 });
      } else line(walls, [x0 + 5, f.y0 - H * 0.74, x0 + 16, f.y0 - H * 0.78], 0xffffff, 2);
    }
    if (th.neon) line(walls, [f.x0, f.y0 - H + 5, f.x1, f.y0 - H + 5], th.neon, 3);
    const TW = 14;
    for (const x of [f.x0 - TW, f.x1]) {
      rect(walls, x, f.y0 - H, TW, fh, 0, { fill: th.wallTop, line: 3 });
      rect(walls, x, f.y1 - H, TW, H, 0, { fill: shade(th.wall, -0.15), line: 3 });
    }
    this.bg.addChild(walls);

    // комнаты
    for (const def of ROOMS) this.bg.addChild(this.drawRoom(def));

    // мебель общих зон — в сортируемый слой
    for (const c of [this.directorDeskG, this.rest.coffee, this.rest.fridge, this.rest.tv, this.hallDecor]) {
      if (c.parent) c.parent.removeChild(c);
    }
    for (const c of this.staticItems) c.destroy({ children: true });
    this.staticItems = [];
    const place = (c: Container, def: RoomDef, u: number, v: number, own = true): void => {
      const w = roomWorld(def, u, v);
      c.position.set(w.x, w.y);
      c.zIndex = w.y;
      this.world.addChild(c);
      if (own) this.staticItems.push(c);
    };
    const restDef = roomById('rest');
    place(this.rest.coffee, restDef, 0.22, 0.26, false);
    place(this.rest.fridge, restDef, 0.88, 0.28, false);
    place(this.rest.tv, restDef, 0.55, 0.21, false);
    const sofaC = new Container();
    sofaC.addChild(sofa(th.rest === 0x8ccaca ? 0x2fbfae : shade(th.rest, 0.1)));
    place(sofaC, restDef, 0.55, 0.63);
    this.syncRest();

    const toiletDef = roomById('toilet');
    this.toilet = toiletCabin();
    place(this.toilet.root, toiletDef, 0.34, 0.37);
    const sk = new Container();
    sk.addChild(sink());
    place(sk, toiletDef, 0.8, 0.25);
    this.setToilet(this.toiletBusy);

    const dirDef = roomById('director');
    place(this.directorDeskG, dirDef, 0.5, 0.5, false);
    this.syncDirectorDesk();
    const pl = new Container();
    pl.addChild(plant(th.plant, true));
    place(pl, dirDef, 0.88, 0.22);
    this.director?.char.root.parent?.removeChild(this.director.char.root);
    this.director = new RoomWalker(
      DIRECTOR_LOOK,
      [roomWorld(dirDef, 0.5, 0.78), roomWorld(dirDef, 0.16, 0.42), roomWorld(dirDef, 0.24, 0.86), roomWorld(dirDef, 0.76, 0.82), roomWorld(dirDef, 0.84, 0.46)],
      this.rng,
      4,
      8,
    );
    this.world.addChild(this.director.char.root);

    // холл: растения, кулер, ковёр (на полу), ёлка
    const hall = roomById('hall');
    for (const [u, v] of [
      [0.08, 0.16],
      [0.08, 0.94],
    ]) {
      const pc = new Container();
      pc.addChild(plant(th.plant, true));
      place(pc, hall, u, v);
    }
    const cooler = new Container();
    cooler.addChild(waterCooler());
    place(cooler, hall, 0.92, 0.18);
    this.syncEventDecor();
  }

  private drawRoom(def: RoomDef): Container {
    const c = new Container();
    const th = this.theme;
    const ctr = roomCenter(def.col, def.row);
    const R = roomRect(def);
    let floor = th.hall;
    if (def.kind === 'dept') floor = th.carpets[def.dept!];
    else if (def.kind === 'director') floor = th.carpets[5];
    else if (def.kind === 'rest') floor = th.rest;
    else if (def.kind === 'toilet') floor = th.toilet;
    const g = new Graphics();
    rect(g, R.x0, R.y0, ROOM_W, ROOM_D, 0, { fill: floor, line: 3 });
    if (def.kind === 'hall') {
      const mx = ROOM_W * 0.22;
      const my = ROOM_D * 0.22;
      rect(g, R.x0 + mx, R.y0 + my, ROOM_W - mx * 2, ROOM_D - my * 2, 10, { fill: shade(floor, -0.12), line: 2 });
    }
    if (def.kind === 'toilet') {
      for (let i = 1; i < 7; i++) {
        line(g, [R.x0 + (ROOM_W * i) / 7, R.y0, R.x0 + (ROOM_W * i) / 7, R.y1], shade(floor, -0.08), 1.5);
        line(g, [R.x0, R.y0 + (ROOM_D * i) / 7, R.x1, R.y0 + (ROOM_D * i) / 7], shade(floor, -0.08), 1.5);
      }
    }
    c.addChild(g);

    // стены кабинета: дальняя (если не упирается в стену этажа) и боковые (кроме тех, что у стены этажа).
    // Стены — в сортируемом слое, чтобы люди в коридоре за кабинетом уходили за стену.
    if (def.kind !== 'hall') {
      const out = touchesOuter(def);
      if (!out.back) {
        const bw = new Graphics();
        rect(bw, R.x0, R.y0 - WALL_H, ROOM_W, WALL_H, 0, { fill: shade(floor, -0.3), line: 3 });
        bw.zIndex = R.y0 - 0.5;
        this.world.addChild(bw);
        this.wallGs.push(bw);
      }
      const TW = 9;
      for (const [x, skip] of [
        [R.x0, out.left],
        [R.x1 - TW, out.right],
      ] as const) {
        if (skip) continue;
        const sw = new Graphics();
        const top = out.back ? R.y0 - OUTER_WALL_H * 0.4 : R.y0 - WALL_H;
        rect(sw, x, top, TW, R.y1 - WALL_H - top, 0, { fill: shade(floor, -0.15), line: 2.5 });
        rect(sw, x, R.y1 - WALL_H, TW, WALL_H, 0, { fill: shade(floor, -0.38), line: 2.5 });
        sw.zIndex = R.y1;
        this.world.addChild(sw);
        this.wallGs.push(sw);
      }
    }

    const label = new Text({
      text: t(`room.${def.id}` as Key),
      style: { fill: '#ffffff', fontSize: 20, fontWeight: '800', fontFamily: 'Nunito, system-ui, sans-serif', stroke: { color: '#262338', width: 4 } },
    });
    label.anchor.set(0.5);
    label.position.set(ctr.x, R.y1 - 16);
    this.labels.addChild(label);

    if (def.kind === 'dept') {
      const lockRoot = new Container();
      const shadeG = new Graphics();
      rect(shadeG, R.x0, R.y0, ROOM_W, ROOM_D, 0, { fill: 0x262338, alpha: 0.5, line: 0 });
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
      this.locks[def.dept!] = { root: lockRoot, badge, price };
    }
    return c;
  }

  setTheme(): void {
    this.theme = THEMES[this.game.company().style];
    this.buildStatic();
    this.syncAll();
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
        const pts = [0.12, 0.3, 0.5, 0.7, 0.88].map((u) => roomWorld(def, u, 0.57));
        const look = randomLook(seeded(this.game.state.company * 1009 + d * 31 + 500), 'manager');
        const m = new RoomWalker(look, pts, this.rng, 2, 5, true);
        this.world.addChild(m.char.root);
        this.managers[d] = m;
      } else if (!has && this.managers[d]) {
        this.managers[d]!.char.root.destroy({ children: true });
        this.managers[d] = null;
      }
      const lock = this.locks[d];
      if (lock) lock.root.visible = lock.badge.visible = !this.game.isUnlocked(d);
    }
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
      rect(g, w.x - 52, w.y - 44, 104, 44, 8, {
        fill: 0xffffff,
        alpha: ready ? 0.35 : 0.12,
        line: 2,
        lineColor: ready ? 0x3ccf63 : 0xffffff,
      });
      if (ready) {
        line(g, [w.x - 8, w.y - 22, w.x + 8, w.y - 22], 0x3ccf63, 4);
        line(g, [w.x, w.y - 30, w.x, w.y - 14], 0x3ccf63, 4);
      }
      this.hireMarks.addChild(g);
    }
  }

  private updateLockPrices(): void {
    for (let d = 0; d < DEPT_COUNT; d++) {
      const lock = this.locks[d];
      if (!lock || !lock.root.visible) continue;
      if (this.game.unlockAvailable(d)) {
        const cost = this.game.unlockCost(d);
        lock.price.text = formatNumber(cost);
        lock.price.style.fill = this.game.canAfford(cost) ? '#7dff9a' : '#ffffff';
      } else lock.price.text = t('locked');
    }
  }

  private setToilet(busy: boolean): void {
    this.toiletBusy = busy;
    if (!this.toilet) return;
    this.toilet.doorClosed.visible = busy;
    this.toilet.doorOpen.visible = !busy;
    this.toilet.lamp.clear();
    const L = this.toilet.lampAt;
    circle(this.toilet.lamp, L.x, L.y, 9, { fill: busy ? 0xff2d3a : 0x3ccf63, alpha: 0.25, line: 0 });
    circle(this.toilet.lamp, L.x, L.y, 5, busy ? 0xff2d3a : 0x3ccf63);
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
        s.position.set(f.x0 + Math.random() * (f.x1 - f.x0), f.y0 - 80 + Math.random() * (f.y1 - f.y0 + 80));
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
      case 'reorg':
        this.syncAll();
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
    const c = roomCenter(def.col, def.row);
    return { x: c.x, y: c.y - WALL_H / 2 };
  }

  bounds(): { x: number; y: number; width: number; height: number } {
    const f = floorBounds();
    return { x: f.x0 - 20, y: f.y0 - OUTER_WALL_H - 20, width: f.x1 - f.x0 + 40, height: f.y1 - f.y0 + OUTER_WALL_H + 40 };
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
      canSpeak: () => dir.isResting(),
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
    const w = roomWorld(roomById('toilet'), 0.34, 0.37);
    return { x: w.x, y: w.y - 124 };
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
        if (s.y > f.y1) s.y = f.y0 - 80;
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

export { worldToIso };
