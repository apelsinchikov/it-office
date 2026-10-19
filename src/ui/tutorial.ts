// Обучение при первом запуске: 8 шагов из GDD. «Пропустить» — после второго шага.

import { t, type Key } from '../i18n';
import { roomById, type RoomDef } from '../scene/layout';
import { h } from './dom';

interface Step {
  room: RoomDef['id'];
  text: Key;
  desk?: boolean;
}

const STEPS: Step[] = [
  { room: 'sysadmins', text: 'tut.1' },
  { room: 'sysadmins', text: 'tut.2' },
  { room: 'support', text: 'tut.3' },
  { room: 'director', text: 'tut.4' },
  { room: 'rest', text: 'tut.5' },
  { room: 'analysts', text: 'tut.6' },
  { room: 'toilet', text: 'tut.7' },
  { room: 'sysadmins', text: 'tut.8' },
];

export class Tutorial {
  active = false;
  private step = -1;
  private readonly card: HTMLElement;
  private readonly text: HTMLElement;
  private readonly cont: HTMLButtonElement;
  private readonly skip: HTMLButtonElement;
  private readonly desk: HTMLButtonElement;
  private readonly dots: HTMLElement;

  constructor(
    private readonly focus: (def: RoomDef) => void,
    private readonly onDesk: () => void,
    private readonly deskDone: () => boolean,
    private readonly onFinish: () => void,
    private readonly setUi: (tutorial: boolean) => void,
  ) {
    this.text = h('p', { class: 'tut-text' });
    this.desk = h('button', { class: 'buy big', text: t('tut.deskBtn') });
    this.desk.addEventListener('click', () => {
      this.onDesk();
      this.render();
    });
    this.cont = h('button', { class: 'buy big', text: t('continue') });
    this.cont.addEventListener('click', () => this.next());
    this.skip = h('button', { class: 'mode', text: t('skip') });
    this.skip.addEventListener('click', () => this.finish());
    this.dots = h('div', { class: 'tut-dots' });
    this.card = h('div', { class: 'tutorial hidden', attrs: { role: 'dialog' } }, this.dots, this.text, h('div', { class: 'tut-actions' }, this.skip, this.desk, this.cont));
    document.body.append(this.card);
  }

  start(): void {
    this.active = true;
    this.step = -1;
    this.setUi(true);
    this.card.classList.remove('hidden');
    this.next();
  }

  private next(): void {
    this.step++;
    if (this.step >= STEPS.length) {
      this.finish();
      return;
    }
    const s = STEPS[this.step];
    this.focus(roomById(s.room));
    // окошко появляется через полсекунды после подлёта камеры
    this.card.classList.add('wait');
    setTimeout(() => this.card.classList.remove('wait'), 500);
    this.render();
  }

  private render(): void {
    const s = STEPS[this.step];
    if (!s) return;
    this.text.textContent = t(s.text);
    const needDesk = !!s.desk && !this.deskDone();
    this.desk.style.display = needDesk ? '' : 'none';
    this.cont.style.display = needDesk ? 'none' : '';
    this.skip.style.display = this.step >= 2 ? '' : 'none';
    this.dots.replaceChildren(...STEPS.map((_, i) => h('i', { class: i === this.step ? 'on' : i < this.step ? 'past' : '' })));
  }

  finish(): void {
    this.active = false;
    this.card.classList.add('hidden');
    this.setUi(false);
    this.onFinish();
  }
}
