// Прогон всех профилей и таблица результатов.
import { PROFILES, SIM_FLAGS, simulate } from './simulate';
if (process.env.NOQUESTS) SIM_FLAGS.quests = false;
import { COMPANY_TUNING } from '../src/game/config';
import { TUNING } from '../src/game/economy';
if (process.env.GEXP) TUNING.grantsExp = Number(process.env.GEXP);
if (process.argv[5]) COMPANY_TUNING.costStep = Number(process.argv[5]);

const only = process.argv[2];
const fmt = (x: number | undefined): string => (x === undefined ? '—' : x.toFixed(1));

console.log('профиль | 2-й отдел | 1-я реорг | 3-й отдел | 5-я реорг | 4-й отдел | 5-й отдел | всё куплено | реорг | часов в игре | Гранты из заданий / всего');
for (const p of PROFILES) {
  if (only && p.id !== only) continue;
  const t0 = Date.now();
  const r = simulate(p, Number(process.argv[3] ?? 400), 1, Number(process.argv[4] ?? 1));
  const d = r.days;
  console.log(
    `${p.id} ${p.name} | ${fmt(d.dept2)} | ${fmt(d.reorg1)} | ${fmt(d.dept3)} | ${fmt(d.reorg5)} | ${fmt(d.dept4)} | ${fmt(d.dept5)} | ${fmt(d.complete)} | ${r.reorgs} | ${r.activeHours.toFixed(0)} | ${r.grantsFromQuests} / ${r.grantsTotal} | компании: ${r.companyDays.map((x) => x.toFixed(1)).join(' → ')}  (${((Date.now() - t0) / 1000).toFixed(1)} c)`,
  );
}
