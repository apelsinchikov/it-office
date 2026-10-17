// Рисование в стиле Б: заливка + тёмный контур 3px со скруглёнными углами.
// Формы берутся прямо из рисунков на холсте (те же координаты и пути SVG).

import { Graphics } from 'pixi.js';

export const OUT = 0x262338;

/** Разбирает путь SVG из команд M, L, Q, Z (абсолютные координаты) и рисует его в g. */
export function path(g: Graphics, d: string): Graphics {
  const tok = d.match(/[MLQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  let i = 0;
  let cmd = '';
  const n = (): number => Number(tok[i++]);
  while (i < tok.length) {
    const t = tok[i];
    if (/[MLQZ]/i.test(t)) {
      cmd = t.toUpperCase();
      i++;
      if (cmd === 'Z') {
        g.closePath();
        continue;
      }
    }
    switch (cmd) {
      case 'M':
        g.moveTo(n(), n());
        cmd = 'L'; // как в SVG: пары после M — это L
        break;
      case 'L':
        g.lineTo(n(), n());
        break;
      case 'Q': {
        const cx = n();
        const cy = n();
        g.quadraticCurveTo(cx, cy, n(), n());
        break;
      }
      default:
        i++;
    }
  }
  return g;
}

export interface Fill {
  fill: number;
  alpha?: number;
  /** Толщина контура, 0 — без контура. */
  line?: number;
  lineColor?: number;
}

function finish(g: Graphics, f: Fill): Graphics {
  g.fill({ color: f.fill, alpha: f.alpha ?? 1 });
  const w = f.line ?? 3;
  if (w > 0) g.stroke({ color: f.lineColor ?? OUT, width: w, join: 'round', cap: 'round' });
  return g;
}

export function p(g: Graphics, d: string, f: Fill | number): Graphics {
  path(g, d);
  return finish(g, typeof f === 'number' ? { fill: f } : f);
}

export function poly(g: Graphics, pts: number[], f: Fill | number): Graphics {
  g.poly(pts, true);
  return finish(g, typeof f === 'number' ? { fill: f } : f);
}

export function rect(g: Graphics, x: number, y: number, w: number, h: number, r: number, f: Fill | number): Graphics {
  if (r > 0) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
  return finish(g, typeof f === 'number' ? { fill: f } : f);
}

export function circle(g: Graphics, x: number, y: number, r: number, f: Fill | number): Graphics {
  g.circle(x, y, r);
  return finish(g, typeof f === 'number' ? { fill: f } : f);
}

export function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, f: Fill | number): Graphics {
  g.ellipse(x, y, rx, ry);
  return finish(g, typeof f === 'number' ? { fill: f } : f);
}

/** Линия без заливки. */
export function line(g: Graphics, pts: number[], color = OUT, width = 3): Graphics {
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.stroke({ color, width, join: 'round', cap: 'round' });
  return g;
}

/** Кривая без заливки (путь SVG). */
export function stroke(g: Graphics, d: string, color = OUT, width = 3): Graphics {
  path(g, d);
  g.stroke({ color, width, join: 'round', cap: 'round' });
  return g;
}

/** Изометрическая коробка: центр пола (cx, cy), полуширина hw (полувысота ромба hw/2), высота h. */
export function isoBox(g: Graphics, cx: number, cy: number, hw: number, h: number, top: number, left: number, right: number, w = 3): Graphics {
  const hh = hw / 2;
  poly(g, [cx - hw, cy - h, cx, cy + hh - h, cx, cy + hh, cx - hw, cy], { fill: left, line: w });
  poly(g, [cx, cy + hh - h, cx + hw, cy - h, cx + hw, cy, cx, cy + hh], { fill: right, line: w });
  poly(g, [cx, cy - hh - h, cx + hw, cy - h, cx, cy + hh - h, cx - hw, cy - h], { fill: top, line: w });
  return g;
}

/** Осветлить / затемнить цвет: k > 0 светлее, k < 0 темнее. */
export function shade(color: number, k: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const f = (c: number): number => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
