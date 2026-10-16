// Интерфейс поверх сцены — обычный HTML: баланс сверху и панель улучшений снизу.

import { nextMilestone } from '../game/economy';
import { formatNumber } from '../game/format';
import type { Game } from '../game/game';
import { DESKS } from '../game/state';
import type { RoomDef } from '../scene/layout';

type BuyMode = 1 | 10 | 'max';

const NAMES = [
  ['Галя', 'Витя', 'Оля', 'Серёга', 'Маша', 'Дима'],
  ['Артём', 'Лёша', 'Катя', 'Никита', 'Женя', 'Рома'],
  ['Света', 'Паша', 'Ира', 'Денис', 'Аня', 'Костя'],
  ['Юля', 'Миша', 'Настя', 'Игорь', 'Лена', 'Саша'],
  ['Боря', 'Валера', 'Толик', 'Гена', 'Стас', 'Петрович'],
];

const ROOM_NOTES: Record<string, string> = {
  hall: 'Холл. Здесь будут бродить сотрудники и возникать идеи.',
  director: 'Кабинет директора IT. Кнопка «Аврал» появится на этапе 3.',
  rest: 'Зона отдыха: кофемашина, холодильник и приставка — на этапе 2.',
  toilet: 'Туалет. Одна кабинка, очередей не будет.',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

interface WorkerRow {
  desk: number;
  level: HTMLElement;
  income: HTMLElement;
  hint: HTMLElement;
  button: HTMLButtonElement;
  buttonLabel: HTMLElement;
  buttonCost: HTMLElement;
}

export class Hud {
  /** Высота верхней полосы и открытой панели — чтобы камера не прятала офис под ними. */
  readonly topInset = 64;

  private readonly coinsEl: HTMLElement;
  private readonly rateEl: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly body: HTMLElement;
  private readonly modeButtons = new Map<BuyMode, HTMLButtonElement>();
  private rows: WorkerRow[] = [];
  private mode: BuyMode = 1;
  private room: RoomDef | null = null;
  private lastRefresh = 0;

  onClose: () => void = () => {};

  constructor(private readonly game: Game) {
    const root = document.getElementById('hud');
    if (!root) throw new Error('нет #hud');
    root.replaceChildren();

    const top = el('div', 'topbar');
    const coins = el('div', 'coins');
    coins.append(el('span', 'coin-icon', 'tc'));
    this.coinsEl = el('span', 'coins-value', '0');
    coins.append(this.coinsEl);
    this.rateEl = el('div', 'rate', '+0/сек');
    top.append(coins, this.rateEl);

    this.panel = el('div', 'panel hidden');
    const head = el('div', 'panel-head');
    this.title = el('div', 'panel-title');
    const close = el('button', 'panel-close', '×');
    close.setAttribute('aria-label', 'Закрыть');
    close.addEventListener('click', () => this.close());
    head.append(this.title, close);

    const modes = el('div', 'modes');
    for (const m of [1, 10, 'max'] as BuyMode[]) {
      const b = el('button', 'mode', m === 'max' ? 'Макс' : `×${m}`);
      b.addEventListener('click', () => {
        this.mode = m;
        this.refresh(true);
      });
      this.modeButtons.set(m, b);
      modes.append(b);
    }

    this.body = el('div', 'panel-body');
    this.panel.append(head, modes, this.body);
    root.append(top, this.panel);
  }

  bottomInset(): number {
    return this.panel.classList.contains('hidden') ? 16 : this.panel.offsetHeight + 8;
  }

  isOpen(): boolean {
    return this.room !== null;
  }

  open(room: RoomDef): void {
    this.room = room;
    this.title.textContent = room.name;
    this.body.replaceChildren();
    this.rows = [];
    const modes = this.panel.querySelector<HTMLElement>('.modes');

    const isWorkingDept = room.kind === 'dept' && room.dept === 0;
    if (modes) modes.style.display = isWorkingDept ? '' : 'none';

    if (room.kind !== 'dept' || room.dept === undefined) {
      this.body.append(el('p', 'note', ROOM_NOTES[room.id] ?? ''));
    } else if (room.dept !== 0) {
      this.body.append(el('p', 'note', 'Отдел откроется на этапе 2: сначала прокачайте поддержку.'));
    } else {
      const d = room.dept;
      for (let k = 0; k < DESKS; k++) {
        if (this.game.isHired(d, k)) this.rows.push(this.buildRow(d, k));
      }
      this.body.append(el('p', 'note small', 'Следующий сотрудник — после 25 уровня первого (этап 2).'));
    }
    this.panel.classList.remove('hidden');
    this.refresh(true);
  }

  close(): void {
    this.room = null;
    this.panel.classList.add('hidden');
    this.onClose();
  }

  /** Вызывается каждый кадр; DOM обновляем не чаще 6 раз в секунду. */
  update(now: number): void {
    if (now - this.lastRefresh < 160) return;
    this.lastRefresh = now;
    this.refresh(false);
  }

  private buildRow(dept: number, desk: number): WorkerRow {
    const row = el('div', 'worker');
    const info = el('div', 'worker-info');
    const name = el('div', 'worker-name', NAMES[dept][desk]);
    const level = el('div', 'worker-level');
    const income = el('div', 'worker-income');
    const hint = el('div', 'worker-hint');
    info.append(name, level, income, hint);

    const button = el('button', 'buy');
    const buttonLabel = el('span', 'buy-label');
    const buttonCost = el('span', 'buy-cost');
    button.append(buttonLabel, buttonCost);
    button.addEventListener('click', () => {
      const n = this.mode === 'max' ? this.game.maxLevels(dept, desk) : this.mode;
      if (this.game.buyLevels(dept, desk, n)) this.refresh(true);
    });

    row.append(info, button);
    this.body.append(row);
    return { desk, level, income, hint, button, buttonLabel, buttonCost };
  }

  private refresh(force: boolean): void {
    this.coinsEl.textContent = formatNumber(this.game.state.coins);
    this.rateEl.textContent = `+${formatNumber(this.game.incomePerSec())}/сек`;
    if (!this.room || this.room.dept !== 0) return;
    if (force) for (const [m, b] of this.modeButtons) b.classList.toggle('active', m === this.mode);

    const d = 0;
    for (const r of this.rows) {
      const L = this.game.level(d, r.desk);
      r.level.textContent = `Уровень ${L}`;
      r.income.textContent = `+${formatNumber(this.game.payoutOf(d, r.desk))} за 10 сек`;
      const m = nextMilestone(L);
      r.hint.textContent = m ? `до ×2 дохода: ${m - L} ур.` : '';

      let n = this.mode === 'max' ? this.game.maxLevels(d, r.desk) : this.mode;
      const canAfford = n > 0 && this.game.costOf(d, r.desk, n) <= this.game.state.coins + 1e-9;
      if (n === 0) n = 1; // в режиме «Макс» без денег показываем цену одного уровня
      r.buttonLabel.textContent = `+${n} ур.`;
      r.buttonCost.textContent = formatNumber(this.game.costOf(d, r.desk, n));
      r.button.disabled = !canAfford;
    }
  }
}
