import { Application } from 'pixi.js';
import './style.css';
import { play, setSound, unlockAudio } from './audio';
import { checkAchievements, ACHIEVEMENTS } from './game/achievements';
import { companyDef } from './game/config';
import { directorTick } from './game/director';
import { eventIdAt, eventMod } from './game/events';
import { Game } from './game/game';
import { claimableCount, ensureDaily } from './game/quests';
import { fetchResetBefore } from './game/resets';
import { better, clearCloud, clearLocal, cloudAvailable, loadCloud, loadLocal, saveCloud, saveLocal } from './game/save';
import { newState } from './game/state';
import { detectLang, setLang, t, tr, type Key } from './i18n';
import { Camera } from './scene/camera';
import { ROOM_H, ROOM_W, WALL_H, roomById, type RoomDef } from './scene/layout';
import { OfficeView } from './scene/office';
import { initTelegram, onTelegramLayout } from './telegram';
import { Fx } from './ui/fx';
import { Hud } from './ui/hud';
import { Tutorial } from './ui/tutorial';

const VERSION = '1.0.0';
const SAVE_LOCAL_MS = 5000;
const SAVE_CLOUD_MS = 45000;
const OFFLINE_MIN_SEC = 60;

async function start(): Promise<void> {
  const tg = initTelegram();
  let state = loadLocal();
  // сброс конкретного игрока по списку public/resets.json (один раз: новое сохранение моложе отметки)
  const resetAt = await fetchResetBefore(tg.user, `${import.meta.env.BASE_URL}resets.json`);
  const wasReset = resetAt > 0 && state.createdAt < resetAt;
  if (wasReset) {
    state = newState();
    clearLocal();
    saveLocal(state);
  }
  setLang(state.settings.lang ?? detectLang(tg.user?.language_code));
  setSound(state.settings.sound);

  const rng = Math.random;
  const game = new Game(state, rng);
  const applyEvent = (): string | null => {
    const id = eventIdAt(Date.now());
    game.event = eventMod(id);
    return id;
  };
  let eventId = applyEvent();
  ensureDaily(game, Date.now());

  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#262338',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  document.getElementById('game')?.appendChild(app.canvas);

  const office = new OfficeView(game, rng);
  office.setEvent(eventId);
  app.renderer.background.color = office.themeBg;
  app.stage.addChild(office.container);

  const save = (): void => saveLocal(game.state);
  const saveAll = (): void => {
    save();
    void saveCloud(game.state);
  };

  // eslint-disable-next-line prefer-const
  let tutorial: Tutorial;
  const hud = new Hud(game, {
    onAvral: () => {
      if (game.startAvral()) {
        play('avral');
        hud.toast(t('avral.active'), 'good');
      } else play('error');
    },
    onDirectorDesk: () => {
      if (game.state.directorDesk === 0) {
        game.state.directorDesk = 1;
        office.syncDirectorDesk();
        play('hire');
      }
    },
    onLang: (l) => {
      game.state.settings.lang = l;
      saveAll();
      location.reload();
    },
    onSound: (on) => {
      game.state.settings.sound = on;
      setSound(on);
      if (on) play('click');
    },
    onReset: () => {
      clearLocal();
      clearCloud();
      setTimeout(() => location.reload(), 300);
    },
    onTutorial: () => tutorial.start(),
    onReorg: () => {
      const g = game.reorg();
      if (g > 0) {
        play('reorg');
        hud.toast(t('toast.reorg', { n: g }), 'good');
        focusRoom(roomById('sysadmins'));
        saveAll();
      }
    },
    onCompany: () => {
      if (game.changeCompany()) {
        play('achieve');
        app.renderer.background.color = office.themeBg;
        hud.toast(t('toast.company', { name: t(`company.${companyDef(game.state.company).style}` as Key) }), 'good');
        hud.close();
        focusRoom(roomById('sysadmins'));
        saveAll();
      }
    },
    onClose: () => {},
    sfx: (s) => play(s),
    cloud: cloudAvailable(),
    version: VERSION,
  });

  const camera = new Camera(
    office.container,
    office.bounds(),
    app.canvas,
    () => app.screen,
    () => ({ top: hud.topInset, bottom: hud.bottomInset() }),
  );
  const roomZoom = (): number => camera.zoomToFit(ROOM_W + 40, ROOM_H + WALL_H + 150);
  const focusRoom = (def: RoomDef, instant = false): void => {
    requestAnimationFrame(() => camera.focusOn(office.roomFocus(def), roomZoom(), instant));
  };

  const fx = new Fx(
    game,
    office,
    (p) => office.container.toGlobal(p),
    () => office.container.scale.x,
  );
  fx.onTicket = (reward, d, k) => {
    office.bigPopup(d, k, reward);
    play('ticket');
  };
  office.onWalkerEdge = (id) => fx.sayNow(id, 'edge');
  fx.onPhrase = (id) => {
    if (!game.state.phrasesSeen.includes(id)) game.state.phrasesSeen.push(id);
  };

  tutorial = new Tutorial(
    (def) => focusRoom(def),
    () => {
      game.state.directorDesk = 1;
      office.syncDirectorDesk();
      play('hire');
    },
    () => game.state.directorDesk > 0,
    () => {
      game.state.tutorialDone = true;
      save();
      const first = roomById('sysadmins');
      hud.open({ kind: 'room', def: first });
      focusRoom(first);
    },
    (on) => {
      hud.setHidden(on);
      fx.enabled = !on;
    },
  );

  camera.onTap = (x, y) => {
    unlockAudio();
    if (tutorial.active) return;
    const local = office.container.toLocal({ x, y });
    const def = office.roomAt(local.x, local.y);
    if (!def) {
      if (hud.isOpen()) hud.close();
      return;
    }
    play('click');
    hud.open({ kind: 'room', def });
    focusRoom(def);
  };
  window.addEventListener('pointerdown', unlockAudio, { capture: true });
  app.renderer.on('resize', () => camera.onResize());
  // кнопки Telegram сверху появляются чуть позже запуска — подвинуть камеру под новые отступы
  onTelegramLayout(() => requestAnimationFrame(() => camera.onResize()));

  // ?debug — доступ к игре из консоли для проверки
  if (location.search.includes('debug')) Object.assign(window, { __game: game, __hud: hud, __office: office, __focus: focusRoom });

  // офлайн-доход
  const offerOffline = (sec: number): void => {
    if (sec < OFFLINE_MIN_SEC) return;
    const capped = Math.min(sec, game.offlineCapSec());
    const amount = game.incomePerSec(true) * capped;
    if (!(amount > 0)) return;
    hud.showOffline(capped, amount, game.company().offlineCapH, () => {
      game.applyOffline(capped);
      play('coin');
    });
  };

  // старт: обучение или поддержка крупным планом
  focusRoom(roomById('sysadmins'), true);
  if (!game.state.tutorialDone) tutorial.start();
  else offerOffline((Date.now() - game.state.lastSeen) / 1000);
  if (eventId) hud.setEvent(t(`event.${eventId}` as Key));

  // сохранение в Telegram: если там прогресс дальше — берём его
  void loadCloud().then((cloud) => {
    // облачное сохранение старше отметки сброса — устарело, перезаписываем его новым
    if (cloud && resetAt > 0 && cloud.createdAt < resetAt) {
      void saveCloud(game.state);
      return;
    }
    if (wasReset) void saveCloud(game.state);
    if (cloud && better(game.state, cloud) === cloud) {
      saveLocal(cloud);
      location.reload();
    }
  });

  // свёрнута игра — не тикаем, при возврате считаем офлайн
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      saveAll();
    } else if (hiddenAt) {
      const sec = (Date.now() - hiddenAt) / 1000;
      hiddenAt = 0;
      if (!tutorial.active) offerOffline(sec);
    }
  });
  window.addEventListener('pagehide', saveAll);
  window.setInterval(save, SAVE_LOCAL_MS);
  window.setInterval(() => void saveCloud(game.state), SAVE_CLOUD_MS);

  // раз в секунду: достижения, задания, события
  let lastClaimable = claimableCount(game);
  let sec = 0;
  window.setInterval(() => {
    sec++;
    for (const id of checkAchievements(game.state)) {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) {
        hud.toast(t('toast.achievement', { name: tr(a.title) }), 'good');
        play('achieve');
      }
    }
    // задания директора IT
    const dr = tutorial.active ? null : directorTick(game, Date.now());
    if (dr === 'offered') hud.toast(t('task.offered'));
    else if (dr === 'done') {
      hud.toast(t('task.done'), 'good');
      play('achieve');
    } else if (dr === 'expired') hud.toast(t('task.expired'));
    const c = claimableCount(game);
    if (c > lastClaimable && !tutorial.active) hud.toast(t('toast.quest'));
    lastClaimable = c;
    if (sec % 60 === 0) {
      if (ensureDaily(game, Date.now())) lastClaimable = claimableCount(game);
      const id = applyEvent();
      if (id !== eventId) {
        eventId = id;
        office.setEvent(id);
        hud.setEvent(id ? t(`event.${id}` as Key) : null);
      }
    }
  }, 1000);

  let frameErrors = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 1);
    // ошибка в одном кадре не должна останавливать игру целиком
    try {
      if (document.visibilityState !== 'hidden') game.tick(dt, !tutorial.active);
      office.update(dt, game.isAvral() ? 2.5 : 1);
      camera.update(dt);
      fx.update(dt);
      hud.update(performance.now());
      document.body.classList.toggle('avral', game.isAvral());
    } catch (err) {
      if (frameErrors++ < 5) console.error(err);
    }
  });
}

start().catch((err: unknown) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<pre style="position:fixed;bottom:0;left:0;right:0;color:#f88;white-space:pre-wrap;padding:16px;z-index:99">${String(err)}</pre>`,
  );
});
