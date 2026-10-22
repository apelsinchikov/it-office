// Заметки для разработки (только в режиме ?debug): пауза, булавка на месте в офисе и комментарий к ней.
// Заметки лежат в localStorage этого браузера (ключ it-office.notes); Claude читает их оттуда и смотрит на место булавки.

import type { Pt } from '../scene/layout';
import { h } from './dom';

export interface DebugNote {
  id: number;
  /** Точка в координатах мира офиса. */
  x: number;
  y: number;
  room: string;
  text: string;
  at: string;
  done?: boolean;
  /** Заметка к интерфейсу (панель, меню): точка на экране и что было под пальцем. Тогда x, y не используются. */
  screen?: { x: number; y: number; w: number; h: number };
  ui?: string;
}

/** Что под пальцем в интерфейсе: заголовок открытой панели и текст ближайшей строки или кнопки. */
function describeUi(el: Element): string {
  const clean = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, 90);
  const sheet = el.closest('.sheet');
  const title = sheet ? clean(sheet.querySelector('.sheet-titles')?.firstElementChild?.textContent) : '';
  const row = (el.closest('.worker, .card, .rating-row, .section-head, .sheet-head, button, .nav, .topbar, .chip') ?? el) as HTMLElement;
  // innerText — с пробелами между строками кнопки («+1 ур. 3,2»), а не слитно, как textContent
  const what = clean(row.innerText ?? row.textContent);
  return [title && `панель «${title}»`, what && `«${what}»`].filter(Boolean).join(' · ') || el.tagName.toLowerCase();
}

const KEY = 'it-office.notes';

function load(): DebugNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DebugNote[]) : [];
  } catch {
    return [];
  }
}

function store(list: DebugNote[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // приватный режим — заметки живут до перезагрузки
  }
}

export class DebugNotes {
  paused = false;
  private armed = false;
  private notes: DebugNote[] = load();
  private readonly btn: HTMLButtonElement;
  private readonly banner: HTMLElement;
  private readonly layer: HTMLElement;
  private pins = new Map<number, HTMLElement>();
  private editor: HTMLElement | null = null;

  constructor(
    private readonly toWorld: (x: number, y: number) => Pt,
    private readonly toScreen: (p: Pt) => Pt,
    private readonly roomAt: (p: Pt) => string,
  ) {
    this.layer = h('div', { class: 'dbg-layer' });
    this.btn = h('button', { class: 'dbg-btn', text: 'Заметка' });
    this.btn.addEventListener('click', () => this.toggle());
    this.banner = h('div', { class: 'dbg-banner hidden', text: 'Пауза. Нажмите на место, о котором заметка' });
    document.body.append(this.layer, this.btn, this.banner);
    Object.assign(window, { __notes: this });
    // В режиме заметки нажатие по интерфейсу (панель улучшений, меню) тоже ставит заметку и ничего не нажимает.
    document.addEventListener('pointerdown', this.onUiDown, true);
    document.addEventListener('click', this.onUiClick, true);
  }

  /** Нажатие вне холста, пока включён режим заметки. */
  private isUiTap(e: Event): boolean {
    if (!this.armed) return false;
    const t = e.target as Element | null;
    if (!t || !(t instanceof Element)) return false;
    if (t.closest('.dbg-btn, .dbg-editor')) return false; // своя кнопка и поле заметки работают как обычно
    return t.tagName !== 'CANVAS';
  }

  private readonly onUiDown = (e: PointerEvent): void => {
    if (!this.isUiTap(e)) return;
    e.preventDefault();
    e.stopPropagation();
    if (this.editor) return;
    const t = e.target as Element;
    const room = describeUi(t);
    const w = { x: window.innerWidth, y: window.innerHeight };
    this.openEditor({ x: 0, y: 0 }, room, { x: Math.round(e.clientX), y: Math.round(e.clientY), w: w.x, h: w.y });
  };

  private readonly onUiClick = (e: MouseEvent): void => {
    if (this.isUiTap(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  /** Все заметки (для чтения из консоли: __notes.list()). */
  list(): DebugNote[] {
    return this.notes;
  }

  clear(): void {
    this.notes = [];
    store(this.notes);
    for (const p of this.pins.values()) p.remove();
    this.pins.clear();
  }

  /** Отметить заметку выполненной: булавка становится зелёной. */
  done(id: number): void {
    const n = this.notes.find((x) => x.id === id);
    if (n) n.done = true;
    store(this.notes);
  }

  private toggle(): void {
    this.armed = !this.armed;
    this.paused = this.armed;
    this.btn.classList.toggle('on', this.armed);
    this.banner.classList.toggle('hidden', !this.armed);
    if (!this.armed) this.closeEditor();
  }

  /** Тап по сцене: в режиме заметки ставит булавку и открывает поле для текста. Возвращает true, если тап «съеден». */
  handleTap(x: number, y: number): boolean {
    if (!this.armed) return false;
    if (this.editor) return true;
    const w = this.toWorld(x, y);
    this.openEditor(w, this.roomAt(w));
    return true;
  }

  private openEditor(w: Pt, room: string, screen?: DebugNote['screen']): void {
    const area = h('textarea', { class: 'dbg-text', attrs: { rows: '3', placeholder: 'Что здесь не так?' } }) as HTMLTextAreaElement;
    const save = h('button', { class: 'buy sm', text: 'Сохранить' });
    const cancel = h('button', { class: 'mode', text: 'Отмена' });
    this.editor = h('div', { class: 'dbg-editor' }, h('div', { class: 'note small', text: `Место: ${room}` }), area, h('div', { class: 'row-btns' }, save, cancel));
    document.body.append(this.editor);
    area.focus();
    save.addEventListener('click', () => {
      const text = area.value.trim();
      if (text) {
        const note: DebugNote = { id: Date.now(), x: Math.round(w.x), y: Math.round(w.y), room, text, at: new Date().toISOString() };
        if (screen) {
          note.screen = screen;
          note.ui = room;
        }
        this.notes.push(note);
        store(this.notes);
      }
      this.closeEditor();
    });
    cancel.addEventListener('click', () => this.closeEditor());
  }

  private closeEditor(): void {
    this.editor?.remove();
    this.editor = null;
  }

  /** Каждый кадр: булавки едут вместе с камерой. */
  update(): void {
    // пока открыта панель, булавки офиса под ней не нужны — видны только заметки к интерфейсу
    const sheetOpen = document.querySelector('.sheet:not(.hidden)') !== null;
    this.notes.forEach((n, i) => {
      let pin = this.pins.get(n.id);
      if (!pin) {
        pin = h('div', { class: 'dbg-pin', text: String(i + 1), attrs: { title: n.text } });
        this.layer.append(pin);
        this.pins.set(n.id, pin);
      }
      pin.classList.toggle('done', !!n.done);
      const display = !n.screen && sheetOpen ? 'none' : '';
      if (pin.style.display !== display) pin.style.display = display;
      // заметка к интерфейсу стоит на месте экрана, заметка к офису — едет вместе с камерой
      const p = n.screen ? { x: n.screen.x, y: n.screen.y } : this.toScreen({ x: n.x, y: n.y });
      pin.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
}
