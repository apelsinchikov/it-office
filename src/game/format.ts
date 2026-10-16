// Короткая запись больших чисел: 950, 1,2K, 34,5M, 678B, 1,2T, потом aa, ab, ac…

const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

function suffix(i: number): string {
  if (i < SUFFIXES.length) return SUFFIXES[i];
  const n = i - SUFFIXES.length; // 0 → aa, 1 → ab, … 25 → az, 26 → ba
  const a = 'abcdefghijklmnopqrstuvwxyz';
  return a[Math.floor(n / 26) % 26] + a[n % 26];
}

function trim(s: string): string {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  if (value < 0) return '-' + formatNumber(-value);
  if (value < 1000) {
    const s = value < 100 && !Number.isInteger(value) ? trim(value.toFixed(1)) : Math.floor(value).toString();
    return s.replace('.', ',');
  }
  let i = Math.floor(Math.log10(value) / 3);
  let v = value / 1000 ** i;
  // 999,96K округлится до 1000K — переносим в следующий разряд
  if (Number(v.toFixed(v < 100 ? 1 : 0)) >= 1000) {
    i += 1;
    v = value / 1000 ** i;
  }
  const s = v < 100 ? trim(v.toFixed(1)) : Math.floor(v).toString();
  return s.replace('.', ',') + suffix(i);
}
