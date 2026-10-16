import { Container, Graphics, Text } from 'pixi.js';
import { formatNumber } from '../game/format';
import type { Game, Payout } from '../game/game';
import { DESKS } from '../game/state';
import {
  DESK_SLOTS,
  GAP,
  ROOMS,
  ROOM_H,
  ROOM_W,
  WALL_H,
  floorBounds,
  isInsideRoom,
  roomCenter,
  roomPoint,
  type RoomDef,
} from './layout';

// Временная графика из фигур. На этапе арта каждую функцию draw* заменит спрайт того же размера.

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd1a17a];
const SHIRT = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6, 0x14b8a6];

function drawRoom(def: RoomDef, locked: boolean): Container {
  const c = new Container();
  const hw = ROOM_W / 2;
  const hh = ROOM_H / 2;

  const walls = new Graphics()
    // левая задняя стена
    .poly([-hw, 0, 0, -hh, 0, -hh - WALL_H, -hw, -WALL_H])
    .fill({ color: def.wall })
    // правая задняя стена
    .poly([0, -hh, hw, 0, hw, -WALL_H, 0, -hh - WALL_H])
    .fill({ color: def.wall, alpha: 0.85 });

  const floor = new Graphics()
    .poly([0, -hh, hw, 0, 0, hh, -hw, 0])
    .fill({ color: def.floor })
    .stroke({ color: 0x2a2f40, width: 3, alpha: 0.6 });

  const label = new Text({
    text: def.name,
    style: { fill: '#ffffff', fontSize: 20, fontWeight: '700', dropShadow: { color: '#000000', alpha: 0.35, distance: 2, blur: 2 } },
  });
  label.anchor.set(0.5);
  label.position.set(0, hh - 30);

  c.addChild(walls, floor, label);

  if (locked) {
    const shade = new Graphics().poly([0, -hh, hw, 0, 0, hh, -hw, 0]).fill({ color: 0x1e2230, alpha: 0.55 });
    const soon = new Text({ text: 'Скоро', style: { fill: '#c9cede', fontSize: 16 } });
    soon.anchor.set(0.5);
    soon.position.set(0, -6);
    c.addChild(shade, soon);
  }
  return c;
}

/** Стол-коробка в изометрии. Точка (0,0) — передний нижний угол на полу. */
function drawDesk(): Graphics {
  const top = -22; // высота столешницы
  const hw = 38;
  const hh = 19;
  const legs = 16;
  return (
    new Graphics()
      // левая боковина
      .poly([-hw, top, 0, top + hh, 0, top + hh + legs, -hw, top + legs])
      .fill({ color: 0x8b5e3c })
      // правая боковина
      .poly([0, top + hh, hw, top, hw, top + legs, 0, top + hh + legs])
      .fill({ color: 0x6f4a2f })
      // столешница
      .poly([0, top - hh, hw, top, 0, top + hh, -hw, top])
      .fill({ color: 0xc8925f })
      // монитор слева, чтобы не закрывать лицо
      .rect(-30, top - 30, 22, 16)
      .fill({ color: 0x222633 })
      .rect(-28, top - 28, 18, 12)
      .fill({ color: 0x7dd3fc })
  );
}

function drawPerson(seed: number): Container {
  const p = new Container();
  const body = new Graphics().roundRect(-12, -30, 24, 32, 9).fill({ color: SHIRT[seed % SHIRT.length] });
  const head = new Graphics().circle(0, -40, 10).fill({ color: SKIN[(seed * 3) % SKIN.length] });
  const hair = new Graphics().ellipse(0, -47, 10, 5).fill({ color: 0x3b2a1f });
  p.addChild(body, head, hair);
  return p;
}

class DeskView {
  readonly container = new Container();
  private readonly person: Container;
  private readonly barFill = new Graphics();
  private readonly levelText: Text;
  private readonly phase: number;

  constructor(seed: number) {
    this.phase = seed * 1.7;
    this.person = drawPerson(seed);
    this.person.position.set(6, -48);
    const desk = drawDesk();

    const barBg = new Graphics().roundRect(-26, -128, 52, 7, 3.5).fill({ color: 0x1e2230, alpha: 0.75 });
    this.levelText = new Text({ text: '', style: { fill: '#ffffff', fontSize: 13, fontWeight: '700' } });
    this.levelText.anchor.set(0.5, 1);
    this.levelText.position.set(0, -132);

    this.container.addChild(this.person, desk, barBg, this.barFill, this.levelText);
  }

  update(level: number, progress: number, time: number): void {
    this.levelText.text = `ур. ${level}`;
    this.barFill
      .clear()
      .roundRect(-26, -128, 52 * Math.min(1, progress), 7, 3.5)
      .fill({ color: 0x4ade80 });
    // сотрудник печатает: лёгкое покачивание
    this.person.y = -48 + Math.sin(time * 9 + this.phase) * 1.2;
  }
}

interface Popup {
  text: Text;
  age: number;
}

export interface RoomHit {
  def: RoomDef;
  center: { x: number; y: number };
}

export class OfficeView {
  readonly container = new Container();
  private readonly desks = new Map<string, DeskView>();
  private readonly deskLayer: Container[] = [];
  private readonly popups: Popup[] = [];
  private readonly popupLayer = new Container();
  private time = 0;

  constructor(private readonly game: Game) {
    const f = floorBounds();
    const base = new Graphics()
      .poly([f.cx, f.cy - f.hh, f.cx + f.hw, f.cy, f.cx, f.cy + f.hh, f.cx - f.hw, f.cy])
      .fill({ color: 0x3a3f52 });
    this.container.addChild(base);

    // Комнаты рисуем от дальних к ближним, чтобы ближние перекрывали дальние.
    const ordered = [...ROOMS].sort((a, b) => a.col + a.row - (b.col + b.row));
    for (const def of ordered) {
      const locked = !(def.kind === 'dept' && def.dept === 0);
      const room = drawRoom(def, locked);
      const c = roomCenter(def.col, def.row);
      room.position.set(c.x, c.y);
      this.container.addChild(room);

      if (def.kind === 'dept' && def.dept !== undefined) {
        const layer = new Container();
        layer.sortableChildren = true;
        layer.position.set(c.x, c.y);
        this.container.addChild(layer);
        this.deskLayer[def.dept] = layer;
      }
    }
    this.container.addChild(this.popupLayer);
    this.syncDesks();
  }

  /** Границы офиса для камеры (в координатах офиса). */
  bounds(): { x: number; y: number; width: number; height: number } {
    const f = floorBounds();
    return { x: f.cx - f.hw, y: f.cy - f.hh - WALL_H - 20, width: f.hw * 2, height: f.hh * 2 + WALL_H + 20 + GAP / 4 };
  }

  roomAt(x: number, y: number): RoomHit | undefined {
    const def = ROOMS.find((r) => isInsideRoom(r, x, y));
    return def ? { def, center: roomCenter(def.col, def.row) } : undefined;
  }

  /** Создаёт столы для нанятых сотрудников (при найме стол появляется). */
  syncDesks(): void {
    for (let d = 0; d < this.deskLayer.length; d++) {
      const layer = this.deskLayer[d];
      if (!layer) continue;
      for (let k = 0; k < DESKS; k++) {
        const key = `${d}:${k}`;
        if (!this.game.isHired(d, k) || this.desks.has(key)) continue;
        const view = new DeskView(d * DESKS + k);
        const slot = DESK_SLOTS[k];
        const p = roomPoint(slot.u, slot.v);
        view.container.position.set(p.x, p.y);
        // ближние столы поверх дальних
        view.container.zIndex = p.y;
        layer.addChild(view.container);
        this.desks.set(key, view);
      }
    }
  }

  update(dt: number, payouts: Payout[]): void {
    this.time += dt;
    for (const [key, view] of this.desks) {
      const [d, k] = key.split(':').map(Number);
      view.update(this.game.level(d, k), this.game.progress(d, k), this.time);
    }
    for (const p of payouts) this.spawnPopup(p);
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.age += dt;
      pop.text.y -= dt * 40;
      pop.text.alpha = Math.max(0, 1 - pop.age / 1.2);
      if (pop.age >= 1.2) {
        pop.text.destroy();
        this.popups.splice(i, 1);
      }
    }
  }

  private spawnPopup(p: Payout): void {
    const layer = this.deskLayer[p.dept];
    if (!layer) return;
    const slot = DESK_SLOTS[p.desk];
    const local = roomPoint(slot.u, slot.v);
    const text = new Text({
      text: `+${formatNumber(p.amount)}`,
      style: { fill: '#ffd166', fontSize: 18, fontWeight: '800', stroke: { color: '#3a2a00', width: 3 } },
    });
    text.anchor.set(0.5);
    text.position.set(layer.x + local.x, layer.y + local.y - 150);
    this.popupLayer.addChild(text);
    this.popups.push({ text, age: 0 });
  }
}
