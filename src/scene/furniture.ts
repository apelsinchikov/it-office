// Мебель в стиле Б. Рабочее место рисуется в координатах «сцены стола» 260×210
// (как на холсте): пол под центром стола — точка (130, 160).

import { Container, Graphics } from 'pixi.js';
import { OUT, circle, ellipse, isoBox, line, p, poly, rect, shade, stroke } from './draw';

// ---------- рабочее место ----------
// Всё рабочее место строится в локальных изо-координатах стола: a — от сотрудника к камере (вниз-вправо),
// b — вдоль длинной стороны стола (вниз-влево), h — высота. Так предметы стоят на столешнице, а не «висят»,
// и их легко разнести, чтобы ничего не пересекалось. Сотрудник сидит за дальним длинным краем (a < −DESK.A)
// лицом к камере (вниз-вправо), монитор повёрнут экраном к нему — камера видит его заднюю крышку.

/** Размеры стола: полуглубина A, полудлина B, высота столешницы H, толщина T. */
export const DESK = { A: 30, B: 62, H: 58, T: 10 };

/** Точка стола → координаты сцены стола (центр стола на полу — (130, 160)). */
export function deskPt(a: number, b: number, h = 0): [number, number] {
  return [130 + (a - b), 160 + (a + b) / 2 - h];
}

const flat = (...pts: [number, number][]): number[] => pts.flat();

/** Где что стоит на столе (a, b). Подобрано так, чтобы предметы не пересекались и не закрывали лицо. */
export const SPOT = {
  /** Сотрудник (точка на полу под ним). */
  seat: [-46, 0] as const,
  keyboard: [-15, 0] as const,
  monitor: [-24, -26] as const,
  lamp: [-24, -54] as const,
  mouse: [-15, 30] as const,
  phone: [6, 44] as const,
  mug: [12, 16] as const,
  flower: [14, -46] as const,
  /** Ящик с инструментами сисадмина — на полу перед столом справа. */
  toolbox: [48, -36] as const,
};

interface Slab {
  top: number;
  left: number;
  right: number;
  legs: number;
}

const DESK_TIERS: Slab[] = [
  { top: 0xc3c6d4, left: 0x9aa0b4, right: 0x7d8398, legs: 0x5a6078 },
  { top: 0xf0b46a, left: 0xc98545, right: 0xa96a33, legs: 0x7a4a22 },
  { top: 0xf4f4f8, left: 0xd9dbe6, right: 0xc3c6d4, legs: 0x9aa0b4 },
  { top: 0x4b5270, left: 0x3b3f55, right: 0x2f3344, legs: 0x262338 },
];

/** Спинка стула за сидящим сотрудником: панель вдоль стола позади него. */
export function chairBack(tier: number): Graphics {
  const g = new Graphics();
  const a = SPOT.seat[0] - 16;
  const w = [20, 22, 25, 27][tier] ?? 20;
  const h0 = DESK.H - 22;
  const hb = [46, 58, 70, 84][tier] ?? 46;
  const col = [0x9aa0b4, 0xc98545, 0x5a6078, 0x262338][tier] ?? 0x9aa0b4;
  // ножка-стойка и крестовина
  const f = deskPt(a + 6, 0, 0);
  const s = deskPt(a + 6, 0, h0);
  rect(g, f[0] - 3, s[1], 6, f[1] - s[1], 0, 0x5a6078);
  ellipse(g, f[0], f[1], 18, 7, { fill: 0x454b63, line: 2 });
  // торец спинки (толщина) и сама спинка
  poly(g, flat(deskPt(a, w, h0), deskPt(a + 5, w, h0), deskPt(a + 5, w, h0 + hb), deskPt(a, w, h0 + hb)), shade(col, -0.25));
  poly(g, flat(deskPt(a + 5, -w, h0), deskPt(a + 5, w, h0), deskPt(a + 5, w, h0 + hb), deskPt(a + 5, -w, h0 + hb)), col);
  if (tier === 1) line(g, [...deskPt(a + 5, -w + 4, h0 + hb - 12), ...deskPt(a + 5, w - 4, h0 + hb - 12)], 0xa96a33, 3);
  if (tier >= 3) {
    // игровое кресло: красные полосы и подголовник
    for (const bb of [-w + 7, w - 7]) {
      poly(g, flat(deskPt(a + 5, bb - 3, h0 + 4), deskPt(a + 5, bb + 3, h0 + 4), deskPt(a + 5, bb + 3, h0 + hb - 4), deskPt(a + 5, bb - 3, h0 + hb - 4)), { fill: 0xe8173a, line: 2 });
    }
    poly(g, flat(deskPt(a + 5, -8, h0 + hb - 14), deskPt(a + 5, 8, h0 + hb - 14), deskPt(a + 5, 8, h0 + hb - 6), deskPt(a + 5, -8, h0 + hb - 6)), { fill: 0xffffff, line: 2 });
  }
  return g;
}

/** Стол: ножки, два видимых торца, столешница. */
export function deskSlab(tier: number): Graphics {
  const s = DESK_TIERS[Math.max(0, Math.min(3, tier))];
  const { A, B, H, T } = DESK;
  const g = new Graphics();
  const c = deskPt(0, 0, 0);
  ellipse(g, c[0], c[1] + 4, A + B + 6, (A + B) / 2.7, { fill: OUT, alpha: 0.14, line: 0 });
  for (const [a, b] of [
    [A - 5, -B + 5],
    [A - 5, B - 5],
    [-A + 5, B - 5],
  ]) {
    const t = deskPt(a, b, H - T);
    const f = deskPt(a, b, 0);
    rect(g, t[0] - 3.5, t[1], 7, f[1] - t[1], 0, s.legs);
  }
  poly(g, flat(deskPt(A, -B, H), deskPt(A, B, H), deskPt(A, B, H - T), deskPt(A, -B, H - T)), s.right);
  poly(g, flat(deskPt(-A, B, H), deskPt(A, B, H), deskPt(A, B, H - T), deskPt(-A, B, H - T)), s.left);
  poly(g, flat(deskPt(-A, -B, H), deskPt(A, -B, H), deskPt(A, B, H), deskPt(-A, B, H)), s.top);
  if (tier === 2) {
    // тумба с ящиком под столешницей справа
    poly(g, flat(deskPt(A, -B + 6, H - T), deskPt(A, -B + 40, H - T), deskPt(A, -B + 40, 6), deskPt(A, -B + 6, 6)), 0xe6e8f0);
    line(g, [...deskPt(A, -B + 16, H - T - 14), ...deskPt(A, -B + 30, H - T - 14)], OUT, 2.5);
  }
  if (tier >= 3) line(g, [...deskPt(-A, B, H - T), ...deskPt(A, B, H - T), ...deskPt(A, -B, H - T)], 0x2fbfae, 3);
  return g;
}

/** Монитор экраном к сотруднику: камера видит заднюю крышку и подставку. */
export function monitor(tier: number): Graphics {
  const g = new Graphics();
  const [a, b] = SPOT.monitor;
  const H = DESK.H;
  const base = deskPt(a, b, H);
  if (tier === 0) {
    // старый ЭЛТ-монитор: коробка
    const w = 13;
    poly(g, flat(deskPt(a - 4, b - w, H), deskPt(a - 4, b + w, H), deskPt(a - 4, b + w, H + 24), deskPt(a - 4, b - w, H + 24)), 0xd6c7a3);
    poly(g, flat(deskPt(a - 4, b + w, H), deskPt(a + 8, b + w, H), deskPt(a + 8, b + w, H + 24), deskPt(a - 4, b + w, H + 24)), 0xc4b38c);
    poly(g, flat(deskPt(a - 4, b - w, H + 24), deskPt(a + 8, b - w, H + 24), deskPt(a + 8, b + w, H + 24), deskPt(a - 4, b + w, H + 24)), 0xefe4c8);
    return g;
  }
  const w = [0, 15, 18, 21][tier];
  const h = [0, 22, 25, 28][tier];
  const z = H + 10;
  ellipse(g, base[0], base[1], 9, 4, 0x454b63);
  rect(g, base[0] - 2.5, base[1] - 12, 5, 12, 0, OUT);
  const body = tier === 3 ? 0x2f3344 : tier === 2 ? 0xd9dbe6 : 0x5a6078;
  // торец (толщина) справа-снизу, потом задняя крышка
  poly(g, flat(deskPt(a, b + w, z), deskPt(a + 3, b + w, z), deskPt(a + 3, b + w, z + h), deskPt(a, b + w, z + h)), OUT);
  poly(g, flat(deskPt(a + 3, b - w, z), deskPt(a + 3, b + w, z), deskPt(a + 3, b + w, z + h), deskPt(a + 3, b - w, z + h)), body);
  const logo = deskPt(a + 3, b, z + h / 2);
  circle(g, logo[0], logo[1], 2, { fill: tier === 3 ? 0x8b6cff : 0xffffff, alpha: 0.8, line: 0 });
  if (tier === 3) line(g, [...deskPt(a + 3, b - w, z), ...deskPt(a + 3, b + w, z)], 0x8b6cff, 3);
  return g;
}

/** Строчки кода раньше бежали по экрану; теперь экран повёрнут к сотруднику — анимировать нечего. */
export function codeLines(_tier: number): Container[] {
  return [];
}

const KEYS = [0x9aa0b4, 0x454b63, 0xf4f4f8, 0x262338];

/** Клавиатура перед сотрудником: длинная сторона вдоль стола. */
export function keyboard(tier: number): Graphics {
  const g = new Graphics();
  const [a, b] = SPOT.keyboard;
  const H = DESK.H + 1;
  const w = 24;
  const d = 7;
  poly(g, flat(deskPt(a - d, b - w, H), deskPt(a + d, b - w, H), deskPt(a + d, b + w, H), deskPt(a - d, b + w, H)), KEYS[tier]);
  for (let i = -2; i <= 2; i++) {
    const p1 = deskPt(a - d + 3, b + i * 8, H);
    const p2 = deskPt(a + d - 3, b + i * 8, H);
    line(g, [...p1, ...p2], tier === 2 ? 0xc3c6d4 : 0x262338, 1);
  }
  if (tier >= 3) line(g, [...deskPt(a + d, b - w, H), ...deskPt(a + d, b + w, H)], 0xff5fa2, 2);
  return g;
}

export function mouse(tier: number): Graphics {
  const g = new Graphics();
  const [a, b] = SPOT.mouse;
  const c = deskPt(a, b, DESK.H + 2);
  ellipse(g, c[0] + 4, c[1] + 2, 10, 5, { fill: OUT, alpha: 0.15, line: 0 });
  ellipse(g, c[0], c[1], 6, 4, KEYS[tier]);
  if (tier >= 3) circle(g, c[0], c[1] - 1, 1.5, { fill: 0x2fbfae, line: 0 });
  return g;
}

const PHONES = [0xe8dcc0, 0x262338, 0xf4f4f8, 0xffd23f];

export function phone(tier: number): Graphics {
  const g = new Graphics();
  const c = deskPt(SPOT.phone[0], SPOT.phone[1], DESK.H);
  isoBox(g, c[0], c[1], 12, 6, PHONES[tier], tier === 1 ? 0x3b3f55 : 0xd6c7a3, tier === 1 ? 0x2f3344 : 0xc4b38c, 2.5);
  stroke(g, `M${c[0] - 10} ${c[1] - 10} Q${c[0]} ${c[1] - 16} ${c[0] + 10} ${c[1] - 6}`, OUT, 6);
  stroke(g, `M${c[0] - 10} ${c[1] - 10} Q${c[0]} ${c[1] - 16} ${c[0] + 10} ${c[1] - 6}`, tier === 3 ? 0xe8173a : PHONES[tier], 3);
  return g;
}

/** Цветок в горшке на столе. */
export function flower(): Container {
  const g = new Container();
  const [x, y] = deskPt(SPOT.flower[0], SPOT.flower[1], DESK.H);
  for (const [dx, dy, rot, c] of [
    [-4, -22, -0.44, 0x3ccf63],
    [4, -23, 0.35, 0x3ccf63],
    [0, -27, 0, 0x5be07f],
  ] as const) {
    const leaf = new Graphics();
    ellipse(leaf, 0, 0, 4, 9.5, c);
    leaf.rotation = rot;
    leaf.position.set(x + dx, y + dy);
    g.addChild(leaf);
  }
  const pot = new Graphics();
  poly(pot, [x - 8, y - 13, x + 8, y - 13, x + 6, y, x - 6, y], 0xff7a45);
  g.addChild(pot);
  return g;
}

/** Предплечье с кистью: от плеча (x0, y0) к клавише (x1, y1). */
export function typingHand(x0: number, y0: number, x1: number, y1: number, sleeve: number, skin: number): Container {
  const c = new Container();
  const g = new Graphics();
  line(g, [x0, y0, x1, y1], OUT, 9);
  line(g, [x0, y0, x1, y1], sleeve, 5);
  circle(g, x1, y1 + 1, 4.5, skin);
  c.addChild(g);
  return c;
}

/** Кружка; пар отдельно. */
export function mug(x: number, y: number): Graphics {
  const g = new Graphics();
  stroke(g, `M${x + 13} ${y + 3} Q${x + 19} ${y + 7} ${x + 13} ${y + 11}`, OUT, 5);
  stroke(g, `M${x + 13} ${y + 3} Q${x + 19} ${y + 7} ${x + 13} ${y + 11}`, 0xffffff, 2);
  rect(g, x, y, 13, 14, 3, 0xffffff);
  ellipse(g, x + 6.5, y, 6.5, 2.4, { fill: 0x7a4a22, line: 2 });
  return g;
}

export function steam(x: number, y: number): Graphics {
  const g = new Graphics();
  stroke(g, `M${x} ${y} Q${x - 3} ${y - 4} ${x} ${y - 8} Q${x + 3} ${y - 12} ${x} ${y - 16}`, 0xb9b6c8, 2);
  return g;
}

// ---------- пост сисадмина (вместо стола) ----------

/** Рисует пост в координатах холста 120×110; сцена масштабирует ×1,9 в координаты стола. */
export function sysadminPost(tier: number): Container {
  const c = new Container();
  const g = new Graphics();
  ellipse(g, 60, 98, 46, 10, { fill: OUT, alpha: 0.12, line: 0 });
  switch (tier) {
    case 0:
    case 1: {
      const wood = tier === 1;
      rect(g, 15, 62, 5, 30, 0, wood ? 0x7a4a22 : 0x5a6078);
      rect(g, 100, 62, 5, 30, 0, wood ? 0x7a4a22 : 0x5a6078);
      rect(g, 58, 86, 5, 20, 0, wood ? 0x7a4a22 : 0x5a6078);
      poly(g, [16, 58, 60, 80, 60, 88, 16, 66], wood ? 0xc98545 : 0x9aa0b4);
      poly(g, [60, 80, 104, 58, 104, 66, 60, 88], wood ? 0xa96a33 : 0x7d8398);
      poly(g, [60, 36, 104, 58, 60, 80, 16, 58], wood ? 0xf0b46a : 0xc3c6d4);
      poly(g, [52, 50, 70, 59, 52, 68, 34, 59], 0x9aa0b4);
      poly(g, [34, 59, 52, 50, 52, 28, 34, 37], OUT);
      poly(g, [37, 56, 49, 50, 49, 32, 37, 38], { fill: 0x8ee3ff, line: 0 });
      if (wood) {
        line(g, [74, 64, 90, 56], 0xff7a45, 4);
        line(g, [90, 56, 96, 53], OUT, 2);
      }
      break;
    }
    case 2:
      poly(g, [14, 8, 60, 31, 60, 60, 14, 37], 0xc9a46a);
      line(g, [22, 20, 22, 36], OUT, 4);
      stroke(g, 'M32 26 L32 40 M28 26 L36 26', OUT, 3);
      circle(g, 46, 38, 5, { fill: 0xc9a46a, line: 3 });
      rect(g, 16, 62, 4, 32, 0, 0x9aa0b4);
      rect(g, 100, 62, 4, 30, 0, 0x9aa0b4);
      rect(g, 58, 88, 4, 18, 0, 0x9aa0b4);
      poly(g, [16, 58, 60, 80, 60, 90, 16, 68], 0x9aa0b4);
      poly(g, [60, 80, 104, 58, 104, 68, 60, 90], 0x7d8398);
      poly(g, [60, 36, 104, 58, 60, 80, 16, 58], 0xc3c6d4);
      poly(g, [74, 44, 88, 51, 88, 59, 74, 52], 0xe8173a);
      poly(g, [88, 51, 96, 47, 96, 55, 88, 59], 0xb5121d);
      poly(g, [74, 44, 82, 40, 96, 47, 88, 51], 0xff5a5a);
      break;
    default:
      poly(g, [20, 18, 44, 30, 44, 104, 20, 92], 0x2f3344);
      poly(g, [44, 30, 68, 18, 68, 92, 44, 104], OUT);
      poly(g, [44, 6, 68, 18, 44, 30, 20, 18], 0x4b5270);
      rect(g, 76, 66, 4, 26, 0, 0x9aa0b4);
      rect(g, 104, 58, 4, 22, 0, 0x9aa0b4);
      poly(g, [72, 62, 90, 71, 90, 77, 72, 68], 0x9aa0b4);
      poly(g, [90, 71, 108, 62, 108, 68, 90, 77], 0x7d8398);
      poly(g, [90, 53, 108, 62, 90, 71, 72, 62], 0xc3c6d4);
  }
  c.addChild(g);
  if (tier >= 3) {
    // мигающие огоньки стойки — отдельные, чтобы сцена могла мигать
    const lights = new Container();
    const colors = [0x3ccf63, 0x4fb3ff, 0x3ccf63, 0xffd23f, 0x4fb3ff, 0x3ccf63];
    colors.forEach((col, i) => {
      const l = new Graphics();
      line(l, [24, 30 + i * 10, 40, 38 + i * 10], col, 2.5);
      lights.addChild(l);
    });
    lights.label = 'lights';
    c.addChild(lights);
  }
  return c;
}

const TOOLBOX = [0xc9a46a, 0xe8173a, 0xe8173a, 0x2f3344];

/** Ящик с инструментами на полу (координаты стола). */
export function toolbox(tier: number): Graphics {
  const g = new Graphics();
  const hw = tier >= 2 ? 18 : 13;
  const h = tier >= 3 ? 34 : tier >= 2 ? 22 : 14;
  const [cx, cy] = deskPt(SPOT.toolbox[0], SPOT.toolbox[1]);
  isoBox(g, cx, cy, hw, h, tier === 0 ? 0xe0c48a : 0xff5a5a, TOOLBOX[tier], tier === 0 ? 0xa98a55 : 0xb5121d);
  if (tier >= 2) line(g, [cx - hw + 3, cy - h / 2, cx - 3, cy + hw / 2 - h / 2 - 2], OUT, 2);
  if (tier === 3) line(g, [cx - hw + 3, cy - h / 2 + 10, cx - 3, cy + hw / 2 - h / 2 + 8], 0x2fbfae, 2);
  return g;
}

/** Лампа на посту (координаты холста 120×110, смещается вместе с постом). */
export function lamp(tier: number): Graphics {
  const g = new Graphics();
  if (tier === 0) return g;
  if (tier === 1) {
    ellipse(g, 24, 54, 6, 3, 0x9aa0b4);
    line(g, [24, 53, 22, 38, 32, 30], OUT, 5);
    line(g, [24, 53, 22, 38, 32, 30], 0x9aa0b4, 2);
    poly(g, [28, 26, 38, 32, 34, 38, 25, 32], 0x9aa0b4);
  } else if (tier === 2) {
    ellipse(g, 24, 54, 7, 3, 0xf4f4f8);
    rect(g, 22.5, 28, 3, 25, 0, 0xd9dbe6);
    rect(g, 12, 24, 24, 5, 2.5, 0xf4f4f8);
  } else {
    circle(g, 24, 38, 16, { fill: 0xff5fa2, alpha: 0.18, line: 0 });
    p(g, 'M18 56 L21 48 L27 48 L30 56 Z', 0x454b63);
    p(g, 'M21 48 Q17 34 22 22 L26 22 Q31 34 27 48 Z', 0x8b6cff);
    ellipse(g, 23, 38, 2.5, 3.5, { fill: 0xff7a45, line: 0 });
  }
  return g;
}

// ---------- зона отдыха (координаты холста) ----------

/** Стойка с кофемашиной: пол — точка (70, 120) в координатах 140×150. */
export function coffeeMachine(tier: number): Container {
  const c = new Container();
  const g = new Graphics();
  ellipse(g, 70, 138, 44, 10, { fill: OUT, alpha: 0.12, line: 0 });
  isoBox(g, 70, 120, 40, 40, 0xf0b46a, 0xc98545, 0xa96a33);
  line(g, [36, 98, 64, 112], OUT, 2.5);
  if (tier <= 0) {
    // пустая стойка с чайником
    isoBox(g, 62, 84, 9, 12, 0xf4f4f8, 0xd9dbe6, 0xc3c6d4);
  } else if (tier === 1) {
    poly(g, [66, 49, 82, 57, 82, 82, 66, 74], 0x3b3f55);
    poly(g, [82, 57, 90, 53, 90, 78, 82, 82], 0x2f3344);
    poly(g, [66, 49, 74, 45, 90, 53, 82, 57], 0x5a6078);
    p(g, 'M50 74 Q48 88 56 92 L66 92 Q72 88 70 74 Z', { fill: 0x8ee3ff, alpha: 0.7 });
    p(g, 'M51 82 Q50 90 56 92 L66 92 Q71 90 70 82 Z', 0x7a4a22);
  } else if (tier === 2) {
    poly(g, [52, 50, 70, 59, 70, 89, 52, 80], 0xc3c6d4);
    poly(g, [70, 59, 88, 50, 88, 80, 70, 89], 0x9aa0b4);
    poly(g, [70, 41, 88, 50, 70, 59, 52, 50], 0xe6e8f0);
    line(g, [58, 70, 44, 76], OUT, 5);
    p(g, 'M52 82 L60 86 L59 92 L53 89 Z', { fill: 0xffffff, line: 2.5 });
    circle(g, 62, 58, 3.5, { fill: 0xffffff, line: 2 });
  } else {
    poly(g, [42, 48, 70, 62, 70, 96, 42, 82], 0xe8173a);
    poly(g, [70, 62, 98, 48, 98, 82, 70, 96], 0xb5121d);
    poly(g, [70, 34, 98, 48, 70, 62, 42, 48], 0xff5a5a);
    line(g, [50, 74, 40, 80], OUT, 5);
    line(g, [62, 80, 52, 86], OUT, 5);
    ellipse(g, 64, 44, 5, 2.5, { fill: 0xffffff, line: 2 });
    ellipse(g, 76, 47, 5, 2.5, { fill: 0xffffff, line: 2 });
    circle(g, 50, 60, 3.5, { fill: 0xffffff, line: 2 });
    circle(g, 62, 66, 3.5, { fill: 0xffffff, line: 2 });
  }
  c.addChild(g);
  return c;
}

/** Холодильник: пол — точка (70, 138). */
export function fridge(tier: number): Graphics {
  const g = new Graphics();
  ellipse(g, 70, 142, 28, 6, { fill: OUT, alpha: 0.12, line: 0 });
  if (tier <= 1) {
    const big = tier === 1;
    const hw = big ? 18 : 16;
    const h = big ? 56 : 40;
    isoBox(g, 70, 138 - hw / 2, hw, h, 0xffffff, 0xf4f4f8, 0xd9dbe6);
    line(g, [70 - hw + 12, 138 - hw / 2 - h + 22, 70 - hw + 12, 138 - hw / 2 - h + 34]);
    rect(g, 58, 112, 5, 5, 0, { fill: 0xff7a45, line: 0 });
  } else if (tier === 2) {
    poly(g, [48, 44, 70, 55, 70, 141, 48, 130], 0xf4f4f8);
    poly(g, [70, 55, 92, 44, 92, 130, 70, 141], 0xd9dbe6);
    poly(g, [70, 33, 92, 44, 70, 55, 48, 44], 0xffffff);
    line(g, [48, 74, 70, 85]);
    line(g, [65, 62, 65, 74]);
    line(g, [65, 92, 65, 110]);
    rect(g, 52, 96, 6, 6, 0, { fill: 0xff5fa2, line: 0 });
    circle(g, 56, 114, 3.5, { fill: 0x4fb3ff, line: 0 });
    rect(g, 51, 58, 7, 5, 0, { fill: 0xffd23f, line: 0 });
  } else {
    ellipse(g, 70, 142, 32, 7, { fill: 0x4fb3ff, alpha: 0.2, line: 0 });
    poly(g, [46, 40, 70, 52, 70, 142, 46, 130], 0xe8173a);
    poly(g, [70, 52, 94, 40, 94, 130, 70, 142], 0xb5121d);
    poly(g, [70, 28, 94, 40, 70, 52, 46, 40], 0xff5a5a);
    poly(g, [50, 54, 66, 62, 66, 132, 50, 124], 0xc7ecff);
    line(g, [50, 78, 66, 86], OUT, 2);
    line(g, [50, 102, 66, 110], OUT, 2);
    for (const [x, y, col] of [
      [53, 64, 0xff7a45],
      [59, 67, 0x3ccf63],
      [53, 88, 0x4fb3ff],
      [59, 91, 0xffd23f],
      [53, 112, 0x8b6cff],
      [59, 115, 0xff7a45],
    ] as const)
      rect(g, x, y, 4, 10, 1.5, { fill: col, line: 0 });
    poly(g, [50, 46, 66, 54, 66, 50, 50, 42], { fill: 0xffd23f, line: 0 });
  }
  return g;
}

/** Диван: пол — точка (80, 90) в координатах 160×120. */
export function sofa(color = 0x2fbfae): Graphics {
  const g = new Graphics();
  const dark = 0x22968a;
  ellipse(g, 80, 108, 58, 12, { fill: OUT, alpha: 0.12, line: 0 });
  poly(g, [28, 74, 80, 48, 80, 18, 28, 44], color === 0x2fbfae ? dark : color);
  poly(g, [80, 47, 130, 72, 130, 58, 80, 33], dark);
  poly(g, [30, 72, 80, 97, 80, 115, 30, 90], dark);
  poly(g, [80, 97, 130, 72, 130, 90, 80, 115], 0x1b7a70);
  poly(g, [80, 47, 130, 72, 80, 97, 30, 72], color);
  line(g, [55, 60, 105, 85], OUT, 2.5);
  ellipse(g, 62, 48, 9, 7, 0xffd23f);
  return g;
}

/** Телевизор с приставкой на тумбе: пол — (80, 104) в координатах 160×120. */
export function tvStand(games: number): Container {
  const c = new Container();
  const g = new Graphics();
  ellipse(g, 80, 110, 46, 9, { fill: OUT, alpha: 0.12, line: 0 });
  isoBox(g, 80, 94, 40, 14, 0x7d8398, 0x5a6078, 0x454b63);
  poly(g, [44, 74, 104, 44, 104, 6, 44, 36], OUT);
  poly(g, [48, 68, 100, 42, 100, 10, 48, 36], { fill: 0x8ee3ff, line: 1.5 });
  poly(g, [48, 68, 100, 42, 100, 30, 48, 56], { fill: 0x3ccf63, line: 0 });
  rect(g, 68, 34, 8, 10, 0, { fill: 0xff7a45, line: 2 });
  isoBox(g, 66, 88, 8, 5, 0xf4f4f8, 0xffffff, 0xd9dbe6, 2.5);
  p(g, 'M88 88 Q92 84 100 86 Q108 88 106 93 Q104 96 98 94 L92 93 Q86 94 88 88 Z', OUT);
  // стопка игр: сколько куплено
  for (let i = 0; i < Math.min(games, 10); i++) {
    const colors = [0xe8173a, 0x4fb3ff, 0x3ccf63, 0xffd23f, 0x8b6cff, 0xff7a45, 0x2fbfae, 0xff5fa2, 0x454b63, 0x24358a];
    rect(g, 110 + (i % 5) * 7, 84 - Math.floor(i / 5) * 9, 6, 8, 1, { fill: colors[i], line: 1.5 });
  }
  c.addChild(g);
  return c;
}

/** Кабинка туалета: пол — (70, 140) в координатах 140×160. */
export function toiletCabin(): { root: Container; doorClosed: Graphics; doorOpen: Graphics; lamp: Graphics } {
  const root = new Container();
  const g = new Graphics();
  ellipse(g, 70, 150, 40, 8, { fill: OUT, alpha: 0.12, line: 0 });
  poly(g, [36, 40, 70, 57, 70, 157, 36, 140], 0xc3c6d4);
  poly(g, [70, 57, 104, 40, 104, 140, 70, 157], 0x9aa0b4);
  poly(g, [70, 23, 104, 40, 70, 57, 36, 40], 0xe6e8f0);
  root.addChild(g);
  const doorOpen = new Graphics();
  poly(doorOpen, [40, 54, 66, 67, 66, 152, 40, 139], 0x3b3f55);
  ellipse(doorOpen, 55, 134, 8, 5, 0xffffff);
  poly(doorOpen, [40, 54, 22, 62, 22, 147, 40, 139], 0xd9dbe6);
  const doorClosed = new Graphics();
  poly(doorClosed, [40, 54, 66, 67, 66, 152, 40, 139], 0xd9dbe6);
  poly(doorClosed, [45, 72, 61, 80, 61, 92, 45, 84], { fill: 0xffffff, line: 2.5 });
  circle(doorClosed, 61, 108, 2.5, OUT);
  const lamp = new Graphics();
  root.addChild(doorOpen, doorClosed, lamp);
  return { root, doorClosed, doorOpen, lamp };
}

export function sink(): Graphics {
  const g = new Graphics();
  isoBox(g, 30, 40, 16, 22, 0xffffff, 0xe6e8f0, 0xc3c6d4);
  ellipse(g, 30, 16, 9, 4, 0xc7ecff);
  line(g, [30, 6, 30, 12, 34, 14], 0x9aa0b4, 3);
  rect(g, 18, -30, 24, 22, 3, { fill: 0xc7ecff, line: 3 });
  return g;
}

/** Большой стол директора IT: tier 0 — обычный, 1 — улучшенный (после обучения). */
export function directorDesk(tier: number): Graphics {
  const g = new Graphics();
  ellipse(g, 0, 18, 78, 18, { fill: OUT, alpha: 0.12, line: 0 });
  const top = tier ? 0x6b3a22 : 0xc98545;
  const left = tier ? 0x4e2a18 : 0xa96a33;
  const right = tier ? 0x3e2113 : 0x8a5a2a;
  isoBox(g, 0, 10, 70, 30, top, left, right);
  if (tier) {
    line(g, [-68, -18, 0, 16, 68, -18], 0xffd23f, 2.5);
    rect(g, -10, -34, 18, 8, 2, { fill: 0xffd23f, line: 2 });
  }
  // ноутбук
  poly(g, [10, -36, 30, -26, 14, -18, -6, -28], 0x9aa0b4);
  poly(g, [-6, -28, 10, -36, 10, -56, -6, -48], OUT);
  poly(g, [-3, -31, 7, -36, 7, -52, -3, -47], { fill: 0x8ee3ff, line: 0 });
  return g;
}

/** Растение в кадке на полу. */
export function plant(color = 0x3ccf63, big = false): Graphics {
  const g = new Graphics();
  const s = big ? 1.4 : 1;
  ellipse(g, 0, 4, 14 * s, 5 * s, { fill: OUT, alpha: 0.12, line: 0 });
  for (const [x, y, rx, ry] of [
    [-8, -34, 7, 18],
    [8, -36, 7, 18],
    [0, -44, 7, 20],
  ])
    ellipse(g, x * s, y * s, rx * s, ry * s, color);
  p(g, `M${-12 * s} ${-14 * s} L${12 * s} ${-14 * s} L${9 * s} ${4 * s} L${-9 * s} ${4 * s} Z`, 0xff7a45);
  return g;
}

export function waterCooler(): Graphics {
  const g = new Graphics();
  ellipse(g, 0, 4, 14, 5, { fill: OUT, alpha: 0.12, line: 0 });
  isoBox(g, 0, 0, 12, 34, 0xf4f4f8, 0xd9dbe6, 0xc3c6d4);
  p(g, 'M-9 -36 Q-10 -58 0 -60 Q10 -58 9 -36 Z', { fill: 0x8ee3ff, alpha: 0.85 });
  rect(g, -3, -26, 6, 4, 1, { fill: 0x4fb3ff, line: 2 });
  return g;
}

/** Новогодняя ёлка для холла. */
export function newYearTree(): Graphics {
  const g = new Graphics();
  ellipse(g, 0, 4, 22, 7, { fill: OUT, alpha: 0.14, line: 0 });
  rect(g, -5, -10, 10, 14, 2, 0x7a4a22);
  poly(g, [-26, -10, 26, -10, 0, -40], 0x2fa860);
  poly(g, [-21, -30, 21, -30, 0, -60], 0x3cc774);
  poly(g, [-15, -50, 15, -50, 0, -78], 0x5be07f);
  for (const [x, y, c] of [
    [-12, -16, 0xe8173a],
    [10, -20, 0xffd23f],
    [-6, -38, 0x4fb3ff],
    [8, -44, 0xff5fa2],
    [0, -62, 0xffd23f],
  ] as const)
    circle(g, x, y, 3.5, { fill: c, line: 1.5 });
  poly(g, [0, -88, 4, -80, 12, -80, 6, -75, 8, -67, 0, -72, -8, -67, -6, -75, -12, -80, -4, -80], { fill: 0xffd23f, line: 2 });
  return g;
}
