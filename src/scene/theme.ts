// Стили офисов четырёх компаний: пол, стены, ковры отделов, фон.

import type { CompanyStyle } from '../game/config';

export interface Theme {
  bg: number;
  /** Пол коридоров и холла. */
  floor: number;
  floorLine: number;
  /** Внешние стены. */
  wall: number;
  wallTop: number;
  window: number;
  /** Ковры: поддержка, разработка, тестирование, аналитики, сисадмины, директор. */
  carpets: number[];
  /** Пол зоны отдыха, холла и туалета. */
  rest: number;
  hall: number;
  toilet: number;
  /** Цвет полосок-подсветки (студия, космос) или 0. */
  neon: number;
  plant: number;
}

export const THEMES: Record<CompanyStyle, Theme> = {
  // Свой стартап: светлое дерево и серый ковёр
  startup: {
    bg: 0xfff1dc,
    floor: 0xe8c9a0,
    floorLine: 0xd6b488,
    wall: 0xf6ead6,
    wallTop: 0xe0cfb2,
    window: 0x9fd8ff,
    carpets: [0xd99a8f, 0x9cc48a, 0xe0c879, 0x8fa9cf, 0xb59ac4, 0xe3b36b],
    rest: 0x8ccaca,
    hall: 0xc9b38f,
    toilet: 0xcfd3dd,
    neon: 0,
    plant: 0x3ccf63,
  },
  // Банк: мрамор, тёмно-синие стены, золото
  bank: {
    bg: 0xe9edf5,
    floor: 0xeef0f4,
    floorLine: 0xd5d9e3,
    wall: 0x2f3c6b,
    wallTop: 0x24305a,
    window: 0xbfe3ff,
    carpets: [0x7b2d3a, 0x2d5b46, 0x8a6d2b, 0x2d4a7b, 0x4a3b6b, 0x6b2d2d],
    rest: 0x5b6b8a,
    hall: 0xd9c38a,
    toilet: 0xdfe3ea,
    neon: 0xffd23f,
    plant: 0x2fa860,
  },
  // Игровая студия: бетон, фиолетовые стены, неон
  studio: {
    bg: 0x221a33,
    floor: 0x8a8f9e,
    floorLine: 0x7a7f8e,
    wall: 0x3b2b5a,
    wallTop: 0x2e2147,
    window: 0x8b6cff,
    carpets: [0xff5fa2, 0x2fbfae, 0xffb13b, 0x4fb3ff, 0x8b6cff, 0xff7a45],
    rest: 0x2fbfae,
    hall: 0x6b6f7e,
    toilet: 0xa9aebd,
    neon: 0xff5fa2,
    plant: 0x5be07f,
  },
  // Космос: металлические панели, иллюминаторы со звёздами
  space: {
    bg: 0x0d1028,
    floor: 0x5a6078,
    floorLine: 0x4b5068,
    wall: 0x1e2240,
    wallTop: 0x161a33,
    window: 0x0a0d24,
    carpets: [0x3b4b8a, 0x2b6b6b, 0x6b5b2b, 0x4b3b7a, 0x6b2b4b, 0x2b4b6b],
    rest: 0x2b5b7a,
    hall: 0x454b63,
    toilet: 0x6b718a,
    neon: 0x2fbfae,
    plant: 0x7fe0a0,
  },
};
