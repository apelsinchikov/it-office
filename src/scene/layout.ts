// Геометрия офиса: 3×3 комнаты вокруг холла, изометрия 2:1 (камера «с угла», решение от 19.10.2026).
// Коридоры между кабинетами — 100, по краю этажа коридора нет: стена кабинета у края и есть стена этажа.
// Изо-координаты (a, b): комната (col, row) — квадрат со стороной 1 с центром (col·P, row·P).
// Мир: x = (a − b) · ROOM_W/2, y = (a + b) · ROOM_H/2.

export const ROOM_W = 420;
export const ROOM_H = 210;
export const GAP = 100;
/** Высота стены этажа. */
export const OUTER_WALL_H = 70;
/** Низкий бортик по ближним краям кабинета. */
export const LEDGE_H = 9;
export const WALL_H = 34;
/** Шаг комнат в изо-координатах: комната 1 + коридор. */
export const P = (ROOM_W + GAP) / ROOM_W;

export type RoomKind = 'dept' | 'director' | 'hall' | 'rest' | 'toilet';

export interface RoomDef {
  id: 'analysts' | 'dev' | 'qa' | 'support' | 'hall' | 'sysadmins' | 'director' | 'rest' | 'toilet';
  kind: RoomKind;
  /** Номер отдела для kind = 'dept'. */
  dept?: number;
  col: number;
  row: number;
}

// Номера отделов — в порядке открытия: сисадмины → поддержка → аналитики → разработка → тестирование.
// Раскладка (row 0 — дальний край): туалет · отдых · директор / сисадмины · холл · аналитики / тестирование · разработка · поддержка.
export const ROOMS: RoomDef[] = [
  { id: 'toilet', kind: 'toilet', col: 0, row: 0 },
  { id: 'rest', kind: 'rest', col: 1, row: 0 },
  { id: 'director', kind: 'director', col: 2, row: 0 },
  { id: 'sysadmins', kind: 'dept', dept: 0, col: 0, row: 1 },
  { id: 'hall', kind: 'hall', col: 1, row: 1 },
  { id: 'analysts', kind: 'dept', dept: 2, col: 2, row: 1 },
  { id: 'qa', kind: 'dept', dept: 4, col: 0, row: 2 },
  { id: 'dev', kind: 'dept', dept: 3, col: 1, row: 2 },
  { id: 'support', kind: 'dept', dept: 1, col: 2, row: 2 },
];

export function roomById(id: RoomDef['id']): RoomDef {
  return ROOMS.find((r) => r.id === id)!;
}

export function deptRoom(d: number): RoomDef {
  return ROOMS.find((r) => r.kind === 'dept' && r.dept === d)!;
}

export interface Pt {
  x: number;
  y: number;
}

export function isoToWorld(a: number, b: number): Pt {
  return { x: ((a - b) * ROOM_W) / 2, y: ((a + b) * ROOM_H) / 2 };
}

export function worldToIso(x: number, y: number): { a: number; b: number } {
  const s = (2 * x) / ROOM_W; // a − b
  const t = (2 * y) / ROOM_H; // a + b
  return { a: (s + t) / 2, b: (t - s) / 2 };
}

/** Центр комнаты (col,row) в координатах мира. */
export function roomCenter(col: number, row: number): Pt {
  return isoToWorld(col * P, row * P);
}

/** Точка внутри ромба комнаты относительно её центра: u, v от 0 до 1 (0,0 — дальний угол). */
export function roomPoint(u: number, v: number): Pt {
  return { x: ((u - v) * ROOM_W) / 2, y: ((u + v) * ROOM_H) / 2 - ROOM_H / 2 };
}

/** Точка комнаты в мире. */
export function roomWorld(def: RoomDef, u: number, v: number): Pt {
  const c = roomCenter(def.col, def.row);
  const o = roomPoint(u, v);
  return { x: c.x + o.x, y: c.y + o.y };
}

/**
 * Места под 6 столов: 2 ряда по 3 вдоль стены кабинета (u = const), сотрудники сидят лицом к камере.
 * Ряд идёт вниз-влево по экрану: монитор стоит слева от лица, поэтому соседний стол его не закрывает.
 * Первый нанятый — в центре ближнего ряда.
 */
export const DESK_SLOTS: { u: number; v: number }[] = [
  { u: 0.72, v: 0.5 },
  { u: 0.72, v: 0.2 },
  { u: 0.72, v: 0.8 },
  { u: 0.3, v: 0.5 },
  { u: 0.3, v: 0.2 },
  { u: 0.3, v: 0.8 },
];

/** Проход руководителя между рядами столов. */
export const AISLE_U = 0.51;

/** Пол этажа: ромб ровно по внешним краям крайних комнат (коридора по краю нет). */
export function floorBounds(): { cx: number; cy: number; hw: number; hh: number; min: number; max: number } {
  const min = -0.5;
  const max = 2 * P + 0.5;
  const c = isoToWorld(P, P);
  return { cx: c.x, cy: c.y, hw: ((max - min) * ROOM_W) / 2, hh: ((max - min) * ROOM_H) / 2, min, max };
}

/** Комната упирается в стену этажа: left — по краю a = min (col 0), right — по краю b = min (row 0). */
export function touchesOuter(def: RoomDef): { left: boolean; right: boolean } {
  return { left: def.col === 0, right: def.row === 0 };
}

export function isInsideRoom(def: RoomDef, x: number, y: number, margin = 0): boolean {
  const { a, b } = worldToIso(x, y);
  return Math.abs(a - def.col * P) <= 0.5 + margin && Math.abs(b - def.row * P) <= 0.5 + margin;
}

export function roomAt(x: number, y: number): RoomDef | undefined {
  return ROOMS.find((r) => isInsideRoom(r, x, y));
}
