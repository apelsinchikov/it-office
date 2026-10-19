import type { Container } from 'pixi.js';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Pt {
  x: number;
  y: number;
}

const MAX_ZOOM = 1.8; // дальше приближать нельзя: спрайты начнут мылиться
const TAP_SLOP = 10; // смещение пальца, после которого это уже не тап, а перетаскивание
const FOCUS_SEC = 0.45;
/** Сильнее всего отдалённая камера показывает по ширине столько пикселей мира (≈ полтора кабинета). */
const FAR_VIEW_W = 860;

/**
 * Камера: перетаскивание одним пальцем, щипок двумя, колесо мыши.
 * Двигает и масштабирует контейнер офиса. Тап по сцене отдаёт в onTap экранные координаты.
 * bounds — весь нарисованный мир (офис и поле вокруг): экран всегда целиком заполнен картой,
 * отдалить дальше «полутора кабинетов» и увести камеру за край мира нельзя.
 */
export class Camera {
  onTap: (x: number, y: number) => void = () => {};

  private minScale = 0.3;
  private maxScale = MAX_ZOOM;
  private readonly pointers = new Map<number, Pt>();
  private downAt: Pt | null = null;
  private moved = false;
  private pinch: { dist: number; scale: number; world: Pt } | null = null;
  private anim: { t: number; from: Pt; fromScale: number; to: Pt; toScale: number } | null = null;

  constructor(
    private readonly target: Container,
    private readonly bounds: Rect,
    private readonly el: HTMLElement,
    private readonly screen: () => { width: number; height: number },
    /** Сколько пикселей сверху и снизу закрыто интерфейсом. */
    private readonly insets: () => { top: number; bottom: number },
  ) {
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    this.fit();
  }

  /** Пределы зума для текущего размера экрана. */
  private limits(): void {
    const s = this.screen();
    const cover = Math.max(s.width / this.bounds.width, s.height / this.bounds.height);
    this.minScale = Math.max(cover, s.width / FAR_VIEW_W);
    this.maxScale = Math.max(MAX_ZOOM, this.minScale);
  }

  /** Самый дальний вид на центр мира. */
  fit(): void {
    this.limits();
    const s = this.screen();
    const k = this.minScale;
    this.target.scale.set(k);
    const cx = this.bounds.x + this.bounds.width / 2;
    const cy = this.bounds.y + this.bounds.height / 2;
    this.target.position.set(s.width / 2 - cx * k, s.height / 2 - cy * k);
    this.clamp();
  }

  /** После поворота экрана / смены размера: пересчитать пределы зума, не сбивая вид. */
  onResize(): void {
    this.limits();
    this.target.scale.set(this.clampScale(this.target.scale.x));
    this.clamp();
  }

  /** Масштаб, при котором прямоугольник w×h (в координатах офиса) целиком помещается в видимую часть экрана. */
  zoomToFit(w: number, h: number): number {
    const s = this.screen();
    const ins = this.insets();
    return this.clampScale(Math.min((s.width - 24) / w, (s.height - ins.top - ins.bottom - 24) / h));
  }

  /** Подлететь к точке офиса: плавно или сразу (instant). */
  focusOn(world: Pt, zoom: number, instant = false): void {
    const s = this.screen();
    const ins = this.insets();
    const toScale = this.clampScale(zoom);
    const visibleMidY = ins.top + (s.height - ins.top - ins.bottom) / 2;
    this.anim = {
      t: 0,
      from: { x: this.target.x, y: this.target.y },
      fromScale: this.target.scale.x,
      to: this.clampPos(s.width / 2 - world.x * toScale, visibleMidY - world.y * toScale, toScale),
      toScale,
    };
    if (instant) this.update(FOCUS_SEC);
  }

  update(dt: number): void {
    if (!this.anim) return;
    const a = this.anim;
    a.t = Math.min(1, a.t + dt / FOCUS_SEC);
    const e = 1 - (1 - a.t) ** 3; // плавное торможение
    this.target.scale.set(a.fromScale + (a.toScale - a.fromScale) * e);
    this.target.position.set(a.from.x + (a.to.x - a.from.x) * e, a.from.y + (a.to.y - a.from.y) * e);
    if (a.t >= 1) {
      this.anim = null;
      this.clamp();
    }
  }

  private clampScale(s: number): number {
    return Math.min(this.maxScale, Math.max(this.minScale, s));
  }

  /** Экран целиком внутри мира: за краем поля пустоты не видно. */
  private clampPos(x: number, y: number, k: number): Pt {
    const s = this.screen();
    const b = this.bounds;
    const minX = s.width - (b.x + b.width) * k;
    const maxX = -b.x * k;
    const minY = s.height - (b.y + b.height) * k;
    const maxY = -b.y * k;
    return {
      x: minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, x)),
      y: minY > maxY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, y)),
    };
  }

  private clamp(): void {
    const p = this.clampPos(this.target.x, this.target.y, this.target.scale.x);
    this.target.position.set(p.x, p.y);
  }

  private toWorld(p: Pt): Pt {
    const k = this.target.scale.x;
    return { x: (p.x - this.target.x) / k, y: (p.y - this.target.y) / k };
  }

  private zoomAround(screenPt: Pt, world: Pt, scale: number): void {
    const k = this.clampScale(scale);
    this.target.scale.set(k);
    this.target.position.set(screenPt.x - world.x * k, screenPt.y - world.y * k);
    this.clamp();
  }

  private twoFinger(): { mid: Pt; dist: number } {
    const [a, b] = [...this.pointers.values()];
    return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  private readonly onDown = (e: PointerEvent): void => {
    this.anim = null;
    this.el.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.downAt = { x: e.clientX, y: e.clientY };
      this.moved = false;
    } else if (this.pointers.size === 2) {
      this.moved = true; // щипок — точно не тап
      const { mid, dist } = this.twoFinger();
      this.pinch = { dist, scale: this.target.scale.x, world: this.toWorld(mid) };
    }
  };

  private readonly onMove = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, cur);

    if (this.pointers.size >= 2 && this.pinch) {
      const { mid, dist } = this.twoFinger();
      this.zoomAround(mid, this.pinch.world, (this.pinch.scale * dist) / Math.max(1, this.pinch.dist));
      return;
    }
    if (this.downAt && Math.hypot(cur.x - this.downAt.x, cur.y - this.downAt.y) > TAP_SLOP) this.moved = true;
    if (this.moved) {
      this.target.x += cur.x - prev.x;
      this.target.y += cur.y - prev.y;
      this.clamp();
    }
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size === 0) {
      if (!this.moved && e.type === 'pointerup') this.onTap(e.clientX, e.clientY);
      this.downAt = null;
    }
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.anim = null;
    const p = { x: e.clientX, y: e.clientY };
    this.zoomAround(p, this.toWorld(p), this.target.scale.x * Math.exp(-e.deltaY * 0.0015));
  };
}
