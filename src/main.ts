import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import './style.css';
import { play, setSound, unlockAudio } from './audio';
import { checkAchievements, ACHIEVEMENTS } from './game/achievements';
import { companyDef } from './game/config';
import { directorTick } from './game/director';
import { eventIdAt, eventMod, type EventId } from './game/events';
import { Game } from './game/game';
import { claimableCount, ensureDaily } from './game/quests';
import { fetchResetBefore } from './game/resets';
import { loadRemote, saveRemote, setRemoteAuth } from './game/remote';
import { better, clearCloud, clearLocal, cloudAvailable, loadCloud, loadLocal, saveCloud, saveLocal } from './game/save';
import { newState, type GameState } from './game/state';
import { detectLang, setLang, t, tr, type Key } from './i18n';
import { Camera } from './scene/camera';
import * as charactersM from './scene/characters';
import * as drawM from './scene/draw';
import * as furnitureM from './scene/furniture';
import { ROOM_H, ROOM_W, WALL_H, roomById, type RoomDef } from './scene/layout';
import { OfficeView } from './scene/office';
import { FACE_IMG_REF, FACE_TEXTURE, setTesterFace, TESTER_LOOK } from './scene/characters';
import { initTelegram, onTelegramLayout, waitForUser } from './telegram';
import { Fx } from './ui/fx';
import { Hud } from './ui/hud';
import { DebugNotes } from './ui/debugNotes';
import { Tutorial } from './ui/tutorial';

const VERSION = '1.0.0';
const SAVE_LOCAL_MS = 5000;
const SAVE_CLOUD_MS = 45000;
const OFFLINE_MIN_SEC = 60;

/**
 * Результат предзагрузки.
 */
interface PreloadResult {
  state: GameState;
  /** Оригинальный lastSeen из локального сохранения ДО синхронизации. */
  originalLastSeen: number;
}

/**
 * Предзагрузка: ждать tg.user, синхронизировать cloud/Supabase,
 * вернуть готовый GameState. Всё — ДО рендеринга игры.
 */
async function preloadState(tg: ReturnType<typeof initTelegram>): Promise<PreloadResult> {
  // 1. Ждём tg.user (до 3 секунд)
  const user = await waitForUser(tg);

  // 2. Обновляем авторизацию
  const telegram_id = user?.id || 0;
  setRemoteAuth({ init_data: tg.initData, telegram_id });

  // 3. Локальное сохранение
  let state = loadLocal();

  // Сохраняем оригинальный lastSeen ДО синхронизации — нужен для расчёта офлайн-дохода.
  // Без этого синхронизированный state может содержать свежий lastSeen (например,
  // если пользователь закрыл игру на другом устройстве и lastSeen обновился),
  // и offerOffline посчитает офлайн как "0 секунд".
  const originalLastSeen = state.lastSeen;

  // 4. Проверяем сброс
  const resetsUrl = `${import.meta.env.BASE_URL}resets.json`;
  const resetAt = await fetchResetBefore(user, resetsUrl);
  const wasReset = resetAt > 0 && state.createdAt < resetAt;
  if (wasReset) {
    state = newState();
    clearLocal();
    saveLocal(state);
  }

  // 5. СИНХРОНИЗАЦИЯ — до рендеринга
  const [cloud, remote] = await Promise.allSettled([loadCloud(), loadRemote()]);
  const cloudResult = cloud.status === 'fulfilled' ? cloud.value : null;
  const remoteResult = remote.status === 'fulfilled'
    ? remote.value
    : { state: null, saveCreatedAt: 0, failed: true };

  const fresh = (c: GameState | null): GameState | null =>
    (c && resetAt > 0 && c.createdAt < resetAt ? null : c);

  const best = better(better(state, fresh(cloudResult)), fresh(remoteResult.state));

  if (best !== state) {
    saveLocal(best);
    const remoteOk = fresh(remoteResult.state);
    const remoteStale = !!remoteResult.state && !remoteOk;
    await Promise.all([saveCloud(best), saveRemote(best, remoteStale)]);
  } else {
    // данные совпали — отправляем локальный прогресс в Supabase
    if (telegram_id > 0 && !remoteResult.failed) {
      void saveRemote(best, wasReset);
    }
  }

  // 6. Язык и звук
  setLang(state.settings.lang ?? detectLang(user?.language_code));
  setSound(state.settings.sound);

  return { state: best, originalLastSeen };
}

async function start(): Promise<void> {
  const tg = initTelegram();

  // Предзагрузка: ждём tg.user, синхронизируем cloud/Supabase
  const result = await preloadState(tg);
  const { state, originalLastSeen } = result;

  const rng = Math.random;
  const game = new Game(state, rng);
  const applyEvent = (): string | null => {
    const id = eventIdAt(Date.now());
    game.event = eventMod(id);
    return id;
  };
  let eventId = applyEvent();
  ensureDaily(game, Date.now());

  const gameEl = document.getElementById('game') ?? document.body;
  const app = new Application();
  await app.init({
    resizeTo: gameEl,
    background: '#262338',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  });
  gameEl.appendChild(app.canvas);

  // Скрыть лоадер
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden');
  
  // предзагрузка фото-лица для тестировщика (ждём onload и texture creation)
  console.log('=== FACE PRELOAD START ===');
  const faceImg = new Image();
  faceImg.crossOrigin = 'anonymous';
  faceImg.src = FACE_TEXTURE;
  await new Promise<void>(async (resolve) => {
    if (faceImg.complete && faceImg.naturalWidth > 0) {
      FACE_IMG_REF.value = faceImg;
      await setTesterFace(faceImg);
      resolve();
    } else {
      faceImg.onload = async () => {
        FACE_IMG_REF.value = faceImg;
        await setTesterFace(faceImg);
        resolve();
      };
      faceImg.onerror = (e) => {
        console.error('Face image ERROR loading:', e);
        FACE_IMG_REF.value = null;
        resolve();
      };
    }
  });
  console.log('=== FACE PRELOAD DONE ===');

  // экспорт для отладки
  (window as any).__faceImgRef = FACE_IMG_REF;
  (window as any).__characters = { TESTER_LOOK, setTesterFace };
  const office = new OfficeView(game, rng);
  office.setEvent(eventId);
  app.renderer.background.color = office.themeBg;
  app.stage.addChild(office.container);

  const save = (): void => saveLocal(game.state);
  const saveAll = (): void => {
    save();
    void saveCloud(game.state);
    void saveRemote(game.state, false);
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
      // на сервере тоже начинаем заново, иначе при входе вернулось бы старое сохранение
      void saveRemote(newState(), true).finally(() => setTimeout(() => location.reload(), 300));
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

  // ?debug: заметки с булавками и паузой — чтобы показать Claude место прямо в игре
  const notes = location.search.includes('debug')
    ? new DebugNotes(
        (x, y) => office.container.toLocal({ x, y }),
        (p) => office.container.toGlobal(p),
        (p) => office.roomAt(p.x, p.y)?.id ?? 'коридор',
      )
    : null;

  camera.onTap = (x, y) => {
    unlockAudio();
    if (notes?.handleTap(x, y)) return;
    if (tutorial.active) return;
    if (hud.isOpen()) return;
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
  onTelegramLayout(() => requestAnimationFrame(() => syncSize()));

  // Холст всегда по размеру экрана. В Telegram (сворачивание Mini App, долгое время в фоне, смена полного экрана)
  // событие resize у window иногда приходит в середине анимации или не приходит вовсе — тогда холст оставался
  // на полэкрана с чёрной полосой снизу. Сверяем размер сами: ResizeObserver, возврат в игру и раз в полсекунды.
  function syncSize(): void {
    const w = gameEl.clientWidth || window.innerWidth;
    const h = gameEl.clientHeight || window.innerHeight;
    if (w > 0 && h > 0 && (Math.abs(app.screen.width - w) > 0.5 || Math.abs(app.screen.height - h) > 0.5)) {
      app.renderer.resize(w, h);
      camera.onResize();
    }
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => syncSize()).observe(gameEl);
  window.setInterval(syncSize, 500);
  for (const ev of ['pageshow', 'focus', 'orientationchange']) window.addEventListener(ev, () => requestAnimationFrame(syncSize));

  // Видеокарта может отобрать контекст WebGL, пока игра долго в фоне: экран становится чёрным.
  // Сохраняемся и перезапускаемся, когда контекст можно вернуть.
  // Debounce: не перезагружаться чаще раза в 30 секунд (защита от циклической потери контекста на десктопе).
  let contextRestoreTimer = 0;
  app.canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    saveAll();
  });
  app.canvas.addEventListener('webglcontextrestored', () => {
    const now = Date.now();
    if (now - contextRestoreTimer < 30000) return; // debounce: не чаще раза в 30с
    contextRestoreTimer = now;
    location.reload();
  });

  // ?debug — доступ к игре из консоли для проверки
  if (location.search.includes('debug'))
    Object.assign(window, {
      __game: game,
      __hud: hud,
      __office: office,
      __focus: focusRoom,
      // для отладки рисовки прямо в браузере: классы Pixi и модули рисования сцены
      __lab: { PIXI, app, draw: drawM, furniture: furnitureM, characters: charactersM, camera },
    });

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
  // Используем originalLastSeen из локального сохранения, а не синхронизированный —
  // иначе offerOffline считает "0 секунд" когда Supabase хранит свежий lastSeen
  else offerOffline((Date.now() - originalLastSeen) / 1000);
  if (eventId) hud.setEvent(t(`event.${eventId}` as Key), eventMod(eventId as EventId | null));

  // свёрнута игра — не тикаем, при возврате считаем офлайн
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') requestAnimationFrame(syncSize);
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
  window.setInterval(() => {
    void saveCloud(game.state);
    void saveRemote(game.state);
  }, SAVE_CLOUD_MS);

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
        hud.setEvent(id ? t(`event.${id}` as Key) : null, id ? eventMod(id as EventId | null) : undefined);
      }
    }
  }, 1000);

  let frameErrors = 0;
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 1);
    // ошибка в одном кадре не должна останавливать игру целиком
    try {
      const paused = notes?.paused ?? false;
      if (document.visibilityState !== 'hidden' && !paused) game.tick(dt, !tutorial.active);
      if (!paused) office.update(dt, game.isAvral() ? 2.5 : 1);
      camera.update(dt);
      if (!paused) fx.update(dt);
      notes?.update();
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
