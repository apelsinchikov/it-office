import { Application, Container, Graphics, Text } from 'pixi.js';
import './style.css';
import { initTelegram } from './telegram';

// Этап 0: проверяем, что сцена рисуется, сайт выкладывается на GitHub Pages
// и открывается внутри Telegram. Настоящий офис будет на этапе 1.

const ROOMS: { name: string; color: number }[] = [
  { name: 'Аналитики', color: 0x6c8ebf },
  { name: 'Разработка', color: 0x82b366 },
  { name: 'Тестирование', color: 0xd6b656 },
  { name: 'Поддержка', color: 0xb85450 },
  { name: 'Холл', color: 0x4a4f63 },
  { name: 'Сисадмины', color: 0x9673a6 },
  { name: 'Директор IT', color: 0xd79b00 },
  { name: 'Зона отдыха', color: 0x5fa8a8 },
  { name: 'Туалет', color: 0x7a7f91 },
];

const TILE_W = 128; // ширина ромба комнаты
const TILE_H = 64; // высота ромба комнаты

function isoToScreen(col: number, row: number): { x: number; y: number } {
  return { x: (col - row) * (TILE_W / 2), y: (col + row) * (TILE_H / 2) };
}

function drawRoom(name: string, color: number): Container {
  const room = new Container();
  const floor = new Graphics()
    .poly([0, -TILE_H / 2, TILE_W / 2, 0, 0, TILE_H / 2, -TILE_W / 2, 0])
    .fill({ color })
    .stroke({ color: 0x1e2230, width: 3 });
  const label = new Text({
    text: name,
    style: { fill: '#ffffff', fontSize: 11, fontWeight: '600', align: 'center' },
  });
  label.anchor.set(0.5);
  room.addChild(floor, label);
  return room;
}

async function start(): Promise<void> {
  const tg = initTelegram();

  const userEl = document.getElementById('hud-user');
  if (userEl) {
    userEl.textContent = tg.insideTelegram
      ? `Привет, ${tg.user?.first_name ?? 'директор'}!`
      : 'Открыто в браузере';
  }

  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#1e2230',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  document.getElementById('game')?.appendChild(app.canvas);

  const office = new Container();
  ROOMS.forEach((r, i) => {
    const room = drawRoom(r.name, r.color);
    const { x, y } = isoToScreen(i % 3, Math.floor(i / 3));
    room.position.set(x, y);
    office.addChild(room);
  });
  app.stage.addChild(office);

  const layout = (): void => {
    const b = office.getLocalBounds();
    const scale = Math.min(
      (app.screen.width - 32) / b.width,
      (app.screen.height - 120) / b.height,
      1.8,
    );
    office.scale.set(scale);
    office.position.set(
      app.screen.width / 2 - (b.x + b.width / 2) * scale,
      app.screen.height / 2 - (b.y + b.height / 2) * scale + 20,
    );
  };
  layout();
  app.renderer.on('resize', layout);

  // Простая «жизнь»: комнаты слегка пульсируют, чтобы видеть, что тикер работает.
  let t = 0;
  app.ticker.add((ticker) => {
    t += ticker.deltaMS / 1000;
    office.children.forEach((c, i) => {
      c.alpha = 0.85 + 0.15 * Math.sin(t * 2 + i);
    });
  });
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="position:fixed;bottom:0;left:0;right:0;color:#f88;white-space:pre-wrap;padding:16px">${String(err)}</pre>`,
  );
});
