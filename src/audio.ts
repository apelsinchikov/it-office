// Звуки синтезируются WebAudio — без файлов. Вместе со звуком — вибрация Telegram (своя настройка).
//
// iPhone: звук разрешается только касанием, которое Safari считает «действием пользователя» — это отпускание
// пальца (touchend / pointerup / click), а не pointerdown. После сворачивания iOS переводит звук
// в состояние «interrupted», его тоже нужно будить. В беззвучном режиме (переключатель на корпусе) iOS
// звук страниц глушит — это поведение самого телефона.

import { haptic, type Haptic } from './haptics';

type Sfx = 'buy' | 'coin' | 'ticket' | 'avral' | 'reorg' | 'achieve' | 'click' | 'error' | 'hire';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSound(on: boolean): void {
  enabled = on;
}

/** Браузеры разрешают звук только после касания — вызываем на первом pointerdown. */
export function unlockAudio(): void {
  if (ctx) {
    // suspended — ещё не разрешён; interrupted — iOS после сворачивания или звонка
    if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
  } catch {
    ctx = null;
  }
}

/** Слушать касания, которые разрешают звук: отпускание пальца и клик (iOS), нажатие (компьютер). */
export function installAudioUnlock(): void {
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(ev, unlockAudio, { capture: true, passive: true });
  }
}

/** Вибрация к звукам: только к заметным событиям, не к каждому нажатию. */
const HAPTIC: Partial<Record<Sfx, Haptic>> = {
  buy: 'light',
  hire: 'medium',
  coin: 'light',
  ticket: 'medium',
  avral: 'heavy',
  reorg: 'success',
  achieve: 'success',
  error: 'error',
};

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 1, slideTo?: number): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function play(s: Sfx): void {
  const hk = HAPTIC[s];
  if (hk) haptic(hk);
  if (!enabled || !ctx) return;
  switch (s) {
    case 'click':
      tone(900, 0, 0.05, 'triangle', 0.4);
      break;
    case 'buy':
      tone(520, 0, 0.08, 'square', 0.35);
      tone(780, 0.06, 0.1, 'square', 0.3);
      break;
    case 'hire':
      tone(440, 0, 0.1, 'triangle', 0.5);
      tone(660, 0.08, 0.1, 'triangle', 0.5);
      tone(880, 0.16, 0.14, 'triangle', 0.5);
      break;
    case 'coin':
      tone(1320, 0, 0.06, 'sine', 0.5);
      tone(1760, 0.05, 0.08, 'sine', 0.5);
      break;
    case 'ticket':
      tone(988, 0, 0.08, 'triangle', 0.6);
      tone(1319, 0.07, 0.12, 'triangle', 0.6);
      tone(1976, 0.15, 0.16, 'sine', 0.4);
      break;
    case 'avral':
      tone(440, 0, 0.35, 'sawtooth', 0.25, 880);
      tone(880, 0.35, 0.35, 'sawtooth', 0.25, 440);
      break;
    case 'reorg':
      [784, 659, 523, 392].forEach((f, i) => tone(f, i * 0.09, 0.18, 'triangle', 0.5));
      break;
    case 'achieve':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.16, 'sine', 0.55));
      break;
    case 'error':
      tone(160, 0, 0.14, 'square', 0.3);
      break;
  }
}
