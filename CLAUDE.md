# Overload - Lifting Tracker

## What This Is
A progressive web app (PWA) for tracking weightlifting workouts. Users create exercise templates, start workouts from templates, log sets (weight + reps), and view history/progress. The app is called **Overload**.

## Tech Stack
- **Framework**: SvelteKit (Svelte 5) with TypeScript
- **Adapter**: `@sveltejs/adapter-static` — static site, deployed to **GitHub Pages**
- **Storage**: IndexedDB via `idb` library (offline-first, local DB)
- **Cloud sync**: Supabase (optional; pull/push sync engine)
- **Charts**: Chart.js for exercise history visualization
- **PWA**: Custom service worker with offline caching, skipWaiting + clients.claim

## Project Structure
All app code lives in `overload/`:
```
overload/
├── src/
│   ├── app.css                    # Global CSS with CSS custom properties (dark theme)
│   ├── app.html                   # HTML shell
│   ├── service-worker.ts          # PWA service worker
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts           # IndexedDB setup (idb), DB_NAME='overload', version 1
│   │   │   ├── schema.ts          # TypeScript interfaces for all entities
│   │   │   ├── exercises.ts       # CRUD for exercises
│   │   │   ├── templates.ts       # CRUD for folders, templates, template items
│   │   │   └── sessions.ts        # CRUD for sessions and workout sets
│   │   ├── stores/
│   │   │   ├── auth.ts            # currentUser, authLoading stores
│   │   │   ├── data.ts            # Reactive stores for exercises, folders, templates, sessions + refresh helpers
│   │   │   ├── sync.ts            # syncStatus store
│   │   │   ├── workout.ts         # Active workout state (WorkoutState, ActiveExercise, ActiveSet)
│   │   │   └── toasts.ts          # Toast notification store
│   │   ├── sync/
│   │   │   ├── auth.ts            # Supabase auth helpers (settleCurrentUser, onAuthChange)
│   │   │   ├── engine.ts          # Sync engine: pullFromCloud, pushToCloud, syncNow
│   │   │   └── supabase.ts        # Supabase client init
│   │   ├── utils/
│   │   │   ├── format.ts          # Display formatting helpers
│   │   │   └── importExport.ts    # JSON import/export of workout data
│   │   └── components/
│   │       ├── exercises/
│   │       │   ├── ExerciseForm.svelte
│   │       │   └── ExerciseSelector.svelte
│   │       ├── programs/
│   │       │   ├── ProgramAccordion.svelte
│   │       │   └── TemplateEditor.svelte
│   │       ├── shared/
│   │       │   ├── ConfirmModal.svelte
│   │       │   ├── FinishWorkoutModal.svelte
│   │       │   ├── HistoryChart.svelte
│   │       │   └── Toast.svelte
│   │       └── workout/
│   │           ├── ExerciseBlock.svelte    # Single exercise during workout
│   │           ├── FloatingWidget.svelte   # Persistent workout timer overlay
│   │           ├── RestTimer.svelte        # Rest countdown between sets
│   │           └── SetRow.svelte           # Individual set input row
│   └── routes/
│       ├── +layout.svelte         # App shell: nav, auth init, draft workout restore
│       ├── +layout.ts             # Prerender + trailing slash config
│       ├── +page.svelte           # Home: folder/template list, start workout
│       ├── workout/+page.svelte   # Active workout page (the big one)
│       ├── library/+page.svelte   # Exercise library management
│       ├── history/+page.svelte   # Completed session history + charts
│       └── settings/+page.svelte  # Auth, import/export, sync settings
├── static/                        # Icons, manifest, 404.html
├── package.json
├── svelte.config.js               # Static adapter, BASE_PATH for GH Pages
├── vite.config.ts
└── tsconfig.json
```

## Data Model (IndexedDB)
Six object stores, all keyed by `id` (string, generated via `createId()`):
- **exercises**: name, note, defaults (reps, weight, rest, sets)
- **folders**: name, sortOrder (organizes templates)
- **templates**: name, note, folderId, sortOrder
- **templateItems**: templateId, exerciseId, sortOrder, sets, reps, restSeconds, supersetId/Order
- **sessions**: templateId, status ('draft'|'complete'|'cancelled'), startedAt, finishedAt, duration, pause tracking
- **sets** (WorkoutSet): sessionId, exerciseId, exerciseName, setNumber, weight, reps, completedAt

All entities have: `id`, `createdAt`, `updatedAt`, `synced` (boolean for cloud sync tracking).

## Key Patterns

### State Management
- Svelte writable stores in `$lib/stores/`
- `data.ts` stores hold the master lists; call `refreshExercises()`, `refreshAll()`, etc. after mutations
- `workout.ts` holds the live workout state; `resetWorkout()` clears it

### Workout Flow
1. User picks a template on the home page → creates a draft Session + populates `workout` store
2. `/workout` page renders ExerciseBlock components with SetRow inputs
3. User logs sets (weight/reps), completing them one by one
4. Supersets are supported (exercises grouped by `supersetId`)
5. On finish → session marked 'complete', sets saved, optional template update prompt (FinishWorkoutModal)
6. Draft sessions persist in IndexedDB and restore on reload (see `+layout.svelte`)

### Sync
- Offline-first: all reads/writes go to IndexedDB
- On login, `pullFromCloud` fetches Supabase data and merges into local DB
- `pushToCloud` sends unsynced records (where `synced === false`)
- `syncNow()` does pull + push + refresh

### Base Path
GitHub Pages deploys under `/lifting-tracker`. `svelte.config.js` reads `BASE_PATH` env var. All internal links use `${base}/...` from `$app/paths`.

## Commands
```bash
cd overload
npm run dev          # Local dev server (port 5173)
npm run build        # Production build
npm run check        # Svelte type checking (svelte-check)
npm run check:watch  # Type checking in watch mode
```

## Git Workflow
- Always branch from `main` for new work
- Run `npm run check` (from `overload/`) before committing to catch type errors

## CI/CD
- `.github/workflows/deploy-pages.yml` — builds & deploys to GitHub Pages
- `.github/workflows/supabase-backup.yml` — daily Supabase pg_dump backups

## Style Conventions
- Dark theme using CSS custom properties (--bg, --accent, --text-1, --border, etc.)
- Mobile-first design with bottom navigation bar
- Component `<style>` blocks are scoped; global styles in `app.css`
- No CSS framework or preprocessor — plain CSS
- Safe area insets handled via CSS env() for PWA

## Code Conventions
- IDs generated with `createId()` (timestamp + random)
- Timestamps as ISO strings via `now()`
- No test framework currently configured
- Svelte 5 with `$:` reactive declarations and `on:event` handlers
- TypeScript strict mode
- A11y warnings exist (dialog roles without tabindex) — pre-existing, not regressions
