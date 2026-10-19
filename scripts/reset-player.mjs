// Добавляет игрока в public/resets.json: при следующем входе его прогресс сбросится один раз.
// Использование: node scripts/reset-player.mjs @ник   или   node scripts/reset-player.mjs id:123456789
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const arg = process.argv[2];
if (!arg) {
  console.error('Укажите ник (@ник) или id:число');
  process.exit(1);
}
const key = arg.startsWith('id:') ? `id:${arg.slice(3).trim()}` : `u:${arg.replace(/^@/, '').trim().toLowerCase()}`;
const h = createHash('sha256').update(`it-office:${key}`).digest('hex');
const path = new URL('../public/resets.json', import.meta.url);
const data = JSON.parse(readFileSync(path, 'utf8'));
const before = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
data.resets = data.resets.filter((r) => r.h !== h);
data.resets.push({ h, before });
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`Добавлен ${arg}: прогресс, начатый до ${before}, сбросится при следующем входе.`);
