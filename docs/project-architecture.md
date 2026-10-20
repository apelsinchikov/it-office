# Project Architecture Summary

## Project: IT-Office

**Type:** Idle-tycoon game as a Telegram Mini App  
**Tech Stack:** TypeScript, Vite, PixiJS 8, Supabase, GitHub Pages  
**Repo:** /Users/evgeniy/it-office

---

## Tech Stack

- **Frontend Framework:** Vanilla TS with PixiJS 8 (canvas-based rendering)
- **Build Tool:** Vite (vite.config.ts)
- **Deployment:** GitHub Pages (via .github/ and dist/)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Telegram WebApp initData verification via Supabase Edge Function
- **State Storage:** Three-way sync (localStorage + CloudStorage + Supabase)

---

## Directory Structure

```
it-office/
├── src/
│   ├── main.ts              # Entry point, startup orchestration, sync logic
│   ├── telegram.ts          # Telegram WebApp initialization, initData handling
│   ├── game/
│   │   ├── game.ts          # Core game loop (ticks every frame)
│   │   ├── state.ts         # GameState interface, normalize()
│   │   ├── save.ts          # localStorage + CloudStorage persistence
│   │   ├── remote.ts        # Supabase Edge Function sync
│   │   └── economy.ts       # Economic formulas, game balance
│   └── scene/
│       └── office.ts        # PixiJS scene rendering
├── supabase/
│   └── (Edge Function, DB schema)
├── sim/
│   └── (simulation/testing)
├── public/
│   └── (static assets)
├── docs/
│   ├── GDD.md               # Game Design Document
│   └── bug-analysis-desktop-flicker.md
├── openspec/
│   └── (open specifications)
├── scripts/
│   └── (build/deploy scripts)
├── .github/
│   └── workflows/           # CI/CD for GitHub Pages
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

---

## State Management Flow

### No Redux/Zustand
Uses a single GameState object passed directly to the Game constructor.

### Storage Backends

1. **localStorage** (src/game/save.ts - loadLocal/saveLocal)
   - Read: synchronous, immediate
   - Write: every 5 seconds via setInterval

2. **Telegram CloudStorage** (src/game/save.ts - loadCloud/saveCloud)
   - API: @telegram-apps/cloud-storage
   - Read: async, at startup
   - Write: every 45 seconds via setInterval
   - Chunks data into 3800-char segments for storage limits

3. **Supabase** (src/game/remote.ts - loadRemote/saveRemote)
   - API: HTTP POST to Supabase Edge Function
   - Auth: uses tg.initData for verification
   - Read: async, at startup
   - Write: every 45 seconds via setInterval

### Startup Sequence (src/main.ts)

```
1. state = loadLocal()                    // sync, from localStorage
2. new Game(state, rng)                   // renders immediately
3. UI initializes (PixiJS app setup)
4. Promise.all([loadCloud(), loadRemote()]) // async background sync
5. best = better(better(local, cloud), remote) // compare timestamps
6. If best != game.state:
     saveLocal(best)
     saveCloud(best)
     saveRemote(best)
     location.reload()                    // restart with correct state
7. setInterval: saveLocal every 5s
8. setInterval: saveCloud every 45s
9. setInterval: saveRemote every 45s
```

---

## Key Components

### Game Loop (src/game/game.ts)
- Runs every frame using PixiJS ticker
- Calculates earnings based on office economy
- Mutates GameState in real-time

### Economy System (src/game/economy.ts)
- Defines office upgrades, salaries, revenue
- Formulas for calculating income per tick
- Upgrade costs and progression

### Scene Rendering (src/scene/office.ts)
- PixiJS container with office visuals
- Renders upgrades, employees, money counter
- Updates based on GameState changes

### Telegram Integration (src/telegram.ts)
- Initializes Telegram WebApp SDK
- Calls tg.requestFullscreen() on mobile
- Provides tg.initData for auth
- Sets up CloudStorage client

### Supabase Integration (src/game/remote.ts)
- HTTP POST to Edge Function with GameState JSON
- Uses tg.initData for authentication
- Returns GameState from Supabase DB
- Uses save_created_at for conflict resolution

---

## Data Flow Diagram

```
[User plays game]
        |
        v
   [GameState] ---> [Mutate on every tick]
        |
   +----+----+----+
   |    |    |    |
   v    v    v    v
 render  local  cloud  supabase
 (PixiJS) (5s)  (45s)  (45s)
                |
                v
         [Telegram CloudStorage]
         
                |
                v
         [Supabase DB] <--- Edge Function
```

---

## Known Issues

See: docs/bug-analysis-desktop-flicker.md

Summary: Desktop shows stale state + flicker due to render-before-sync,
tg.initData availability on desktop, and location.reload() cycles.
