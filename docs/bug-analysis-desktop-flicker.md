# Desktop Flicker & State Mismatch Bug - Root Cause Analysis

## Problem Description

**Symptom:** When running the Telegram Mini App on desktop, the displayed game progress
does not match the Supabase database state, and the UI "flashes/flickers" multiple times
during load. On iOS mobile, the state displays correctly immediately.

---

## Architecture Overview

### Three-Way State Synchronization

The game uses **three storage backends** with periodic sync:

| Source | API | Sync Frequency | Purpose |
|--------|-----|----------------|---------|
| localStorage | Browser API | Every 5s | Fast local persistence |
| Telegram CloudStorage | @telegram-apps/cloud-storage | Every 45s | Cross-device sync |
| Supabase | Edge Function HTTP | Every 45s | Persistent cloud storage |

### Startup Sync Flow (src/main.ts)

    Step 1: state = loadLocal()                           // synchronous
    Step 2: new Game(state, rng)                          // renders immediately
    Step 3: Promise.all([loadCloud(), loadRemote()])      // async, happens after render
    Step 4: best = better(better(local, cloud), remote)   // pick newest by save_created_at
    Step 5: If best differs from game.state:
               saveLocal(best)
               saveCloud(best)
               saveRemote(best)
               location.reload()                           // RESTART with correct state

---

## Root Cause #1 - Render Before Sync (PRIMARY CAUSE OF FLICKER)

**File:** src/main.ts

The game **renders the localStorage state immediately** (Step 2) while the async
cloud/Supabase sync (Step 3) happens in the background. This creates a visible flash:

    T=0ms:   Load localStorage -> state "A" (possibly stale)
    T=1ms:   Render game with state "A"   <-- user sees this
    T=500ms: loadCloud() returns -> state "A" or null
    T=800ms: loadRemote() returns -> state "B" (current from Supabase)
    T=801ms: better() picks "B" (newer)
    T=810ms: location.reload()           <-- page restarts with state "B"

User experience: **sees state "A" -> page reloads -> sees state "B"** - that's the flicker.

### Why Mobile Doesn't Show This

On mobile (iOS), initTelegram() calls tg.requestFullscreen(). This triggers a
webview lifecycle that may cause a brief reload/reinit internally, which can mask or
accelerate the sync window. Additionally, mobile networks may have different latency
profiles that happen to fall in the app's favor.

### Why Desktop Shows This Prominently

On desktop Telegram:
- tg.initData may be initially empty or delayed
- loadRemote() relies on tg.initData for authentication with the Supabase Edge Function
- If initData is empty at the moment of the call, loadRemote() **fails** (failed: true)
- Later, when initData becomes available and loadRemote() retries or is retried, it
  returns different data -> triggers another reload
- Multiple cycles of "fail -> succeed -> reload -> repeat" cause **multiple flashes**

Relevant code path in src/telegram.ts:
    let initData = tg.initData;
    if (!initData && tg.initDataUnsafe?.user) {
        // Build initData from initDataUnsafe manually
    }

If tg.initData is falsy and tg.initDataUnsafe?.user is also not available at the
time of the check, the build fallback may produce an invalid or empty initData, causing
loadRemote() to fail.

---

## Root Cause #2 - loadCloud() Has No Concurrency Guard

**File:** src/game/save.ts

The saveCloud() function has a saving flag to prevent concurrent writes:
    export async function saveCloud(s: GameState): Promise<boolean> {
        if (!cs || saving) return false;
        saving = true;
        // ...
    }

But loadCloud() has **no such coordination**. A 45-second interval save can occur
between a load and the comparison, causing the loaded "old" cloud data to compete against
a "new" local state.

---

## Root Cause #3 - normalize() Mutates In-Place

**File:** src/game/state.ts

    export function normalize(state: GameState): GameState {
        // ... mutates and returns the same object reference
        return state;
    }

When loadRemote() normalizes Supabase data and loadCloud() normalizes CloudStorage
data, they return new GameState objects. The better() function picks the best one and
calls saveLocal(best), but game.state **still points to the OLD object**. During the
brief window before location.reload(), the UI renders inconsistent data.

---

## Root Cause #4 - No Guard Against Multiple Reloads

**File:** src/main.ts

The startup sync block calls location.reload() if state differs. But the 45-second
setInterval that saves to cloud/Supabase can create a race:

1. First reload with state "B"
2. Game runs, local state becomes "B + ticks" after 5s (localStorage save)
3. After 45s, the interval saves "B + more ticks" to Supabase
4. On next page load, cloud has "B + more ticks", local might have "B + fewer ticks"
5. Another location.reload() happens - **second flicker**

There is no flag to prevent a second sync/reload cycle after the initial one completes.

---

## Root Cause #5 - Desktop CloudStorage May Be Unavailable

Telegram CloudStorage is **not available in all desktop Telegram clients**. When
loadCloud() runs on desktop:
- It may return null or empty data
- Or it may return stale data from a previous session
- The better() comparison then picks Supabase data as "newer"
- This triggers a reload that would not happen on mobile (where CloudStorage works)

---

## Diagnosis Checklist

To confirm this analysis during debugging:

1. Open desktop Telegram Mini App
2. Add temporary console.log in main.ts around the sync block:
    console.log('[SYNC] local before:', JSON.stringify(game.state));
    console.log('[SYNC] cloud:', JSON.stringify(cloud));
    console.log('[SYNC] remote:', JSON.stringify(remote));
    console.log('[SYNC] best:', JSON.stringify(best));
    console.log('[SYNC] changed:', JSON.stringify(best) !== JSON.stringify(game.state));
3. Watch for multiple reloads in the Network tab (every reload = new request)
4. Check tg.initData value at startup - if empty, loadRemote() will fail

---

## Recommended Fixes (Priority Order)

### Fix #1: Pre-load Before Rendering (ELIMINATES FLICKER)

**File:** src/main.ts

Load from cloud/Supabase **BEFORE** creating the Game instance:

    // After: Load everything first, THEN render
    let [cloudResult, remoteResult] = await Promise.allSettled([
        loadCloud(),
        loadRemote()
    ]);

    let state = loadLocal();
    const cloud = cloudResult.status === 'fulfilled' ? cloudResult.value : null;
    const remote = remoteResult.status === 'fulfilled' ? remoteResult.value : null;
    state = better(better(state, cloud), remote);
    state = normalize(state);

    // Now render with the correct state - no flash
    const game = new Game(state, rng);

### Fix #2: Remove location.reload() - Use In-Place Merge

Instead of full page reload, merge state directly:

    if (best && JSON.stringify(best) !== JSON.stringify(game.state)) {
        Object.assign(game.state, best);  // merge in-place
        // Trigger UI update if needed
    }

### Fix #3: Add Sync Guard

Prevent multiple reload cycles:

    let hasSynced = false;

    // In the sync block:
    if (best && JSON.stringify(best) !== JSON.stringify(game.state) && !hasSynced) {
        saveLocal(best);
        saveCloud(best);
        saveRemote(best);
        hasSynced = true;
        location.reload();
    }

### Fix #4: Fix tg.initData Availability on Desktop

Ensure tg.initData is populated before calling loadRemote():

    function waitForInitData(tg: any, timeout = 3000): Promise<string> {
        return new Promise((resolve) => {
            if (tg.initData) return resolve(tg.initData);
            const start = Date.now();
            const check = () => {
                if (tg.initData) {
                    resolve(tg.initData);
                } else if (Date.now() - start > timeout) {
                    resolve('');  // fallback
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

### Fix #5: Add save_created_at to CloudStorage

Make CloudStorage use the same timestamp-based comparison as Supabase, so all three
sources compete on equal footing.

---

## Files Involved

| File | Role |
|------|------|
| src/main.ts | Startup orchestrator, sync logic |
| src/telegram.ts | Telegram WebApp init, tg.initData handling |
| src/game/save.ts | localStorage + CloudStorage read/write |
| src/game/remote.ts | Supabase Edge Function read/write |
| src/game/state.ts | GameState interface, normalize() |
| src/game/game.ts | Core game loop |
| src/scene/office.ts | PixiJS scene rendering |

---

## Why There's No Console on Desktop/Mobile Telegram

Telegram Mini Apps run inside an in-app WebView that does **not expose DevTools**:
- **Mobile:** No developer tools available in the Telegram app
- **Desktop:** The Mini App window is a separate process without debug access

**Workarounds for debugging:**
1. Open the Mini App URL directly in a regular browser (Chrome/Firefox) - gives
   full DevTools access
2. Use console.log - the logs go to Telegram server-side logs (if you have Edge
   Function logging)
3. Use alert() for critical values (though it blocks execution)
4. Implement a debug endpoint in the app itself that displays state in the UI
5. Test locally with ngrok or similar to expose localhost, then open via Telegram
   bot on mobile

---

## Fix Applied (2026-10-20)

### Root Cause
`setRemoteAuth()` вызывается ОДИН РАЗ при старте с `tg.user?.id || 0`.
Если `tg.initDataUnsafe.user` ещё не доступен (чаще на десктопе), `telegram_id = 0`,
`remoteAvailable() = false`, и **данные НИКОГДА не уходят в Supabase**.

### Changes

#### `src/telegram.ts`
- Добавлено `initDataUnsafe` в возвращаемый `TelegramInfo` — позволяет читать его
  значения после инициализации (Telegram может подгрузить user позже)

#### `src/main.ts`
- Вынесена синхронизация в функцию `syncRemote()` — вызывает `loadCloud() + loadRemote()`,
  сравнивает лучший стейт и перезагружается
- Добавлен `syncPoll` — проверяет каждые 200мс, появился ли `tg.initDataUnsafe.user`:
  - Если `tg.initDataUnsafe?.user?.id` появился → обновляет `setRemoteAuth()` и
    **перезапускает синхронизацию** с корректным `telegram_id`
  - Если не появился за 3 секунды — останавливает polling
- Это обеспечивает синхронизацию с Supabase даже если `tg.user` появился с задержкой

### Timeline после фикса

**Сценарий: десктоп, первый запуск**
```
T=0:    initTelegram() → tg.user = undefined → telegram_id = 0
T=0:    syncRemote() → remote failed (telegram_id=0)
T=300:  syncPoll → tg.user.id = 291392214 → setRemoteAuth(291392214)
T=300:  syncRemote() → loadRemote() → данные из Supabase → best = remote → reload
T=305:  Игра загружается с правильным стейтом ✅
```

**Сценарий: десктоп, второй запуск (tg.user кэширован)**
```
T=0:    tg.user.id = 291392214 → telegram_id > 0
T=0:    syncRemote() → loadRemote() → данные из Supabase → best = remote → reload
T=5:    Игра с правильным стейтом ✅
```

**Сценарий: мобильный, первый запуск**
```
T=0:    tg.user.id = ... (обычно сразу) → telegram_id > 0
T=0:    syncRemote() → remote failed (нет записей в БД) → no reload
T=0:    saveRemote() → создаёт запись в БД ✅
T=45s:  saveRemote() → обновляет запись в БД ✅
```

### Files changed
- `src/telegram.ts` — added `initDataUnsafe` to return type
- `src/main.ts` — added `syncRemote()` function + `syncPoll` for delayed auth
