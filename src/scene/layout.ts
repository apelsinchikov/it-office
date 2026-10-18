// Геометрия офиса: 3×3 комнаты, камера «прямо» — 3/4 спереди, наклон 47° (решение от 18.10.2026).
// Координаты плана (a, b): комната (col, row) — квадрат 1×1 с центром (col·P, row·P); a — вправо, b — к камере.
// Мир (экран): x = a · ROOM_W, y = b · ROOM_D. Высоты стен и мебели — в пикселях экрана.

/** Наклон камеры: пол сжат по вертикали на sin, высоты — на cos. */
export const TILT = (47 * Math.PI) / 180;
export const FY = Math.sin(TILT);
/** Во сколько раз высоты ниже, чем были в изометрии 30°. */
export const HK = Math.cos(TILT) / Math.cos(Math.PI / 6);

export const ROOM_W = 420;
/** Глубина комнаты на экране. */
export const ROOM_D = Math.round(ROOM_W * FY);
/** Старое имя: высота комнаты на экране. */
export const ROOM_H = ROOM_D;
/** Коридор между кабинетами: 90 на ширину комнаты 340 (как на схеме). */
export const GAP = Math.round((ROOM_W * 90) / 340);
/** Высота стены кабинета на экране. */
export const WALL_H = Math.round(34 * HK);
/** Высота стены этажа. */
export const OUTER_WALL_H = Math.round(70 * HK);
/** Шаг комнат в координатах плана: комната 1 + коридор. */
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

// Номера отделов идут в порядке открытия: поддержка → разработка → тестирование → аналитики → сисадмины.
// Раскладка от 18.10: дальний ряд — туалет, отдых, директор; ближний — тестирование, разработка, поддержка.
export const ROOMS: RoomDef[] = [
  { id: 'toilet', kind: 'toilet', col: 0, row: 0 },
  { id: 'rest', kind: 'rest', col: 1, row: 0 },
  { id: 'director', kind: 'director', col: 2, row: 0 },
  { id: 'sysadmins', kind: 'dept', dept: 4, col: 0, row: 1 },
  { id: 'hall', kind: 'hall', col: 1, row: 1 },
  { id: 'analysts', kind: 'dept', dept: 3, col: 2, row: 1 },
  { id: 'qa', kind: 'dept', dept: 2, col: 0, row: 2 },
  { id: 'dev', kind: 'dept', dept: 1, col: 1, row: 2 },
  { id: 'support', kind: 'dept', dept: 0, col: 2, row: 2 },
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
  return { x: a * ROOM_W, y: b * ROOM_D };
}

export function worldToIso(x: number, y: number): { a: number; b: number } {
  return { a: x / ROOM_W, b: y / ROOM_D };
}

/** Центр комнаты (col,row) в координатах мира. */
export function roomCenter(col: number, row: number): Pt {
  return isoToWorld(col * P, row * P);
}

/** Точка внутри комнаты относительно её центра: u — слева направо, v — от дальней стены к камере, оба 0…1. */
export function roomPoint(u: number, v: number): Pt {
  return { x: (u - 0.5) * ROOM_W, y: (v - 0.5) * ROOM_D };
}

/** Точка комнаты в мире. */
export function roomWorld(def: RoomDef, u: number, v: number): Pt {
  const c = roomCenter(def.col, def.row);
  const o = roomPoint(u, v);
  return { x: c.x + o.x, y: c.y + o.y };
}

/** Прямоугольник комнаты в мире. */
export function roomRect(def: RoomDef): { x0: number; y0: number; x1: number; y1: number } {
  const c = roomCenter(def.col, def.row);
  return { x0: c.x - ROOM_W / 2, y0: c.y - ROOM_D / 2, x1: c.x + ROOM_W / 2, y1: c.y + ROOM_D / 2 };
}

/** Места под 6 столов: 2 ряда по 3. Первый нанятый — в центре ближнего ряда. */
export const DESK_SLOTS: { u: number; v: number }[] = [
  { u: 0.5, v: 0.86 },
  { u: 0.2, v: 0.86 },
  { u: 0.8, v: 0.86 },
  { u: 0.5, v: 0.46 },
  { u: 0.2, v: 0.46 },
  { u: 0.8, v: 0.46 },
];

/** Пол этажа: прямоугольник под комнатами (коридора по краю нет). */
export function floorBounds(): { x0: number; y0: number; x1: number; y1: number; min: number; max: number } {
  const min = -0.5;
  const max = 2 * P + 0.5;
  const a = isoToWorld(min, min);
  const b = isoToWorld(max, max);
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y, min, max };
}

export function isInsideRoom(def: RoomDef, x: number, y: number, margin = 0): boolean {
  const { a, b } = worldToIso(x, y);
  return Math.abs(a - def.col * P) <= 0.5 + margin && Math.abs(b - def.row * P) <= 0.5 + margin;
}

export function roomAt(x: number, y: number): RoomDef | undefined {
  return ROOMS.find((r) => isInsideRoom(r, x, y));
}

/** Комната упирается в стену этажа: слева, справа, сзади. */
export function touchesOuter(def: RoomDef): { left: boolean; right: boolean; back: boolean } {
  return { left: def.col === 0, right: def.col === 2, back: def.row === 0 };
}
