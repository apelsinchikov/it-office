import { Application } from 'pixi.js';
import './style.css';
import { Game } from './game/game';
import { loadState, saveState } from './game/state';
import { Camera } from './scene/camera';
import { ROOMS, ROOM_H, ROOM_W, WALL_H, roomCenter } from './scene/layout';
import { OfficeView } from './scene/office';
import { initTelegram } from './telegram';
import { Hud } from './ui/hud';

const SAVE_EVERY_MS = 5000;

async function start(): Promise<void> {
  initTelegram();

  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#1e2230',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  document.getElementById('game')?.appendChild(app.canvas);

  const game = new Game(loadState());
  const office = new OfficeView(game);
  app.stage.addChild(office.container);

  const hud = new Hud(game);
  const camera = new Camera(
    office.container,
    office.bounds(),
    app.canvas,
    () => app.screen,
    () => ({ top: hud.topInset, bottom: hud.bottomInset() }),
  );

  // Комната со стенами и подписями над столами: чуть больше самого ромба.
  const roomZoom = (): number => camera.zoomToFit(ROOM_W + 40, ROOM_H + WALL_H + 150);
  const support = ROOMS.find((r) => r.id === 'support');
  const showSupport = (instant: boolean): void => {
    if (support) camera.focusOn(roomCenter(support.col, support.row), roomZoom(), instant);
  };

  camera.onTap = (x, y) => {
    const local = office.container.toLocal({ x, y });
    const hit = office.roomAt(local.x, local.y);
    if (!hit) {
      if (hud.isOpen()) hud.close();
      return;
    }
    hud.open(hit.def);
    // ждём кадр, чтобы панель получила высоту, — камера учитывает её
    requestAnimationFrame(() => camera.focusOn(hit.center, roomZoom()));
  };
  hud.onClose = () => {};
  app.renderer.on('resize', () => showSupport(true));
  // На старте в MVP работает только поддержка — показываем её крупно; весь этаж виден щипком.
  showSupport(true);

  app.ticker.add((ticker) => {
    // если вкладка была скрыта, не начисляем «пропущенное» разом (офлайн-доход — этап 3)
    const dt = Math.min(ticker.deltaMS / 1000, 1);
    const payouts = game.tick(dt);
    office.update(dt, payouts);
    camera.update(dt);
    hud.update(performance.now());
  });

  const save = (): void => saveState(game.state);
  window.setInterval(save, SAVE_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="position:fixed;bottom:0;left:0;right:0;color:#f88;white-space:pre-wrap;padding:16px">${String(err)}</pre>`,
  );
});
