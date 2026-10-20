// Сезонные события (роадмап 1.4): даты по Москве.

import { DEPTS, deptIndex } from './config';
import { NO_EVENT, type EventMod } from './game';

export type EventId = 'newyear' | 'sysadminDay' | 'hackathon' | 'kirillBday';

/** Дата по Москве (UTC+3) как объект с полями UTC. */
export function moscow(nowMs: number): Date {
  return new Date(nowMs + 3 * 3600 * 1000);
}

export function moscowDayKey(nowMs: number): string {
  return moscow(nowMs).toISOString().slice(0, 10);
}

function lastFridayOfJuly(year: number): number {
  const d = new Date(Date.UTC(year, 6, 31));
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() - 1);
  return d.getUTCDate();
}

export function eventIdAt(nowMs: number): EventId | null {
  const m = moscow(nowMs);
  const month = m.getUTCMonth();
  const day = m.getUTCDate();
  if ((month === 11 && day >= 20) || (month === 0 && day <= 10)) return 'newyear';
  if (month === 6) {
    const fri = lastFridayOfJuly(m.getUTCFullYear());
    if (Math.abs(day - fri) <= 2) return 'sysadminDay';
  }
  // Хакатон: первая суббота месяца и воскресенье после неё
  const dow = m.getUTCDay();
  if ((dow === 6 && day <= 7) || (dow === 0 && day >= 2 && day <= 8)) return 'hackathon';
  if (month === 9 && day === 21) return 'kirillBday';
  return null;
}

export function eventMod(id: EventId | null): EventMod {
  const dept = DEPTS.map(() => 1);
  switch (id) {
    case 'newyear':
      return { id, incomeMult: 1.1, deptMult: dept, ticketFreqMult: 1 };
    case 'sysadminDay':
      dept[deptIndex('sysadmins')] = 2;
      return { id, incomeMult: 1, deptMult: dept, ticketFreqMult: 1 };
    case 'hackathon':
      dept[deptIndex('dev')] = 1.5;
      return { id, incomeMult: 1, deptMult: dept, ticketFreqMult: 2 };
    case 'kirillBday':
      dept[deptIndex('dev')] = 2;
      return { id, incomeMult: 1, deptMult: dept, ticketFreqMult: 2 };
    default:
      return NO_EVENT;
  }
}
