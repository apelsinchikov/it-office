// Модульные персонажи в стиле Б и их анимация.
// Все координаты — в «единицах персонажа» рисунка 120×220 (как на холсте). Ноги стоят в точке (60, 204).

import { Container, Graphics } from 'pixi.js';
import { OUT, circle, ellipse, line, p, rect, shade, stroke } from './draw';

export type Outfit = 'support' | 'dev' | 'qa' | 'analyst' | 'sysadmin' | 'manager' | 'director';
export type Acc = 'glasses' | 'beard' | 'cap' | 'headphones' | 'headset';

export interface Look {
  skin: number;
  hair: number;
  hairColor: number;
  outfit: Outfit;
  color: number;
  pants: number;
  shoes: number;
  acc: Acc[];
  lashes?: boolean;
  /** Женский персонаж: длинные волосы, ресницы, у стоящих — юбка. */
  fem?: boolean;
}

export const SKINS = [0xffe0bd, 0xffcf9e, 0xe8b48a, 0xc68642, 0xa86b3c, 0x7a4a2a];
export const HAIR_COLORS = [0x2a2433, 0x4a3426, 0x8a3b22, 0xe0702c, 0xf2b544, 0xd9d4cc, 0x8b6cff, 0x2fbfae];
export const HOODIES = [0x3cc774, 0xff7a45, 0x8b6cff, 0x5a6078, 0xff5fa2, 0x4fb3ff];
export const HAIR_STYLES = 12;
const LONG_HAIR = new Set([3, 4, 5, 6, 10]);

const pick = <T>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length) % xs.length];

const FEM_HAIR = [3, 4, 5, 6, 10];
const MALE_HAIR = Array.from({ length: HAIR_STYLES }, (_, i) => i).filter((i) => !LONG_HAIR.has(i));

/** Случайная внешность сотрудника отдела; fem — женщина (по имени), undefined — случайно. */
export function randomLook(rng: () => number, outfit: Outfit, fem?: boolean): Look {
  const female = fem ?? rng() < 0.5;
  const hair = female ? pick(rng, FEM_HAIR) : pick(rng, MALE_HAIR);
  const look: Look = {
    skin: pick(rng, SKINS),
    hair,
    hairColor: rng() < 0.15 ? pick(rng, HAIR_COLORS.slice(6)) : pick(rng, HAIR_COLORS.slice(0, 6)),
    outfit,
    color: 0x4fb3ff,
    pants: pick(rng, [0x3552a8, 0x454b63, 0x2f3444, 0xc9a46a, 0x6b7a4a]),
    shoes: pick(rng, [0xffffff, 0x262338, 0x8a5a33, 0x5b3d2a]),
    acc: [],
    lashes: female,
    fem: female,
  };
  switch (outfit) {
    case 'support':
      look.color = pick(rng, [0x4fb3ff, 0x7dd3fc, 0xa3e3c8]);
      look.acc.push('headset');
      break;
    case 'dev':
      look.color = pick(rng, HOODIES);
      look.pants = pick(rng, [0x3552a8, 0x2f3444, 0x454b63]);
      look.shoes = pick(rng, [0xffffff, 0xff5fa2, 0x262338]);
      if (rng() < 0.3) look.acc.push('headphones');
      break;
    case 'qa':
      look.color = pick(rng, [0xf5c542, 0xff9a6a, 0x9cd67a]);
      look.pants = pick(rng, [0xc9a46a, 0x454b63]);
      if (rng() < 0.75) look.acc.push('glasses');
      break;
    case 'analyst':
      look.color = pick(rng, [0x5b6178, 0x7b5b3a, 0x3b5b7a]);
      look.pants = 0x2f3444;
      look.shoes = 0x262338;
      if (rng() < 0.3) look.acc.push('glasses');
      break;
    case 'sysadmin':
      look.color = pick(rng, [0x6b7a8f, 0xe85d6a, 0x454b63, 0x3a7a5a]);
      look.pants = 0x6b7a4a;
      look.shoes = 0x3a2a20;
      if (rng() < 0.45 && !LONG_HAIR.has(hair)) look.acc.push('beard');
      if (rng() < 0.2) look.acc.push('cap');
      break;
    case 'manager':
      look.color = pick(rng, [0x2f45a8, 0x3b3f55, 0x6b2d3a]);
      look.pants = 0x24358a;
      look.shoes = 0x262338;
      break;
    case 'director':
      break;
  }
  if (female) look.acc = look.acc.filter((a) => a !== 'beard');
  if (look.acc.includes('beard')) look.lashes = false;
  return look;
}

/** Директор IT: длинное платье, красные туфли на каблуках, длинные волосы. */
export const DIRECTOR_LOOK: Look = {
  skin: 0xffe0bd,
  hair: 5,
  hairColor: 0x8a3b22,
  outfit: 'director',
  color: 0x3d56c4,
  pants: 0x3d56c4,
  shoes: 0xff2d3a,
  acc: [],
  lashes: true,
};

const TORSO = 'M38 120 Q38 106 52 104 L68 104 Q82 106 82 120 L84 170 L36 170 Z';

function legsG(look: Look, side: 'L' | 'R', back: boolean): Graphics {
  const g = new Graphics();
  const x = side === 'L' ? 46 : 61;
  if (look.outfit === 'director') {
    if (side === 'L') {
      rect(g, 53, 196, 3, 10, 0, { fill: 0xb5121d, line: 1.5 });
      p(g, 'M40 198 Q42 192 52 192 L58 198 L56 203 L42 203 Z', look.shoes);
    } else {
      rect(g, 76, 196, 3, 10, 0, { fill: 0xb5121d, line: 1.5 });
      p(g, 'M62 198 L68 192 Q78 192 80 198 L78 203 L64 203 Z', look.shoes);
    }
    return g;
  }
  if (look.fem && look.outfit !== 'sysadmin') {
    // юбка до колен и ноги
    rect(g, x + 3, 176, 7, 20, 3, look.skin);
    p(g, side === 'L' ? 'M44 162 L61 162 L61 182 L40 182 Z' : 'M59 162 L76 162 L80 182 L59 182 Z', back ? shade(look.pants, -0.12) : look.pants);
  } else rect(g, x, 164, 13, 32, 5, back ? shade(look.pants, -0.12) : look.pants);
  if (look.outfit === 'sysadmin') rect(g, x + 1, 174, 8, 9, 2, { fill: shade(look.pants, -0.15), line: 2 });
  rect(g, side === 'L' ? 41 : 60, back ? 192 : 190, 19, back ? 10 : 12, 6, look.shoes);
  return g;
}

function armG(look: Look, side: 'L' | 'R'): Graphics {
  const g = new Graphics();
  const x = side === 'L' ? 27 : 79;
  const hx = side === 'L' ? 34 : 86;
  const sleeve = look.outfit === 'analyst' ? 0xf4f4f8 : look.color;
  if (look.outfit === 'sysadmin') {
    rect(g, x + 1, 122, 12, 34, 6, look.skin);
    rect(g, x, 112, 14, 20, 7, sleeve);
  } else if (look.outfit === 'director') {
    rect(g, side === 'L' ? 31 : 77, 110, 12, 50, 6, sleeve);
  } else {
    rect(g, x, 112, 14, 44, 7, sleeve);
  }
  circle(g, hx, look.outfit === 'director' ? 162 : 158, look.outfit === 'director' ? 6 : 6.5, look.skin);
  return g;
}

function torsoG(look: Look, back: boolean): Graphics {
  const g = new Graphics();
  const c = look.color;
  switch (look.outfit) {
    case 'director':
      p(g, 'M44 114 Q44 104 54 102 L66 102 Q76 104 76 114 L78 136 L92 196 L28 196 L42 136 Z', back ? shade(c, -0.1) : c);
      rect(g, 41, 132, 38, 7, 2, shade(c, -0.35));
      return g;
    case 'analyst':
      p(g, TORSO, back ? c : 0xf4f4f8);
      if (!back) p(g, 'M40 112 L52 105 L60 132 L68 105 L80 112 L83 170 L37 170 Z', c);
      return g;
    case 'dev':
      p(g, TORSO, c);
      if (back) {
        p(g, 'M38 108 Q60 138 82 108 Q80 96 60 96 Q40 96 38 108 Z', shade(c, -0.18));
      } else {
        p(g, 'M47 148 L73 148 L70 160 L50 160 Z', shade(c, -0.18));
      }
      return g;
    case 'qa':
      p(g, TORSO, c);
      if (!back) {
        const s = shade(c, -0.22);
        for (const x of [49, 60, 71]) line(g, [x, 109, x, 167], s, 2.5);
        for (const y of [128, 146]) line(g, [40, y, 80, y], s, 2.5);
        stroke(g, TORSO, OUT, 3);
      }
      return g;
    default:
      p(g, TORSO, c);
      if (look.outfit === 'support' && !back) rect(g, 36, 162, 48, 7, 0, OUT);
      return g;
  }
}

/** Детали на груди — рисуются поверх шеи (воротник, галстук, бейдж). */
function chestG(look: Look): Graphics {
  const g = new Graphics();
  const c = look.color;
  switch (look.outfit) {
    case 'support':
      p(g, 'M50 104 L60 114 L70 104 Z', 0xffffff);
      break;
    case 'dev':
      p(g, 'M40 106 Q60 120 80 106 Q76 96 60 96 Q44 96 40 106 Z', shade(c, -0.18));
      line(g, [55, 112, 55, 126], 0xffffff, 2.5);
      line(g, [65, 112, 65, 126], 0xffffff, 2.5);
      break;
    case 'qa':
      p(g, 'M50 104 L60 114 L70 104 Z', c);
      break;
    case 'analyst':
      p(g, 'M50 104 L60 112 L70 104 Z', 0xf4f4f8);
      p(g, 'M57 110 L63 110 L65 138 L60 145 L55 138 Z', 0xe8173a);
      circle(g, 60, 150, 1.8, { fill: 0xffd23f, line: 1.5 });
      circle(g, 60, 160, 1.8, { fill: 0xffd23f, line: 1.5 });
      break;
    case 'sysadmin':
      stroke(g, 'M51 105 Q60 128 69 105', 0xe8173a, 2.5);
      rect(g, 53, 126, 14, 17, 2, { fill: 0xffffff, line: 2.5 });
      rect(g, 56, 130, 8, 5, 0, { fill: 0x4fb3ff, line: 0 });
      break;
    case 'manager':
      p(g, 'M50 104 L60 132 L70 104 Z', 0xffffff);
      p(g, 'M58 110 L62 110 L63 126 L60 131 L57 126 Z', { fill: 0xffd23f, line: 2 });
      rect(g, 64, 118, 15, 8, 1.5, { fill: 0xffd23f, line: 2 });
      circle(g, 60, 146, 2, { fill: OUT, line: 0 });
      circle(g, 60, 158, 2, { fill: OUT, line: 0 });
      break;
    case 'director':
      p(g, 'M53 102 L60 114 L67 102 Z', look.skin);
      circle(g, 60, 112, 2.4, { fill: 0xffd23f, line: 1.5 });
      break;
  }
  return g;
}

function neckG(look: Look): Graphics {
  const g = new Graphics();
  rect(g, look.outfit === 'director' ? 53 : 52, 88, look.outfit === 'director' ? 14 : 16, 18, 5, look.skin);
  return g;
}

/** Задняя часть причёски — за телом (вид спереди). */
function backHairG(look: Look): Graphics | null {
  const g = new Graphics();
  const c = look.hairColor;
  switch (look.hair) {
    case 3:
      p(g, 'M82 50 Q104 58 98 98 Q90 84 82 70 Z', c);
      return g;
    case 4:
      p(g, 'M28 66 Q26 102 38 106 L82 106 Q94 102 92 66 Z', c);
      return g;
    case 5:
      p(g, 'M28 68 Q24 126 40 130 L80 130 Q96 126 92 68 Z', c);
      return g;
    case 6:
      circle(g, 60, 28, 13, c);
      return g;
    case 9:
      circle(g, 60, 54, 38, c);
      return g;
    case 10:
      rect(g, 24, 62, 12, 50, 6, c);
      rect(g, 84, 62, 12, 50, 6, c);
      line(g, [25, 78, 35, 76], OUT, 2);
      line(g, [25, 92, 35, 90], OUT, 2);
      line(g, [85, 76, 95, 78], OUT, 2);
      line(g, [85, 90, 95, 92], OUT, 2);
      return g;
    default:
      return null;
  }
}

function frontHair(g: Graphics, look: Look): void {
  const c = look.hairColor;
  switch (look.hair) {
    case 0:
      p(g, 'M30 64 Q28 34 60 33 Q92 34 90 64 Q84 48 70 50 Q58 44 46 50 Q36 52 30 64 Z', c);
      break;
    case 1:
      p(g, 'M31 60 Q32 35 60 34 Q88 35 89 60 Q76 50 60 50 Q44 50 31 60 Z', c);
      break;
    case 2:
      for (const [x, y, r] of [
        [35, 58, 9],
        [85, 58, 9],
        [40, 44, 10],
        [80, 44, 10],
        [52, 36, 11],
        [68, 36, 11],
      ])
        circle(g, x, y, r, c);
      break;
    case 3:
      p(g, 'M30 64 Q30 34 60 34 Q90 34 90 64 Q80 46 60 46 Q40 46 30 64 Z', c);
      break;
    case 4:
      p(g, 'M29 72 Q27 32 60 32 Q93 32 91 72 L85 72 Q85 50 60 52 Q35 50 35 72 Z', c);
      break;
    case 5:
      p(g, 'M31 66 Q29 32 60 32 Q91 32 89 66 Q82 46 64 48 Q48 48 38 60 Z', c);
      break;
    case 6:
      p(g, 'M30 64 Q30 36 60 36 Q90 36 90 64 Q80 48 60 48 Q40 48 30 64 Z', c);
      break;
    case 7:
      p(g, 'M30.5 72 Q29 56 35 48 L40 66 Z', c);
      p(g, 'M89.5 72 Q91 56 85 48 L80 66 Z', c);
      ellipse(g, 52, 44, 8, 4, { fill: 0xffffff, alpha: 0.5, line: 0 });
      break;
    case 8:
      p(g, 'M30 66 Q26 32 60 32 Q94 32 90 62 Q70 40 40 58 Q36 60 30 66 Z', c);
      break;
    case 9:
      p(g, 'M33 60 Q36 42 60 42 Q84 42 87 60 Q74 52 60 54 Q46 52 33 60 Z', c);
      break;
    case 10:
      p(g, 'M30 64 Q30 34 60 34 Q90 34 90 64 Q76 46 60 50 Q44 46 30 64 Z', c);
      break;
    default:
      p(g, 'M32 62 Q30 40 46 30 Q60 18 80 24 Q92 30 89 60 Q80 46 62 48 Q44 46 32 62 Z', c);
  }
}

function accFront(g: Graphics, look: Look): void {
  for (const a of look.acc) {
    switch (a) {
      case 'glasses':
        circle(g, 49, 70, 9, { fill: 0xffffff, alpha: 0.25 });
        circle(g, 71, 70, 9, { fill: 0xffffff, alpha: 0.25 });
        line(g, [58, 69, 62, 69]);
        break;
      case 'beard':
        p(g, 'M31 72 Q33 102 60 104 Q87 102 89 72 Q80 88 66 86 L54 86 Q40 88 31 72 Z', look.hairColor);
        stroke(g, 'M50 84 Q60 78 70 84', OUT, 2.5);
        break;
      case 'cap':
        p(g, 'M30 60 Q30 30 60 30 Q90 30 90 60 Z', 0xff7a45);
        p(g, 'M28 60 Q60 50 102 62 Q98 70 60 64 Q36 64 28 60 Z', 0xe0602c);
        break;
      case 'headphones':
        stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', OUT, 7);
        stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', 0x8b6cff, 3);
        rect(g, 19, 56, 13, 24, 6, 0x8b6cff);
        rect(g, 88, 56, 13, 24, 6, 0x8b6cff);
        break;
      case 'headset':
        stroke(g, 'M27 68 Q27 28 60 28 Q93 28 93 68', OUT, 5);
        rect(g, 22, 60, 10, 17, 4, OUT);
        rect(g, 88, 60, 10, 17, 4, OUT);
        stroke(g, 'M28 76 Q34 90 48 88', OUT, 3);
        circle(g, 49, 88, 3.5, OUT);
        break;
    }
  }
}

function accBack(g: Graphics, look: Look): void {
  for (const a of look.acc) {
    if (a === 'cap') {
      p(g, 'M30 62 Q30 30 60 30 Q90 30 90 62 Z', 0xff7a45);
      rect(g, 50, 58, 20, 6, 3, 0xe0602c);
    } else if (a === 'headphones') {
      stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', OUT, 7);
      stroke(g, 'M27 68 Q27 24 60 24 Q93 24 93 68', 0x8b6cff, 3);
      rect(g, 19, 56, 13, 24, 6, 0x8b6cff);
      rect(g, 88, 56, 13, 24, 6, 0x8b6cff);
    } else if (a === 'headset') {
      stroke(g, 'M27 68 Q27 28 60 28 Q93 28 93 68', OUT, 5);
      rect(g, 22, 60, 10, 17, 4, OUT);
      rect(g, 88, 60, 10, 17, 4, OUT);
    }
  }
}

interface Rig {
  view: Container;
  legL: Container;
  legR: Container;
  bob: Container;
  armL: Container;
  armR: Container;
  torso: Container;
  head: Container;
  backHair: Container | null;
  eyes: Container | null;
  mouth: Graphics | null;
}

function wrap(g: Graphics, px: number, py: number): Container {
  const c = new Container();
  c.addChild(g);
  c.pivot.set(px, py);
  c.position.set(px, py);
  return c;
}

function buildFront(look: Look, withLegs: boolean): Rig {
  const view = new Container();
  const legL = wrap(legsG(look, 'L', false), 52, 166);
  const legR = wrap(legsG(look, 'R', false), 68, 166);
  if (withLegs) view.addChild(legL, legR);
  const bob = new Container();
  const bh = backHairG(look);
  const backHair = bh ? wrap(bh, 60, 98) : null;
  if (backHair) bob.addChild(backHair);
  const armL = wrap(armG(look, 'L'), 34, 114);
  const armR = wrap(armG(look, 'R'), 86, 114);
  const torso = wrap(torsoG(look, false), 60, 170);
  bob.addChild(armL, armR, torso, wrap(neckG(look), 60, 106), wrap(chestG(look), 60, 106));

  const headG = new Graphics();
  circle(headG, 60, 66, 30, look.skin);
  frontHair(headG, look);
  if (look.lashes) {
    line(headG, [45, 64, 42, 60], OUT, 2);
    line(headG, [75, 64, 78, 60], OUT, 2);
  }
  ellipse(headG, 42, 79, 4.5, 4.5, { fill: 0xff8a8a, alpha: 0.5, line: 0 });
  ellipse(headG, 78, 79, 4.5, 4.5, { fill: 0xff8a8a, alpha: 0.5, line: 0 });
  const head = wrap(headG, 60, 98);

  const eyesG = new Graphics();
  ellipse(eyesG, 49, 70, 4, 5.5, { fill: OUT, line: 0 });
  ellipse(eyesG, 71, 70, 4, 5.5, { fill: OUT, line: 0 });
  circle(eyesG, 50.5, 67.5, 1.5, { fill: 0xffffff, line: 0 });
  circle(eyesG, 72.5, 67.5, 1.5, { fill: 0xffffff, line: 0 });
  const eyes = wrap(eyesG, 60, 70);
  head.addChild(eyes);

  const mouth = new Graphics();
  if (look.outfit === 'director') p(mouth, 'M55 83 Q60 88 65 83 Q60 85 55 83 Z', { fill: 0xe8173a, line: 0 });
  else stroke(mouth, 'M55 84 Q60 89 65 84', OUT, 2.5);
  mouth.pivot.set(60, 84);
  mouth.position.set(60, 84);
  head.addChild(mouth);

  const acc = new Graphics();
  accFront(acc, look);
  head.addChild(acc);
  bob.addChild(head);
  view.addChild(bob);
  return { view, legL, legR, bob, armL, armR, torso, head, backHair, eyes, mouth };
}

function buildBack(look: Look): Rig {
  const view = new Container();
  const legL = wrap(legsG(look, 'L', true), 52, 166);
  const legR = wrap(legsG(look, 'R', true), 68, 166);
  view.addChild(legL, legR);
  const bob = new Container();
  const armL = wrap(armG(look, 'L'), 34, 114);
  const armR = wrap(armG(look, 'R'), 86, 114);
  const torso = wrap(torsoG(look, true), 60, 170);
  bob.addChild(armL, armR, torso, wrap(neckG(look), 60, 106));

  const g = new Graphics();
  const c = look.hairColor;
  circle(g, 29, 72, 5.5, look.skin);
  circle(g, 60, 66, 30, look.skin);
  if (look.hair === 7) {
    p(g, 'M30 74 Q30 90 60 96 Q90 90 90 74 Q76 84 60 84 Q44 84 30 74 Z', c);
    ellipse(g, 60, 46, 10, 5, { fill: 0xffffff, alpha: 0.45, line: 0 });
  } else if (look.hair === 9) {
    circle(g, 60, 56, 38, c);
  } else {
    if (look.hair === 6) circle(g, 60, 28, 13, c);
    p(g, 'M28 70 Q24 30 60 30 Q96 30 92 70 Q90 94 60 97 Q32 94 28 70 Z', c);
    if (look.hair === 5) p(g, 'M28 68 Q24 126 40 130 L80 130 Q96 126 92 68 Z', c);
    if (look.hair === 4) p(g, 'M28 66 Q26 102 38 106 L82 106 Q94 102 92 66 Z', c);
    if (look.hair === 3) p(g, 'M52 88 Q60 128 68 88 Z', c);
    if (look.hair === 10) {
      rect(g, 40, 80, 11, 44, 5, c);
      rect(g, 69, 80, 11, 44, 5, c);
    }
    if (look.hair === 2) for (const x of [40, 60, 80]) circle(g, x, 40, 11, c);
    stroke(g, 'M50 48 Q58 42 66 48', shade(c, 0.25), 2.5);
  }
  accBack(g, look);
  const head = wrap(g, 60, 98);
  bob.addChild(head);
  view.addChild(bob);
  return { view, legL, legR, bob, armL, armR, torso, head, backHair: null, eyes: null, mouth: null };
}

/** drink — стоит с кружкой и отпивает; game — сидит с геймпадом; repair — руки заняты (чинит, моет руки). */
export type Mode = 'idle' | 'walk' | 'sit' | 'repair' | 'talk' | 'drink' | 'game';
/** Направление: 0 — вправо-вниз, 1 — влево-вниз, 2 — вправо-вверх, 3 — влево-вверх. */
export type Dir = 0 | 1 | 2 | 3;

const DEG = Math.PI / 180;

/** Персонаж: контейнер с ногами в (0,0) мира. Масштаб задаёт владелец. */
export class Character {
  readonly root = new Container();
  mode: Mode = 'idle';
  /** Скорость анимации (на «Аврале» печатают быстрее). */
  speed = 1;
  private front: Rig;
  private back: Rig | null = null;
  private readonly shadow = new Graphics();
  private dir: Dir = 0;
  private phase: number;
  private breath: number;
  private blinkIn: number;

  constructor(
    readonly look: Look,
    private readonly rng: () => number,
    readonly seated = false,
  ) {
    this.phase = rng() * Math.PI * 2;
    this.breath = rng() * Math.PI * 2;
    this.blinkIn = 1 + rng() * 4;
    this.root.pivot.set(60, 204);
    if (!seated) {
      ellipse(this.shadow, 60, 208, 28, 6, { fill: OUT, alpha: 0.2, line: 0 });
      this.root.addChild(this.shadow);
    }
    this.front = buildFront(look, !seated);
    this.root.addChild(this.front.view);
    if (seated) this.mode = 'sit';
  }

  setDir(dir: Dir): void {
    if (dir === this.dir) return;
    this.dir = dir;
    const backView = dir >= 2;
    if (backView && !this.back) {
      this.back = buildBack(this.look);
      this.root.addChild(this.back.view);
    }
    this.front.view.visible = !backView;
    if (this.back) this.back.view.visible = backView;
    // зеркалим влево
    const flip = dir === 1 || dir === 3 ? -1 : 1;
    this.front.view.scale.x = flip;
    this.front.view.x = flip < 0 ? 120 : 0;
    if (this.back) {
      this.back.view.scale.x = flip;
      this.back.view.x = flip < 0 ? 120 : 0;
    }
  }

  private mugC: Container | null = null;
  private armIdx = -1;
  private padG: Graphics | null = null;

  /** Что в руках: кружка (пьёт кофе), геймпад (играет) или ничего. */
  hold(prop: 'mug' | 'pad' | null): void {
    if (prop === 'mug' && !this.mugC) {
      const c = new Container();
      const g = new Graphics();
      rect(g, 80, 146, 14, 15, 3, 0xffffff);
      p(g, 'M94 150 Q101 153 94 157', { fill: 0xffffff, line: 2.5 });
      ellipse(g, 87, 146, 7, 2.5, { fill: 0x7a4a22, line: 2 });
      c.addChild(g);
      c.pivot.set(86, 158);
      c.position.set(86, 158);
      this.front.armR.addChild(c);
      this.mugC = c;
    }
    if (prop === 'pad' && !this.padG) {
      const g = new Graphics();
      rect(g, 44, 140, 32, 13, 6, 0x2f3344);
      circle(g, 52, 146, 2.5, { fill: 0x4fb3ff, line: 0 });
      circle(g, 68, 146, 2.5, { fill: 0xe8173a, line: 0 });
      this.front.bob.addChild(g);
      this.padG = g;
    }
    if (this.mugC) this.mugC.visible = prop === 'mug';
    if (this.padG) this.padG.visible = prop === 'pad';
    const bob = this.front.bob;
    const arm = this.front.armR;
    if (this.armIdx < 0) this.armIdx = bob.getChildIndex(arm);
    bob.removeChild(arm);
    // с кружкой рука поверх головы: кружка подносится ко рту перед лицом, а не за затылком
    if (prop === 'mug') bob.addChild(arm);
    else bob.addChildAt(arm, Math.min(this.armIdx, bob.children.length));
  }

  /** Спрятать свои руки (за столом их рисует рабочее место — руки на клавиатуре). */
  hideArms(): void {
    this.front.armL.visible = false;
    this.front.armR.visible = false;
  }

  /** Повернуть лицо на 3/4: глаза и рот сдвигаются в сторону взгляда (px в координатах рисунка). */
  turnFace(px: number): void {
    for (const c of [this.front.eyes, this.front.mouth]) if (c) c.x += px;
  }

  private rig(): Rig {
    return this.dir >= 2 && this.back ? this.back : this.front;
  }

  update(dt: number): void {
    const r = this.rig();
    this.breath += dt * ((Math.PI * 2) / 3.4);
    const b = (1 - Math.cos(this.breath)) / 2; // 0..1 мягко
    // моргание
    this.blinkIn -= dt;
    if (r.eyes) {
      if (this.blinkIn < 0) {
        r.eyes.scale.y = 0.1;
        if (this.blinkIn < -0.12) this.blinkIn = 2.5 + this.rng() * 3.5;
      } else r.eyes.scale.y = 1;
    }

    const reset = (): void => {
      r.legL.rotation = r.legR.rotation = 0;
      r.legL.y = r.legL.pivot.y;
      r.legR.y = r.legR.pivot.y;
      r.armL.rotation = r.armR.rotation = 0;
      r.bob.y = 0;
      this.front.view.rotation = 0;
    };

    if (this.mode === 'walk') {
      this.phase += dt * ((Math.PI * 2) / 0.9) * this.speed;
      const ph = this.phase;
      const lift = (x: number): number => Math.max(0, Math.sin(x));
      r.legL.y = r.legL.pivot.y - 6 * lift(ph);
      r.legR.y = r.legR.pivot.y - 6 * lift(ph + Math.PI);
      r.legL.rotation = 5 * DEG * Math.cos(ph);
      r.legR.rotation = 5 * DEG * Math.cos(ph + Math.PI);
      r.armL.rotation = 14 * DEG * Math.sin(ph + Math.PI);
      r.armR.rotation = 14 * DEG * Math.sin(ph);
      r.bob.y = -3 * ((1 - Math.cos(2 * ph)) / 2);
      r.head.rotation = 2.5 * DEG * Math.sin(ph - 0.6);
      r.head.y = r.head.pivot.y;
      r.torso.scale.y = 1;
      this.shadow.scale.x = 1 - 0.1 * ((1 - Math.cos(2 * ph)) / 2);
      this.root.rotation = 1.5 * DEG * Math.sin(ph);
    } else {
      reset();
      this.root.rotation = 0;
      this.shadow.scale.x = 1;
      r.torso.scale.y = 1 + 0.025 * b;
      r.head.y = r.head.pivot.y - 2.3 * b;
      r.head.rotation = 1.5 * DEG * b;
      if (this.mode === 'sit') {
        this.phase += dt * 2.4 * this.speed;
        r.head.rotation = 3 * DEG * Math.sin(this.phase * 0.4);
      } else if (this.mode === 'repair') {
        this.phase += dt * 7 * this.speed;
        r.armR.rotation = -40 * DEG + 18 * DEG * Math.sin(this.phase);
        r.armL.rotation = -10 * DEG + 6 * DEG * Math.sin(this.phase * 0.5);
      } else if (this.mode === 'drink') {
        // держит кружку у груди, раз в несколько секунд подносит ко рту
        this.phase += dt;
        const cyc = this.phase % 5.2;
        const sip = cyc < 1.5 ? Math.sin((cyc / 1.5) * Math.PI) : 0;
        r.armR.rotation = 0.95 + 1.35 * sip;
        r.head.rotation = -6 * DEG * sip;
        if (this.mugC) this.mugC.rotation = -r.armR.rotation + 0.35 * sip;
      } else if (this.mode === 'game') {
        // жмёт кнопки геймпада
        this.phase += dt * 9 * this.speed;
        r.armR.rotation = 0.95 + 0.07 * Math.sin(this.phase);
        r.armL.rotation = -0.95 - 0.07 * Math.sin(this.phase * 1.3);
        r.head.rotation = 2 * DEG * Math.sin(this.phase * 0.2);
      } else if (this.mode === 'talk') {
        this.phase += dt * 10;
        if (r.mouth) r.mouth.scale.y = 1 + 0.4 * Math.max(0, Math.sin(this.phase));
        r.armR.rotation = -20 * DEG * (0.5 + 0.5 * Math.sin(this.phase * 0.3));
      }
    }
    if (r.backHair) {
      r.backHair.rotation = r.head.rotation;
      r.backHair.y = r.head.y;
    }
  }
}
