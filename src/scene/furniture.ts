// Мебель в стиле Б для камеры «прямо» (3/4 спереди).
// Каждый предмет рисуется в пикселях экрана; точка (0, 0) — пол у передней кромки, по центру предмета.

import { Container, Graphics } from 'pixi.js';
import { OUT, circle, ellipse, fbox, line, p, poly, rect, shadow, stroke } from './draw';

// ---------- рабочее место ----------
// Стол: ножки 18, толщина столешницы 8, глубина крышки 32. Сотрудник сидит за столом в точке (0, WORKER_Y).

export const DESK_W = 104;
const LEG = 18;
const SLAB = 8;
const TOP_D = 32;
/** Верх крышки (дальняя кромка) и ближняя кромка. */
export const DESK_TOP_BACK = -(LEG + SLAB + TOP_D);
export const DESK_TOP_FRONT = -(LEG + SLAB);
/** Где «стоит» сидящий сотрудник: за столом. */
export const WORKER_Y = -40;

interface Slab {
  top: number;
  edge: number;
  legs: number;
}

const DESK_TIERS: Slab[] = [
  { top: 0xc3c6d4, edge: 0x9aa0b4, legs: 0x5a6078 },
  { top: 0xf0b46a, edge: 0xc98545, legs: 0x7a4a22 },
  { top: 0xf4f4f8, edge: 0xd9dbe6, legs: 0x9aa0b4 },
  { top: 0x4b5270, edge: 0x3b3f55, legs: 0x262338 },
];

/** Спинка стула за сидящим сотрудником. */
export function chairBack(tier: number): Graphics {
  const g = new Graphics();
  const y = WORKER_Y;
  switch (tier) {
    case 0:
      rect(g, -13, y - 44, 26, 28, 4, 0x9aa0b4);
      break;
    case 1:
      rect(g, -18, y - 52, 36, 36, 6, 0xc98545);
      line(g, [-12, y - 42, 12, y - 42], 0xa96a33, 3);
      break;
    case 2:
      rect(g, -20, y - 58, 40, 42, 14, 0x5a6078);
      break;
    default:
      rect(g, -22, y - 70, 44, 54, 12, 0x262338);
      rect(g, -15, y - 64, 7, 44, 3, { fill: 0xe8173a, line: 2 });
      rect(g, 8, y - 64, 7, 44, 3, { fill: 0xe8173a, line: 2 });
      rect(g, -9, y - 66, 18, 8, 4, { fill: 0xffffff, line: 2 });
  }
  return g;
}

/** Стол: тень, ножки, кромка и крышка. */
export function deskSlab(tier: number): Graphics {
  const s = DESK_TIERS[Math.max(0, Math.min(3, tier))];
  const g = new Graphics();
  const hw = DESK_W / 2;
  shadow(g, 0, 2, hw + 6, 9);
  rect(g, -hw + 4, -LEG, 6, LEG, 0, s.legs);
  rect(g, hw - 10, -LEG, 6, LEG, 0, s.legs);
  if (tier === 2) {
    // тумба с ящиками справа
    rect(g, 14, -LEG, 34, LEG, 0, 0xe6e8f0);
    line(g, [24, -10, 38, -10], OUT, 2.5);
  }
  rect(g, -hw, DESK_TOP_BACK, DESK_W, TOP_D, 0, { fill: s.top, line: 3 });
  rect(g, -hw, DESK_TOP_FRONT, DESK_W, SLAB, 0, { fill: s.edge, line: 3 });
  if (tier >= 3) line(g, [-hw + 3, DESK_TOP_FRONT + SLAB - 2, hw - 3, DESK_TOP_FRONT + SLAB - 2], 0x2fbfae, 3);
  return g;
}

/** Монитор на столе слева: экран смотрит к камере, чтобы было видно код. Возвращает экран для анимации. */
export function monitor(tier: number): { g: Graphics; screen: { x: number; y: number; w: number; h: number } } {
  const g = new Graphics();
  const base = DESK_TOP_BACK + 8;
  switch (tier) {
    case 0:
      rect(g, -52, base - 32, 38, 30, 4, 0xd6c7a3);
      rect(g, -40, base - 3, 14, 4, 1, 0xc4b38c);
      rect(g, -48, base - 28, 30, 21, 3, { fill: 0x8ee3ff, line: 2 });
      return { g, screen: { x: -48, y: base - 28, w: 30, h: 21 } };
    case 1:
      rect(g, -35, base - 8, 5, 8, 0, OUT);
      rect(g, -48, base - 6, 32, 4, 1, OUT);
      rect(g, -50, base - 32, 36, 24, 3, OUT);
      rect(g, -47, base - 29, 30, 18, 2, { fill: 0x8ee3ff, line: 1.5 });
      return { g, screen: { x: -47, y: base - 29, w: 30, h: 18 } };
    case 2:
      rect(g, -36, base - 8, 6, 8, 0, OUT);
      rect(g, -50, base - 5, 34, 4, 1, OUT);
      rect(g, -56, base - 36, 46, 28, 3, OUT);
      rect(g, -53, base - 33, 40, 22, 2, { fill: 0x8ee3ff, line: 1.5 });
      return { g, screen: { x: -53, y: base - 33, w: 40, h: 22 } };
    default:
      ellipse(g, -32, base - 2, 30, 4, { fill: 0x8b6cff, alpha: 0.35, line: 0 });
      rect(g, -36, base - 9, 7, 9, 0, OUT);
      rect(g, -60, base - 40, 54, 31, 4, OUT);
      rect(g, -57, base - 37, 48, 25, 3, { fill: 0x8b6cff, line: 1.5 });
      rect(g, -33, base - 37, 24, 25, 0, { fill: 0x8ee3ff, line: 0 });
      return { g, screen: { x: -57, y: base - 37, w: 48, h: 25 } };
  }
}

/** Три «строчки кода» на экране — их масштаб анимирует сцена. */
export function codeLines(tier: number, screen: { x: number; y: number; w: number; h: number }): Container[] {
  const n = tier === 0 ? 2 : 3;
  const out: Container[] = [];
  for (let i = 0; i < n; i++) {
    const c = new Container();
    const g = new Graphics();
    const len = screen.w * (0.45 + ((i * 37) % 5) * 0.09);
    line(g, [0, 0, len, 0], tier >= 3 ? 0xffffff : 0x1d6f99, 2.2);
    c.addChild(g);
    c.position.set(screen.x + 4 + (i === 2 ? 4 : 0), screen.y + 5 + i * ((screen.h - 8) / Math.max(1, n - 1)));
    out.push(c);
  }
  return out;
}

const KEYS = [0x9aa0b4, 0x454b63, 0xf4f4f8, 0x262338];

export function keyboard(tier: number): Graphics {
  const g = new Graphics();
  rect(g, -17, DESK_TOP_FRONT - 14, 34, 9, 2, KEYS[tier]);
  if (tier >= 3) line(g, [-14, DESK_TOP_FRONT - 6, 14, DESK_TOP_FRONT - 6], 0xff5fa2, 2);
  return g;
}

export function mouse(tier: number): Graphics {
  const g = new Graphics();
  stroke(g, `M17 ${DESK_TOP_FRONT - 10} Q20 ${DESK_TOP_FRONT - 14} 24 ${DESK_TOP_FRONT - 12}`, OUT, 1.5);
  ellipse(g, 26, DESK_TOP_FRONT - 10, 5, 3.5, KEYS[tier]);
  if (tier >= 3) circle(g, 26, DESK_TOP_FRONT - 11, 1.4, { fill: 0x2fbfae, line: 0 });
  return g;
}

const PHONES = [0xe8dcc0, 0x262338, 0xf4f4f8, 0xffd23f];

/** Телефон на столе справа. */
export function phone(tier: number): Graphics {
  const g = new Graphics();
  const y = DESK_TOP_FRONT - 8;
  rect(g, 30, y - 8, 18, 8, 2, PHONES[tier]);
  stroke(g, `M29 ${y - 9} Q39 ${y - 17} 49 ${y - 9}`, OUT, 6);
  stroke(g, `M29 ${y - 9} Q39 ${y - 17} 49 ${y - 9}`, tier === 3 ? 0xe8173a : PHONES[tier], 3);
  return g;
}

/** Цветок в горшке на дальнем правом углу стола. */
export function flower(): Container {
  const g = new Container();
  const y = DESK_TOP_BACK + 10;
  for (const [cx, cy, rot, c] of [
    [36, y - 14, -0.44, 0x3ccf63],
    [44, y - 15, 0.35, 0x3ccf63],
    [40, y - 19, 0, 0x5be07f],
  ] as const) {
    const leaf = new Graphics();
    ellipse(leaf, 0, 0, 3.5, 8, c);
    leaf.rotation = rot;
    leaf.position.set(cx, cy);
    g.addChild(leaf);
  }
  const pot = new Graphics();
  poly(pot, [33, y - 8, 47, y - 8, 45, y + 3, 35, y + 3], 0xff7a45);
  g.addChild(pot);
  return g;
}

/** Кружка; пар отдельно. */
export function mug(x: number, y: number): Graphics {
  const g = new Graphics();
  stroke(g, `M${x + 10} ${y + 2} Q${x + 15} ${y + 6} ${x + 10} ${y + 9}`, OUT, 4.5);
  stroke(g, `M${x + 10} ${y + 2} Q${x + 15} ${y + 6} ${x + 10} ${y + 9}`, 0xffffff, 2);
  rect(g, x, y, 10, 11, 2.5, 0xffffff);
  ellipse(g, x + 5, y, 5, 2, { fill: 0x7a4a22, line: 1.5 });
  return g;
}

export function steam(x: number, y: number): Graphics {
  const g = new Graphics();
  stroke(g, `M${x} ${y} Q${x - 3} ${y - 4} ${x} ${y - 8} Q${x + 3} ${y - 12} ${x} ${y - 16}`, 0xb9b6c8, 2);
  return g;
}

/** Руки на клавиатуре: предплечье от плеча к клавиатуре. */
export function typingHand(side: 'L' | 'R', sleeve: number, skin: number): Container {
  const c = new Container();
  const g = new Graphics();
  const s = side === 'L' ? -1 : 1;
  const sx = 11 * s;
  const sy = WORKER_Y - 26;
  const hx = 7 * s;
  const hy = DESK_TOP_FRONT - 13;
  line(g, [sx, sy, hx, hy], OUT, 9);
  line(g, [sx, sy, hx, hy], sleeve, 5);
  circle(g, hx, hy + 1, 4, skin);
  c.addChild(g);
  return c;
}

// ---------- пост сисадмина ----------
// Верстак у дальней части места, сотрудник стоит перед ним спиной к камере.

export const POST_BACK = -30;

/** Верстак или стойка; у стойки мигающие огоньки — дочерний контейнер 'lights'. */
export function sysadminPost(tier: number): Container {
  const c = new Container();
  const g = new Graphics();
  const by = POST_BACK;
  shadow(g, 0, by + 2, 56, 8, 0.12);
  const bench = (top: number, edge: number, legs: number): void => {
    rect(g, -46, by - 16, 6, 16, 0, legs);
    rect(g, 40, by - 16, 6, 16, 0, legs);
    rect(g, -50, by - 46, 100, 24, 0, { fill: top, line: 3 });
    rect(g, -50, by - 22, 100, 7, 0, { fill: edge, line: 3 });
  };
  switch (tier) {
    case 0:
      bench(0xc3c6d4, 0x9aa0b4, 0x5a6078);
      rect(g, -36, by - 70, 30, 26, 3, 0xd6c7a3);
      rect(g, -32, by - 66, 22, 16, 2, { fill: 0x8ee3ff, line: 2 });
      break;
    case 1:
      bench(0xf0b46a, 0xc98545, 0x7a4a22);
      rect(g, -38, by - 72, 30, 26, 3, OUT);
      rect(g, -35, by - 69, 24, 18, 2, { fill: 0x8ee3ff, line: 1.5 });
      line(g, [8, by - 36, 30, by - 40], 0xff7a45, 4);
      line(g, [30, by - 40, 36, by - 41], OUT, 2);
      break;
    case 2:
      // шкаф с запчастями слева и верстак
      fbox(g, -30, by, 34, 64, 10, 0xc9a46a, 0xdcbb84);
      line(g, [-38, by - 50, -38, by - 34], OUT, 3);
      line(g, [-22, by - 50, -22, by - 34], OUT, 3);
      circle(g, -30, by - 22, 3.5, { fill: 0xc9a46a, line: 2.5 });
      rect(g, -6, by - 16, 5, 16, 0, 0x9aa0b4);
      rect(g, 44, by - 16, 5, 16, 0, 0x9aa0b4);
      rect(g, -10, by - 40, 62, 18, 0, { fill: 0xc3c6d4, line: 3 });
      rect(g, -10, by - 22, 62, 6, 0, { fill: 0x9aa0b4, line: 3 });
      fbox(g, 22, by - 22, 22, 12, 6, 0xe8173a, 0xff5a5a);
      break;
    default:
      // серверная стойка и маленький столик
      fbox(g, -22, by, 44, 82, 12, 0x2f3344, 0x4b5270);
      for (let i = 0; i < 6; i++) line(g, [-38, by - 72 + i * 11, -6, by - 72 + i * 11], 0x454b63, 2);
      rect(g, 16, by - 14, 4, 14, 0, 0x9aa0b4);
      rect(g, 44, by - 14, 4, 14, 0, 0x9aa0b4);
      rect(g, 12, by - 34, 40, 14, 0, { fill: 0xc3c6d4, line: 3 });
      rect(g, 12, by - 20, 40, 6, 0, { fill: 0x9aa0b4, line: 3 });
  }
  c.addChild(g);
  if (tier >= 3) {
    const lights = new Container();
    const colors = [0x3ccf63, 0x4fb3ff, 0x3ccf63, 0xffd23f, 0x4fb3ff, 0x3ccf63];
    colors.forEach((col, i) => {
      const l = new Graphics();
      circle(l, -34 + (i % 2) * 6, by - 68 + i * 11, 2.2, { fill: col, line: 0 });
      lights.addChild(l);
    });
    lights.label = 'lights';
    c.addChild(lights);
  }
  return c;
}

const TOOLBOX = [0xc9a46a, 0xe8173a, 0xe8173a, 0x2f3344];

/** Ящик с инструментами на полу слева от сотрудника. */
export function toolbox(tier: number): Graphics {
  const g = new Graphics();
  const w = tier >= 2 ? 30 : 22;
  const h = tier >= 3 ? 30 : tier >= 2 ? 20 : 12;
  shadow(g, -46, 2, w / 2 + 4, 4, 0.12);
  fbox(g, -46, 0, w, h, 7, TOOLBOX[tier], tier === 0 ? 0xe0c48a : 0xff5a5a);
  if (tier >= 2) line(g, [-46 - w / 2 + 3, -h / 2, -46 + w / 2 - 3, -h / 2], OUT, 2);
  if (tier === 3) line(g, [-46 - w / 2 + 3, -h / 2 + 8, -46 + w / 2 - 3, -h / 2 + 8], 0x2fbfae, 2);
  return g;
}

/** Табурет справа. */
export function stool(tier: number): Graphics {
  const g = new Graphics();
  const col = [0x9aa0b4, 0xc98545, 0x5a6078, 0xe8173a][tier];
  shadow(g, 44, 2, 12, 4, 0.12);
  rect(g, 42, -16, 5, 16, 0, OUT);
  ellipse(g, 44, -18, 12, 5, col);
  return g;
}

/** Лампа на верстаке справа. */
export function lamp(tier: number): Graphics {
  const g = new Graphics();
  const y = POST_BACK - 40;
  if (tier === 0) return g;
  if (tier === 1) {
    ellipse(g, 36, y, 6, 2.5, 0x9aa0b4);
    line(g, [36, y, 34, y - 14, 42, y - 22], OUT, 5);
    line(g, [36, y, 34, y - 14, 42, y - 22], 0x9aa0b4, 2);
    poly(g, [38, y - 26, 48, y - 20, 44, y - 15, 36, y - 20], 0x9aa0b4);
  } else if (tier === 2) {
    ellipse(g, 36, y, 7, 3, 0xf4f4f8);
    rect(g, 34.5, y - 24, 3, 24, 0, 0xd9dbe6);
    rect(g, 24, y - 28, 24, 5, 2.5, 0xf4f4f8);
  } else {
    circle(g, 36, y - 14, 14, { fill: 0xff5fa2, alpha: 0.18, line: 0 });
    p(g, `M30 ${y} L33 ${y - 8} L39 ${y - 8} L42 ${y} Z`, 0x454b63);
    p(g, `M33 ${y - 8} Q29 ${y - 20} 34 ${y - 32} L38 ${y - 32} Q43 ${y - 20} 39 ${y - 8} Z`, 0x8b6cff);
    ellipse(g, 35, y - 18, 2.5, 3.5, { fill: 0xff7a45, line: 0 });
  }
  return g;
}

// ---------- зона отдыха ----------

/** Стойка с кофемашиной у дальней стены. */
export function coffeeMachine(tier: number): Container {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 2, 62, 8, 0.12);
  fbox(g, 0, 0, 116, 34, 26, 0xc98545, 0xf0b46a);
  line(g, [-50, -18, -12, -18], OUT, 2.5);
  line(g, [12, -18, 50, -18], OUT, 2.5);
  const top = -34 - 10;
  if (tier <= 0) {
    // пустая стойка с чайником
    rect(g, -12, top - 22, 22, 20, 6, 0xf4f4f8);
    stroke(g, `M10 ${top - 18} Q18 ${top - 14} 10 ${top - 6}`, OUT, 3);
    line(g, [-6, top - 24, 4, top - 24], OUT, 3);
  } else if (tier === 1) {
    rect(g, -18, top - 40, 36, 38, 4, 0x3b3f55);
    rect(g, -12, top - 34, 24, 10, 2, 0x5a6078);
    p(g, `M-10 ${top - 18} Q-11 ${top - 4} -4 ${top - 2} L4 ${top - 2} Q11 ${top - 4} 10 ${top - 18} Z`, { fill: 0x8ee3ff, alpha: 0.7 });
    p(g, `M-10 ${top - 10} Q-10 ${top - 3} -4 ${top - 2} L4 ${top - 2} Q10 ${top - 3} 10 ${top - 10} Z`, 0x7a4a22);
  } else if (tier === 2) {
    rect(g, -22, top - 46, 44, 44, 5, 0xc3c6d4);
    rect(g, -16, top - 40, 32, 10, 2, 0xe6e8f0);
    line(g, [-8, top - 24, -8, top - 16], OUT, 5);
    rect(g, -14, top - 12, 12, 10, 2, { fill: 0xffffff, line: 2.5 });
    circle(g, 12, top - 22, 4, { fill: 0xffffff, line: 2 });
  } else {
    rect(g, -30, top - 50, 60, 48, 6, 0xe8173a);
    rect(g, -24, top - 44, 48, 10, 2, 0xff5a5a);
    line(g, [-12, top - 28, -12, top - 18], OUT, 5);
    line(g, [12, top - 28, 12, top - 18], OUT, 5);
    rect(g, -18, top - 12, 12, 10, 2, { fill: 0xffffff, line: 2.5 });
    rect(g, 6, top - 12, 12, 10, 2, { fill: 0xffffff, line: 2.5 });
    circle(g, 0, top - 40, 3, { fill: 0xffffff, line: 2 });
  }
  c.addChild(g);
  return c;
}

/** Холодильник у дальней стены. */
export function fridge(tier: number): Graphics {
  const g = new Graphics();
  shadow(g, 0, 2, 32, 6, 0.12);
  if (tier <= 1) {
    const w = tier === 1 ? 46 : 40;
    const h = tier === 1 ? 84 : 62;
    fbox(g, 0, 0, w, h, 12, 0xf4f4f8, 0xffffff);
    line(g, [-w / 2, -h * 0.62, w / 2, -h * 0.62]);
    line(g, [w / 2 - 8, -h + 8, w / 2 - 8, -h + 20]);
    rect(g, -w / 2 + 6, -h + 10, 6, 6, 0, { fill: 0xff7a45, line: 0 });
  } else if (tier === 2) {
    fbox(g, 0, 0, 58, 96, 12, 0xf4f4f8, 0xffffff);
    line(g, [0, -96, 0, 0]);
    line(g, [-5, -70, -5, -54]);
    line(g, [5, -70, 5, -54]);
    rect(g, -22, -86, 7, 6, 0, { fill: 0xff5fa2, line: 0 });
    circle(g, 18, -80, 3.5, { fill: 0x4fb3ff, line: 0 });
  } else {
    ellipse(g, 0, 2, 38, 7, { fill: 0x4fb3ff, alpha: 0.2, line: 0 });
    fbox(g, 0, 0, 60, 100, 12, 0xe8173a, 0xff5a5a);
    rect(g, -24, -94, 48, 86, 3, 0xc7ecff);
    for (const y of [-66, -38]) line(g, [-24, y, 24, y], OUT, 2);
    const cols = [0xff7a45, 0x3ccf63, 0x4fb3ff, 0xffd23f, 0x8b6cff, 0xff7a45];
    cols.forEach((col, i) => rect(g, -18 + (i % 3) * 13, -90 + Math.floor(i / 3) * 28 + 6, 6, 14, 2, { fill: col, line: 0 }));
    rect(g, -18, -102, 36, 6, 2, { fill: 0xffd23f, line: 0 });
  }
  return g;
}

/** Диван спинкой к камере: игроки сидят за ним и смотрят телевизор. */
export function sofa(color = 0x2fbfae): Graphics {
  const g = new Graphics();
  const dark = color === 0x2fbfae ? 0x22968a : color;
  shadow(g, 0, 2, 82, 9, 0.14);
  rect(g, -80, -30, 16, 30, 7, dark);
  rect(g, 64, -30, 16, 30, 7, dark);
  rect(g, -70, -40, 140, 40, 9, color);
  line(g, [-62, -26, 62, -26], dark, 3);
  ellipse(g, -46, -40, 11, 7, 0xffd23f);
  return g;
}

/** Телевизор с приставкой на тумбе у дальней стены; стопка игр — сколько куплено. */
export function tvStand(games: number): Container {
  const c = new Container();
  const g = new Graphics();
  shadow(g, 0, 2, 54, 7, 0.12);
  fbox(g, 0, 0, 100, 20, 14, 0x5a6078, 0x7d8398);
  const top = -34;
  rect(g, -6, top - 6, 12, 6, 0, OUT);
  rect(g, -44, top - 56, 88, 50, 4, OUT);
  rect(g, -40, top - 52, 80, 42, 3, { fill: 0x8ee3ff, line: 1.5 });
  rect(g, -40, top - 26, 80, 16, 0, { fill: 0x3ccf63, line: 0 });
  rect(g, -6, top - 38, 8, 10, 0, { fill: 0xff7a45, line: 2 });
  rect(g, -36, top - 2, 18, 6, 2, { fill: 0xf4f4f8, line: 2 });
  const colors = [0xe8173a, 0x4fb3ff, 0x3ccf63, 0xffd23f, 0x8b6cff, 0xff7a45, 0x2fbfae, 0xff5fa2, 0x454b63, 0x24358a];
  for (let i = 0; i < Math.min(games, 10); i++) rect(g, 14 + (i % 5) * 7, top - 8 - Math.floor(i / 5) * 9, 6, 8, 1, { fill: colors[i], line: 1.5 });
  c.addChild(g);
  return c;
}

/** Кабинка туалета дверью к камере. */
export function toiletCabin(): { root: Container; doorClosed: Graphics; doorOpen: Graphics; lamp: Graphics; lampAt: { x: number; y: number } } {
  const root = new Container();
  const g = new Graphics();
  shadow(g, 0, 2, 54, 8, 0.12);
  fbox(g, 0, 0, 100, 104, 16, 0xc3c6d4, 0xe6e8f0);
  root.addChild(g);
  const doorOpen = new Graphics();
  rect(doorOpen, -26, -94, 52, 92, 3, 0x3b3f55);
  ellipse(doorOpen, 0, -20, 14, 8, 0xffffff);
  rect(doorOpen, -8, -44, 16, 20, 4, 0xffffff);
  poly(doorOpen, [26, -94, 40, -88, 40, -6, 26, -2], 0xd9dbe6);
  const doorClosed = new Graphics();
  rect(doorClosed, -26, -94, 52, 92, 3, 0xd9dbe6);
  rect(doorClosed, -10, -82, 20, 14, 2, { fill: 0xffffff, line: 2.5 });
  circle(doorClosed, 18, -48, 2.5, OUT);
  const lamp = new Graphics();
  root.addChild(doorOpen, doorClosed, lamp);
  return { root, doorClosed, doorOpen, lamp, lampAt: { x: 34, y: -108 } };
}

/** Раковина с зеркалом. */
export function sink(): Graphics {
  const g = new Graphics();
  rect(g, -16, -96, 32, 26, 3, { fill: 0xc7ecff, line: 3 });
  line(g, [-10, -90, -2, -94], 0xffffff, 2);
  shadow(g, 0, 2, 20, 5, 0.12);
  rect(g, -6, -28, 12, 28, 2, 0xe6e8f0);
  fbox(g, 0, -28, 38, 10, 10, 0xffffff, 0xe6e8f0);
  ellipse(g, 0, -42, 12, 4, 0xc7ecff);
  line(g, [0, -54, 0, -46, 6, -44], 0x9aa0b4, 3);
  return g;
}

/** Большой стол директора IT: tier 0 — обычный, 1 — улучшенный (после обучения). */
export function directorDesk(tier: number): Graphics {
  const g = new Graphics();
  const top = tier ? 0x6b3a22 : 0xf0b46a;
  const edge = tier ? 0x4e2a18 : 0xc98545;
  const legs = tier ? 0x3e2113 : 0x8a5a2a;
  shadow(g, 0, 2, 86, 10, 0.12);
  // тумбы
  fbox(g, -56, 0, 40, 22, 0, edge, top);
  fbox(g, 56, 0, 40, 22, 0, edge, top);
  line(g, [-66, -12, -46, -12], OUT, 2.5);
  line(g, [46, -12, 66, -12], OUT, 2.5);
  rect(g, -6, -22, 12, 22, 0, legs);
  rect(g, -80, -70, 160, 38, 0, { fill: top, line: 3 });
  rect(g, -80, -32, 160, 10, 0, { fill: edge, line: 3 });
  if (tier) {
    line(g, [-78, -24, 78, -24], 0xffd23f, 2.5);
    rect(g, 30, -46, 26, 8, 2, { fill: 0xffd23f, line: 2 });
  }
  // ноутбук экраном к камере
  poly(g, [-34, -44, 4, -44, 10, -36, -40, -36], 0x9aa0b4);
  rect(g, -36, -72, 42, 28, 3, OUT);
  rect(g, -33, -69, 36, 22, 2, { fill: 0x8ee3ff, line: 0 });
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
  shadow(g, 0, 3, 16, 5, 0.12);
  fbox(g, 0, 0, 26, 40, 8, 0xd9dbe6, 0xf4f4f8);
  p(g, 'M-9 -48 Q-10 -70 0 -72 Q10 -70 9 -48 Z', { fill: 0x8ee3ff, alpha: 0.85 });
  rect(g, -4, -32, 8, 5, 1, { fill: 0x4fb3ff, line: 2 });
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
