import { PROFILES, simulate } from './simulate';
import { DEPTS } from '../src/game/config';
const p = PROFILES.find((x) => x.id === (process.argv[2] ?? 'C'))!;
simulate(p, Number(process.argv[3] ?? 100), 1, 2, (day, g) => {
  if (day !== Number(process.argv[3] ?? 100) - 1) return;
  const r = g.run;
  const miss: string[] = [];
  r.depts.forEach((u, d) => { if (!u) miss.push(`dept${d}`); if (!r.managers[d]) miss.push(`mgr${d}`); });
  r.levels.forEach((row, d) => row.forEach((l, k) => {
    if (l === 0) miss.push(`hire${d}.${k} (prev L=${row[k - 1]}) cost=${g.hireCost(d, k).toExponential(1)}`);
    r.furn[d][k].forEach((t, i) => { if (t < 3) miss.push(`furn${d}.${k}.${DEPTS[d].items[i]}=${t} cost=${g.furnCost(d, k, i).toExponential(1)}`); });
    r.singles[d][k].forEach((x, j) => { if (!x) miss.push(`single${d}.${k}.${j} cost=${g.singleCost(d, k, j).toExponential(1)}`); });
  }));
  for (const k of ['coffee', 'fridge', 'games'] as const) if (r.rest[k] < g.restMax(k)) miss.push(`rest ${k}=${r.rest[k]}`);
  console.log('coins', r.coins.toExponential(2), 'inc/s', g.incomePerSec(true).toExponential(2), 'levels', JSON.stringify(r.levels));
  console.log(miss.join('\n'));
});
