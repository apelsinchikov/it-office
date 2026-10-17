// Достижения (роадмап 1.1): только значки, без влияния на экономику.

import type { GameState } from './state';
import { TOTAL_PHRASES } from './phrases';
import type { Text } from './quests';

export interface AchievementDef {
  id: string;
  title: Text;
  check: (s: GameState) => boolean;
}

const t = (ru: string, en: string): Text => ({ ru, en });

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'earn1k', title: t('Первая тысяча', 'First thousand'), check: (s) => s.totalEarned >= 1e3 },
  { id: 'earn1m', title: t('Миллионер', 'Millionaire'), check: (s) => s.totalEarned >= 1e6 },
  { id: 'earn1b', title: t('Миллиардер', 'Billionaire'), check: (s) => s.totalEarned >= 1e9 },
  { id: 'earn1t', title: t('Триллион на счету', 'A trillion in the bank'), check: (s) => s.totalEarned >= 1e12 },
  { id: 'earn1qa', title: t('Квадриллион', 'Quadrillion'), check: (s) => s.totalEarned >= 1e15 },
  { id: 'tickets10', title: t('Дежурный', 'On call'), check: (s) => s.stats.tickets >= 10 },
  { id: 'tickets100', title: t('Гроза тикетов', 'Ticket slayer'), check: (s) => s.stats.tickets >= 100 },
  { id: 'tickets1000', title: t('Вторая линия поддержки', 'Second line support'), check: (s) => s.stats.tickets >= 1000 },
  { id: 'avral10', title: t('Всё горит!', 'Everything is on fire!'), check: (s) => s.stats.avrals >= 10 },
  { id: 'avral100', title: t('Аврал — это стиль жизни', 'Crunch is a lifestyle'), check: (s) => s.stats.avrals >= 100 },
  { id: 'levels100', title: t('Растём', 'Growing'), check: (s) => s.stats.levelsBought >= 100 },
  { id: 'levels1000', title: t('Карьерная лестница', 'Career ladder'), check: (s) => s.stats.levelsBought >= 1000 },
  { id: 'levels10000', title: t('Эффективный менеджер', 'Effective manager'), check: (s) => s.stats.levelsBought >= 10000 },
  { id: 'reorg1', title: t('Реорганизатор', 'Reorganizer'), check: (s) => s.reorgs >= 1 },
  { id: 'reorg10', title: t('Вечная реструктуризация', 'Eternal restructuring'), check: (s) => s.reorgs >= 10 },
  { id: 'reorg25', title: t('Оптимизатор штата', 'Headcount optimizer'), check: (s) => s.reorgs >= 25 },
  { id: 'phrases25', title: t('Слушатель', 'Listener'), check: (s) => s.phrasesSeen.length >= 25 },
  { id: 'phrases100', title: t('Знаток офисного фольклора', 'Office folklore expert'), check: (s) => s.phrasesSeen.length >= 100 },
  { id: 'phrasesAll', title: t('Слышал всё', 'Heard it all'), check: (s) => s.phrasesSeen.length >= TOTAL_PHRASES },
  { id: 'company2', title: t('Новая компания', 'New company'), check: (s) => s.company >= 2 },
  { id: 'company3', title: t('Серийный директор', 'Serial director'), check: (s) => s.company >= 3 },
  { id: 'company4', title: t('До звёзд', 'To the stars'), check: (s) => s.company >= 4 },
];

/** Проверяет и записывает новые достижения; возвращает их id. */
export function checkAchievements(s: GameState): string[] {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements.includes(a.id) && a.check(s)) {
      s.achievements.push(a.id);
      fresh.push(a.id);
    }
  }
  return fresh;
}
