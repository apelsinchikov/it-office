// Геометрия офиса: 3×3 комнаты вокруг холла, изометрия 2:1.

export const ROOM_W = 420; // ширина ромба комнаты на экране
export const ROOM_H = 210; // высота ромба комнаты
export const GAP = 70; // ширина коридора между комнатами
export const WALL_H = 34; // высота задних стен

export type RoomKind = 'dept' | 'director' | 'hall' | 'rest' | 'toilet';

export interface RoomDef {
  id: string;
  name: string;
  kind: RoomKind;
  /** Номер отдела для kind = 'dept'. */
  dept?: number;
  col: number;
  row: number;
  floor: number;
  wall: number;
}

// Номера отделов идут в порядке открытия: поддержка → разработка → тестирование → аналитики → сисадмины.
export const ROOMS: RoomDef[] = [
  { id: 'analysts', name: 'Аналитики', kind: 'dept', dept: 3, col: 0, row: 0, floor: 0x8fa9cf, wall: 0x5d7398 },
  { id: 'dev', name: 'Разработка', kind: 'dept', dept: 1, col: 1, row: 0, floor: 0x9cc48a, wall: 0x5f8a4f },
  { id: 'qa', name: 'Тестирование', kind: 'dept', dept: 2, col: 2, row: 0, floor: 0xe0c879, wall: 0xa68b3a },
  { id: 'support', name: 'Поддержка', kind: 'dept', dept: 0, col: 0, row: 1, floor: 0xd99a8f, wall: 0xa05a4f },
  { id: 'hall', name: 'Холл', kind: 'hall', col: 1, row: 1, floor: 0x9a9fb2, wall: 0x666b7d },
  { id: 'sysadmins', name: 'Сисадмины', kind: 'dept', dept: 4, col: 2, row: 1, floor: 0xb59ac4, wall: 0x7b5f8c },
  { id: 'director', name: 'Директор IT', kind: 'director', col: 0, row: 2, floor: 0xe3b36b, wall: 0xa87a33 },
  { id: 'rest', name: 'Зона отдыха', kind: 'rest', col: 1, row: 2, floor: 0x8ccaca, wall: 0x4f8f8f },
  { id: 'toilet', name: 'Туалет', kind: 'toilet', col: 2, row: 2, floor: 0xb8bcc8, wall: 0x7e8291 },
];

/** Центр комнаты (col,row) в координатах офиса. */
export function roomCenter(col: number, row: number): { x: number; y: number } {
  const sx = (ROOM_W + GAP) / 2;
  const sy = (ROOM_H + GAP / 2) / 2;
  return { x: (col - row) * sx, y: (col + row) * sy };
}

/** Точка внутри ромба комнаты: u — вдоль правого ребра, v — вдоль левого, обе 0..1. */
export function roomPoint(u: number, v: number): { x: number; y: number } {
  return { x: ((u - v) * ROOM_W) / 2, y: ((u + v) * ROOM_H) / 2 - ROOM_H / 2 };
}

/** Места под 6 столов: 2 ряда по 3, первый стол — ближний левый. */
export const DESK_SLOTS: { u: number; v: number }[] = [
  { u: 0.3, v: 0.72 },
  { u: 0.5, v: 0.72 },
  { u: 0.7, v: 0.72 },
  { u: 0.3, v: 0.4 },
  { u: 0.5, v: 0.4 },
  { u: 0.7, v: 0.4 },
];

/** Пол всего этажа: большой ромб под комнатами (это и есть коридоры). */
export function floorBounds(): { cx: number; cy: number; hw: number; hh: number } {
  const c = roomCenter(1, 1);
  return { cx: c.x, cy: c.y, hw: 1.5 * (ROOM_W + GAP), hh: 1.5 * (ROOM_H + GAP / 2) };
}

export function isInsideRoom(def: RoomDef, x: number, y: number): boolean {
  const c = roomCenter(def.col, def.row);
  return Math.abs(x - c.x) / (ROOM_W / 2) + Math.abs(y - c.y) / (ROOM_H / 2) <= 1;
}
