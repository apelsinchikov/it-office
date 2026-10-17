import { PROFILES, simulate } from './simulate';
const p = PROFILES.find((x) => x.id === (process.argv[2] ?? 'C'))!;
simulate(p, Number(process.argv[3] ?? 300), 1, 2, (day, g) => {
  if (day % Number(process.argv[4] ?? 10) !== 0) return;
  const s = g.state;
  console.log(`day ${day} co=${s.company} reorgs=${s.reorgs} grants=${s.grants.toExponential(2)} coGr=${s.companyGrants} pend=${g.pendingGrants()} depts=${s.run.depts.filter(Boolean).length} hired=${s.run.levels.flat().filter((l) => l > 0).length} maxL=${Math.max(...s.run.levels.flat())} compl=${(g.completion() * 100).toFixed(0)}% inc=${g.incomePerSec(true).toExponential(2)} culture=${s.shop.culture ?? 0}`);
});
