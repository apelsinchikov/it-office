// Обстановка общих комнат: зона отдыха, туалет, серверная у сисадминов.
// Всё рисуется в координатах комнаты (u, v — доли от 0 до 1, h — высота в пикселях), поэтому предметы
// стоят ровно на полу и вдоль стен, а не «висят». У каждого предмета свой zIndex — по его переднему краю.

import { Container, Graphics } from 'pixi.js';
import { OUT, circle, ellipse, line, poly, rect, shade } from './draw';
import { roomWorld, type RoomDef } from './layout';

type Pt2 = [number, number];
type Fill = number | { fill: number; alpha?: number; line?: number; lineColor?: number };

/** Прямоугольник на полу комнаты (u0, u1, v0, v1) — для сетки проходимости. */
export type Block = [number, number, number, number];

export class Painter {
  constructor(readonly def: RoomDef) {}

  P(u: number, v: number, h = 0): Pt2 {
    const w = roomWorld(this.def, u, v);
    return [w.x, w.y - h];
  }

  /** y переднего угла (u1, v1) — для сортировки. */
  z(u: number, v: number): number {
    return this.P(u, v)[1];
  }

  private q(g: Graphics, pts: Pt2[], f: Fill): void {
    poly(g, pts.flat(), f);
  }

  /** Коробка u0..u1 × v0..v1 × h0..h1: видны грань v = v1 (слева), грань u = u1 (справа) и верх. */
  box(g: Graphics, u0: number, u1: number, v0: number, v1: number, h0: number, h1: number, top: number, left: number, right: number, lw = 2.5): void {
    const P = (u: number, v: number, h: number): Pt2 => this.P(u, v, h);
    this.q(g, [P(u0, v1, h0), P(u1, v1, h0), P(u1, v1, h1), P(u0, v1, h1)], { fill: left, line: lw });
    this.q(g, [P(u1, v0, h0), P(u1, v1, h0), P(u1, v1, h1), P(u1, v0, h1)], { fill: right, line: lw });
    this.q(g, [P(u0, v0, h1), P(u1, v0, h1), P(u1, v1, h1), P(u0, v1, h1)], { fill: top, line: lw });
  }

  /** Плоскость на полу (h = 0) или на высоте h. */
  flat(g: Graphics, u0: number, u1: number, v0: number, v1: number, f: Fill, h = 0): void {
    this.q(g, [this.P(u0, v0, h), this.P(u1, v0, h), this.P(u1, v1, h), this.P(u0, v1, h)], f);
  }

  /** Вертикальная панель в плоскости v = const. */
  panelV(g: Graphics, u0: number, u1: number, v: number, h0: number, h1: number, f: Fill): void {
    this.q(g, [this.P(u0, v, h0), this.P(u1, v, h0), this.P(u1, v, h1), this.P(u0, v, h1)], f);
  }

  /** Вертикальная панель в плоскости u = const. */
  panelU(g: Graphics, u: number, v0: number, v1: number, h0: number, h1: number, f: Fill): void {
    this.q(g, [this.P(u, v0, h0), this.P(u, v1, h0), this.P(u, v1, h1), this.P(u, v0, h1)], f);
  }

  /** Мягкая тень под предметом: чуть шире основания, прямо на полу. */
  shadow(g: Graphics, u0: number, u1: number, v0: number, v1: number): void {
    this.flat(g, u0 - 0.015, u1 + 0.03, v0 - 0.015, v1 + 0.03, { fill: OUT, alpha: 0.13, line: 0 });
  }

  /** Линия по полу через точки (u, v). */
  wire(g: Graphics, pts: [number, number][], color: number, w = 3): void {
    const flat = pts.flatMap(([u, v]) => this.P(u, v, 0.5));
    line(g, flat, OUT, w + 2);
    line(g, flat, color, w);
  }
}

const item = (z: number): { c: Container; g: Graphics } => {
  const c = new Container();
  const g = new Graphics();
  c.addChild(g);
  c.zIndex = z;
  return { c, g };
};

// ======================= зона отдыха =======================

/**
 * Где что стоит в зоне отдыха — для сетки проходимости. Всё высокое — у стены этажа с окнами (v = 0):
 * за ней никто не ходит, поэтому мебель никого не закрывает. У внутренней стены (u = 0) — только низкое растение.
 */
export const LOUNGE_BLOCKS: Block[] = [
  [0.0, 0.27, 0.0, 0.2], // стойка с кофемашиной
  [0.26, 0.44, 0.0, 0.2], // холодильник
  [0.47, 0.92, 0.0, 0.26], // диван
  [0.48, 0.88, 0.58, 0.74], // тумба с телевизором
  [0.02, 0.16, 0.8, 0.94], // растение
];

/** Места в зоне отдыха: (u, v), куда смотреть (0 — вниз-вправо, 1 — вниз-влево, 2 — вверх-вправо, 3 — вверх-влево). */
export const LOUNGE_SPOTS = {
  coffee: [
    [0.1, 0.3, 0],
    [0.24, 0.31, 1],
    [0.17, 0.45, 1],
  ],
  sofa: [
    [0.62, 0.15, 1],
    [0.78, 0.15, 1],
  ],
  viewer: [0.4, 0.5, 0],
  fridge: [0.35, 0.28, 2],
} as const;

export interface Lounge {
  items: Container[];
  /** Пар над кофемашиной (виден, когда у неё кто-то есть). */
  steam: Graphics;
  /** Отблеск экрана на полу перед диваном — мигает, пока играют. */
  glow: Graphics;
  fridgeOpen: Graphics;
  fridgeClosed: Graphics;
}

export function buildLounge(def: RoomDef, tiers: { coffee: number; fridge: number; games: number }, sofaColor: number, rugColor: number): Lounge {
  const P = new Painter(def);
  const items: Container[] = [];

  // ковёр под зоной дивана
  {
    const { c, g } = item(-9e5);
    P.flat(g, 0.36, 0.9, 0.26, 0.58, { fill: rugColor, line: 3 });
    P.flat(g, 0.4, 0.86, 0.3, 0.54, { fill: shade(rugColor, 0.12), line: 0 });
    items.push(c);
  }

  // стойка у стены этажа (под окнами) с кофемашиной и кружками
  const steam = new Graphics();
  {
    // длинные предметы сортируем по ближайшему к стене краю: кто стоит перед ними — рисуется поверх
    const { c, g } = item(P.z(0.03, 0.18));
    P.shadow(g, 0.03, 0.25, 0.02, 0.18);
    P.box(g, 0.03, 0.25, 0.02, 0.18, 0, 28, 0xf0b46a, 0xc98545, 0xa96a33);
    P.panelV(g, 0.06, 0.22, 0.18, 6, 22, { fill: shade(0xc98545, -0.12), line: 2 });
    const t = tiers.coffee;
    const H = 28;
    // кофемашина: передняя грань v = 0,16 смотрит в комнату
    if (t <= 0) {
      P.box(g, 0.12, 0.18, 0.06, 0.12, H, H + 13, 0xf4f4f8, 0xd9dbe6, 0xc3c6d4, 2);
      P.box(g, 0.14, 0.16, 0.12, 0.15, H + 6, H + 9, 0xd9dbe6, 0xc3c6d4, 0xc3c6d4, 1.5);
    } else if (t === 1) {
      P.box(g, 0.1, 0.21, 0.04, 0.14, H, H + 30, 0x5a6078, 0x3b3f55, 0x2f3344);
      P.panelV(g, 0.13, 0.18, 0.14, H + 4, H + 14, { fill: 0x7a4a22, line: 2 });
    } else if (t === 2) {
      P.box(g, 0.09, 0.22, 0.03, 0.15, H, H + 34, 0xe6e8f0, 0xc3c6d4, 0x9aa0b4);
      P.box(g, 0.12, 0.17, 0.05, 0.1, H + 34, H + 44, 0x8ee3ff, 0x5a6078, 0x454b63, 2);
      P.panelV(g, 0.12, 0.19, 0.15, H + 14, H + 24, { fill: 0x262338, line: 2 });
      P.box(g, 0.14, 0.17, 0.12, 0.15, H, H + 6, 0xffffff, 0xf4f4f8, 0xe6e8f0, 1.5);
    } else {
      P.box(g, 0.08, 0.23, 0.02, 0.16, H, H + 38, 0xff5a5a, 0xe8173a, 0xb5121d);
      P.panelV(g, 0.11, 0.14, 0.16, H + 8, H + 18, { fill: OUT, line: 0 });
      P.panelV(g, 0.17, 0.2, 0.16, H + 8, H + 18, { fill: OUT, line: 0 });
      const [x, y] = P.P(0.15, 0.09, H + 38);
      ellipse(g, x, y, 7, 3, { fill: 0xffffff, line: 2 });
    }
    // кружки на стойке
    for (const [u, col] of [
      [0.05, 0xffffff],
      [0.24, 0xff7a45],
    ] as const) {
      const [x, y] = P.P(u, 0.12, H);
      rect(g, x - 4, y - 9, 8, 9, 2, col);
    }
    const [sx, sy] = P.P(0.15, 0.09, H + (t <= 0 ? 16 : t === 1 ? 32 : t === 2 ? 46 : 42));
    line(steam, [sx, sy, sx - 3, sy - 6, sx + 1, sy - 12, sx - 2, sy - 18], 0xb9b6c8, 2);
    c.addChild(steam);
    items.push(c);
  }

  // холодильник рядом со стойкой, дверцей в комнату (грань v = 0,17); стоит на полу, тень прямо под ним
  const fridgeOpen = new Graphics();
  const fridgeClosed = new Graphics();
  {
    const u0 = 0.28;
    const u1 = 0.42;
    const v0 = 0.02;
    const v1 = 0.17;
    const { c, g } = item(P.z(u0, v1));
    const t = tiers.fridge;
    const H = [48, 62, 74, 76][t] ?? 48;
    const body = t >= 3 ? [0xff5a5a, 0xe8173a, 0xb5121d] : t === 2 ? [0xe6e8f0, 0xc3c6d4, 0xd9dbe6] : [0xffffff, 0xf4f4f8, 0xe6e8f0];
    P.shadow(g, u0, u1, v0, v1);
    P.box(g, u0, u1, v0, v1, 0, H, body[0], body[1], body[2]);
    if (t === 2) line(fridgeClosed, [...P.P((u0 + u1) / 2, v1, 2), ...P.P((u0 + u1) / 2, v1, H - 2)], OUT, 2);
    line(fridgeClosed, [...P.P(u1 - 0.025, v1, H * 0.45), ...P.P(u1 - 0.025, v1, H * 0.75)], OUT, 3);
    const [mx, my] = P.P(u0 + 0.04, v1, H * 0.6);
    rect(fridgeClosed, mx - 3, my - 3, 6, 6, 1, { fill: 0xffd23f, line: 1.5 });
    if (t >= 3) P.panelV(fridgeClosed, u0 + 0.03, u1 - 0.03, v1, H * 0.2, H * 0.8, { fill: 0xc7ecff, alpha: 0.8, line: 2 });
    // открытый: свет и полки внутри, дверца распахнута в комнату на петлях у левого края
    P.panelV(fridgeOpen, u0 + 0.01, u1 - 0.01, v1, 3, H - 3, { fill: 0xfff3c4, line: 2 });
    for (const k of [0.3, 0.55, 0.8]) line(fridgeOpen, [...P.P(u0 + 0.01, v1, H * k), ...P.P(u1 - 0.01, v1, H * k)], 0xc9a46a, 2);
    for (const [u, k, col] of [
      [u0 + 0.03, 0.32, 0xff7a45],
      [u0 + 0.07, 0.57, 0x3ccf63],
      [u0 + 0.1, 0.32, 0x4fb3ff],
    ] as const) {
      const [x, y] = P.P(u, v1, H * k);
      rect(fridgeOpen, x - 2, y - 9, 5, 9, 1.5, { fill: col, line: 1.5 });
    }
    P.panelU(fridgeOpen, u0, v1, v1 + 0.14, 2, H - 2, { fill: body[1], line: 2.5 });
    fridgeOpen.visible = false;
    c.addChild(fridgeClosed, fridgeOpen);
    items.push(c);
  }

  // диван у стены этажа: цельный — общее основание, спинка во всю длину, подлокотники и подушки сиденья;
  // контуры только снаружи, поэтому он читается одним предметом. Сидящие рисуются поверх него.
  {
    const dark = shade(sofaColor, -0.22);
    const side = shade(sofaColor, -0.34);
    const { c, g } = item(P.z(0.48, 0.04));
    const u0 = 0.5;
    const u1 = 0.9;
    const v1 = 0.24;
    P.shadow(g, u0, u1, 0.0, v1);
    // основание на ножках-полозьях
    P.box(g, u0, u1, 0.0, v1, 0, 12, dark, side, shade(side, -0.1));
    // спинка
    P.box(g, u0, u1, 0.0, 0.07, 12, 42, shade(sofaColor, 0.1), dark, side);
    // подлокотник дальний (у меньшего u)
    P.box(g, u0, u0 + 0.045, 0.0, v1, 12, 28, shade(sofaColor, 0.06), dark, side);
    // две подушки сиденья — без зазора, общий цвет
    const mid = (u0 + u1) / 2;
    P.box(g, u0 + 0.045, mid, 0.07, v1, 12, 19, sofaColor, dark, side, 2);
    P.box(g, mid, u1 - 0.045, 0.07, v1, 12, 19, sofaColor, dark, side, 2);
    // подлокотник ближний
    P.box(g, u1 - 0.045, u1, 0.0, v1, 12, 28, shade(sofaColor, 0.06), dark, side);
    items.push(c);
  }

  // тумба с телевизором экраном к дивану: камера видит заднюю крышку, приставку и стопку игр
  const glow = new Graphics();
  {
    P.flat(glow, 0.5, 0.78, 0.3, 0.55, { fill: 0x8ee3ff, alpha: 0.18, line: 0 });
    const g0 = item(-8.8e5);
    g0.c.addChild(glow);
    items.push(g0.c);
    const { c, g } = item(P.z(0.46, 0.72));
    P.shadow(g, 0.46, 0.82, 0.6, 0.72);
    P.box(g, 0.46, 0.82, 0.6, 0.72, 0, 18, 0x7d8398, 0x5a6078, 0x454b63);
    P.panelV(g, 0.5, 0.62, 0.72, 4, 14, { fill: 0x454b63, line: 2 });
    P.panelV(g, 0.66, 0.78, 0.72, 4, 14, { fill: 0x454b63, line: 2 });
    // подставка и телевизор
    P.box(g, 0.62, 0.66, 0.64, 0.68, 18, 26, 0x2f3344, OUT, OUT, 2);
    P.box(g, 0.5, 0.78, 0.645, 0.665, 26, 60, 0x454b63, 0x2f3344, 0x262338);
    const [lx, ly] = P.P(0.64, 0.665, 44);
    circle(g, lx, ly, 2, { fill: 0xffffff, alpha: 0.7, line: 0 });
    // приставка
    P.box(g, 0.48, 0.56, 0.62, 0.7, 18, 23, 0xffffff, 0xf4f4f8, 0xd9dbe6, 2);
    // игры
    const colors = [0xe8173a, 0x4fb3ff, 0x3ccf63, 0xffd23f, 0x8b6cff, 0xff7a45, 0x2fbfae, 0xff5fa2, 0x454b63, 0x24358a];
    for (let i = 0; i < Math.min(tiers.games, 10); i++) {
      const v0 = 0.62 + (i % 5) * 0.018;
      P.box(g, 0.72, 0.79, v0, v0 + 0.014, 18 + Math.floor(i / 5) * 9, 26 + Math.floor(i / 5) * 9, colors[i], shade(colors[i], -0.2), shade(colors[i], -0.3), 1.5);
    }
    items.push(c);
  }

  // невысокое растение у внутренней стены — его высоты не хватит, чтобы кого-то закрыть
  {
    const { c, g } = item(P.z(0.15, 0.93));
    P.shadow(g, 0.04, 0.14, 0.82, 0.92);
    P.box(g, 0.05, 0.13, 0.83, 0.91, 0, 13, 0xff7a45, 0xe0662f, 0xc9561f, 2);
    const [x, y] = P.P(0.09, 0.87, 13);
    for (const [dx, dy, r] of [
      [-6, -8, 7],
      [6, -9, 7],
      [0, -16, 8],
    ] as const)
      circle(g, x + dx, y + dy, r, 0x3ccf63);
    items.push(c);
  }

  return { items, steam, glow, fridgeOpen, fridgeClosed };
}

// ======================= туалет =======================

/** Кабинки вдоль стены этажа (u = 0) от стены до стены, раковины — у другой стены (v = 0). */
export const STALLS = 4;
const STALL_D = 0.3;
const stallV = (i: number): [number, number] => {
  const v0 = 0.02 + (i * 0.96) / STALLS;
  return [v0, v0 + 0.96 / STALLS];
};
/** Раковины: центры по u у стены v = 0; от крайней кабинки (u = 0,3) — проход не меньше 0,2. */
export const SINKS_U = [0.58, 0.73, 0.88];

/** Урна в ближнем углу у бортика. */
const BIN: [number, number] = [0.8, 0.86];

export const TOILET_BLOCKS: Block[] = [
  [0, STALL_D + 0.02, 0, 1],
  [0.48, 0.98, 0, 0.17],
  [BIN[0] - 0.06, BIN[0] + 0.06, BIN[1] - 0.06, BIN[1] + 0.06],
];

/** Места: перед дверью каждой кабинки и перед каждой раковиной. */
export function toiletSpots(): { stalls: [number, number][]; sinks: [number, number][] } {
  return {
    stalls: Array.from({ length: STALLS }, (_, i) => {
      const [v0, v1] = stallV(i);
      return [STALL_D + 0.1, (v0 + v1) / 2] as [number, number];
    }),
    sinks: SINKS_U.map((u) => [u, 0.27] as [number, number]),
  };
}

export interface Toilet {
  items: Container[];
  doors: { closed: Graphics; open: Graphics; lamp: Graphics }[];
}

export function buildToilet(def: RoomDef): Toilet {
  const P = new Painter(def);
  const items: Container[] = [];
  const doors: Toilet['doors'] = [];
  const wallC = 0xe6e8f0;
  const panel = 0x9fb8d6;
  const Hs = 58;
  for (let i = 0; i < STALLS; i++) {
    const [v0, v1] = stallV(i);
    const { c, g } = item(P.z(STALL_D, v0));
    // внутри: унитаз у стены
    const [tx, ty] = P.P(0.1, (v0 + v1) / 2, 0);
    ellipse(g, tx, ty - 6, 9, 5, { fill: 0xffffff, line: 2 });
    rect(g, tx - 6, ty - 22, 12, 14, 3, { fill: 0xffffff, line: 2 });
    // перегородка снизу кабинки (видна грань v = v1), щель у пола как в ТЦ
    P.panelV(g, 0.02, STALL_D, v1, 6, Hs, { fill: panel, line: 2.5 });
    if (i === 0) P.panelV(g, 0.02, STALL_D, v0, 6, Hs, { fill: shade(panel, -0.1), line: 2.5 });
    // фасад: стойки по краям
    P.panelU(g, STALL_D, v0, v0 + 0.03, 0, Hs + 4, { fill: wallC, line: 2.5 });
    P.panelU(g, STALL_D, v1 - 0.03, v1, 0, Hs + 4, { fill: wallC, line: 2.5 });
    // дверь: закрыта — фасад; открыта — распахнута внутрь, виден унитаз
    const closed = new Graphics();
    P.panelU(closed, STALL_D, v0 + 0.03, v1 - 0.03, 6, Hs, { fill: panel, line: 2.5 });
    const open = new Graphics();
    P.panelV(open, STALL_D - 0.18, STALL_D, v0 + 0.03, 6, Hs, { fill: shade(panel, -0.15), line: 2.5 });
    const lamp = new Graphics();
    const [lx, ly] = P.P(STALL_D, v1 - 0.06, Hs - 8);
    lamp.position.set(lx, ly);
    c.addChild(closed, open, lamp);
    // верхняя планка
    line(g, [...P.P(STALL_D, v0, Hs + 4), ...P.P(STALL_D, v1, Hs + 4)], OUT, 3);
    doors.push({ closed, open, lamp });
    items.push(c);
  }
  // раковины на общей столешнице у стены v = 0 и зеркала над ними
  {
    const { c, g } = item(P.z(0.5, 0.14));
    P.shadow(g, 0.5, 0.96, 0.0, 0.14);
    P.box(g, 0.5, 0.96, 0.0, 0.14, 0, 26, 0xf4f4f8, 0xd9dbe6, 0xc3c6d4);
    for (const u of SINKS_U) {
      const [x, y] = P.P(u, 0.07, 26);
      ellipse(g, x, y, 11, 5.5, { fill: 0xc7ecff, line: 2 });
      const [fx, fy] = P.P(u, 0.015, 26);
      rect(g, fx - 2, fy - 9, 4, 9, 1, { fill: 0x9aa0b4, line: 1.5 });
    }
    items.push(c);
    const m = item(-9.5e5); // зеркала на стене этажа — позади всего в комнате
    for (const u of SINKS_U) {
      P.panelV(m.g, u - 0.055, u + 0.055, 0.0, 34, 62, { fill: 0xc9d6e6, line: 2.5 });
      P.panelV(m.g, u - 0.045, u + 0.045, 0.0, 37, 59, { fill: 0xe6f6ff, line: 0 });
      line(m.g, [...P.P(u - 0.03, 0, 42), ...P.P(u - 0.005, 0, 54)], 0xffffff, 2);
    }
    items.push(m.c);
  }
  // урна
  {
    const [bu, bv] = BIN;
    const { c, g } = item(P.z(bu, bv));
    P.shadow(g, bu - 0.035, bu + 0.035, bv - 0.035, bv + 0.035);
    P.box(g, bu - 0.035, bu + 0.035, bv - 0.035, bv + 0.035, 0, 18, 0x9aa0b4, 0x7d8398, 0x5a6078, 2);
    P.flat(g, bu - 0.025, bu + 0.025, bv - 0.025, bv + 0.025, { fill: 0x454b63, line: 0 }, 18.5);
    items.push(c);
  }
  return { items, doors };
}

// ======================= серверная у сисадминов =======================

export function buildServerRoom(def: RoomDef, t: number): Container[] {
  const P = new Painter(def);
  const items: Container[] = [];
  // провода по полу: от стойки вдоль стены за стульями, по проходу между рядами и ко второй стойке
  {
    const { c, g } = item(-9e5);
    P.wire(g, [
      [0.12, 0.07],
      [0.14, 0.12],
      [0.14, 0.92],
    ], 0x4fb3ff);
    P.wire(g, [
      [0.12, 0.09],
      [0.51, 0.1],
      [0.51, 0.92],
    ], 0xffd23f);
    P.wire(g, [
      [0.51, 0.1],
      [0.86, 0.1],
    ], 0xe8173a);
    P.wire(g, [
      [0.51, 0.92],
      [0.8, 0.92],
      [0.82, 0.87],
    ], 0x3ccf63, 2.5);
    items.push(c);
  }
  /** Стойка; face — какая видимая грань смотрит в комнату (дверца с огоньками): 'u' — грань u = u1, 'v' — грань v = v1. */
  const rack = (u0: number, u1: number, v0: number, v1: number, h: number, face: 'u' | 'v'): void => {
    const { c, g } = item(P.z(u1, v1));
    P.shadow(g, u0, u1, v0, v1);
    P.box(g, u0, u1, v0, v1, 0, h, 0x4b5270, 0x2f3344, 0x262338);
    const lights = new Container();
    for (let i = 0; i < 6; i++) {
      const l = new Graphics();
      const [x0, y0] = face === 'u' ? P.P(u1, v0 + 0.015, h - 10 - i * 8) : P.P(u0 + 0.015, v1, h - 10 - i * 8);
      const [x1, y1] = face === 'u' ? P.P(u1, v0 + 0.05, h - 10 - i * 8) : P.P(u0 + 0.05, v1, h - 10 - i * 8);
      line(l, [x0, y0, x1, y1], [0x3ccf63, 0x4fb3ff, 0xffd23f][i % 3], 2.5);
      lights.addChild(l);
    }
    lights.label = 'lights';
    c.addChild(lights);
    items.push(c);
  };
  const H = 52 + t * 6;
  // первая — в дальнем углу, дверцей к рядам столов; вторая — у правого угла, дверцей тоже в комнату (не к бортику)
  rack(0.02, 0.12, 0.02, 0.11, H, 'u');
  rack(0.86, 0.95, 0.02, 0.11, H, 'v');
  // роутер с антеннами на первой стойке
  {
    const { c, g } = item(P.z(0.12, 0.11) + 1);
    P.box(g, 0.03, 0.11, 0.04, 0.09, H, H + 5, 0xf4f4f8, 0xd9dbe6, 0xc3c6d4, 2);
    for (const v of [0.05, 0.08]) {
      const [x, y] = P.P(0.05, v, H + 5);
      line(g, [x, y, x, y - 12], OUT, 2.5);
    }
    const [lx, ly] = P.P(0.11, 0.06, H + 2.5);
    circle(g, lx, ly, 1.5, { fill: 0x3ccf63, line: 0 });
    items.push(c);
  }
  // принтер на тумбе в ближнем углу — целиком внутри комнаты, не заходит за бортики
  {
    const u0 = 0.82;
    const v0 = 0.82;
    const { c, g } = item(P.z(u0 + 0.1, v0 + 0.1));
    P.shadow(g, u0, u0 + 0.1, v0, v0 + 0.1);
    P.box(g, u0, u0 + 0.1, v0, v0 + 0.1, 0, 20, 0xc3c6d4, 0x9aa0b4, 0x7d8398);
    P.box(g, u0 + 0.01, u0 + 0.09, v0 + 0.01, v0 + 0.09, 20, 32, 0xf4f4f8, 0xd9dbe6, 0xc3c6d4);
    P.flat(g, u0 + 0.025, u0 + 0.075, v0 + 0.025, v0 + 0.075, { fill: 0xffffff, line: 1.5 }, 32.5);
    const [x, y] = P.P(u0 + 0.09, v0 + 0.03, 28);
    circle(g, x, y, 1.6, { fill: 0xe8173a, line: 0 });
    items.push(c);
  }
  return items;
}
